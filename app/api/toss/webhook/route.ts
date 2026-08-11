import { NextRequest, NextResponse } from "next/server";
import { findCardOrderByTossOrderId } from "@/app/actions/notion";
import {
  finalizeCardEnrollmentCore,
  isSwimmitClassCardOrderId,
} from "@/lib/finalize-card-enrollment";
import { notifyAdminPayment } from "@/lib/notify-admin-payment";
import { parseCardPendingStatus } from "@/lib/toss-card-order-meta";
import { fetchTossPaymentByKey } from "@/lib/toss-payment-query";

/**
 * Toss Payments 웹훅
 * - PAYMENT_STATUS_CHANGED
 * - 본문 미신뢰 → paymentKey로 GET /v1/payments/{paymentKey} 재조회
 * - 서명 헤더 검증 없음 (일반 결제 웹훅에는 해당 서명 방식 없음)
 */
export async function POST(req: NextRequest) {
  const started = Date.now();

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      console.warn("[웹훅] 잘못된 JSON body");
      // 재전송 의미 없음
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const eventType = String((body as { eventType?: string }).eventType || "");
    const createdAt = String((body as { createdAt?: string }).createdAt || "");
    const data = (body as { data?: Record<string, unknown> }).data;

    console.log("[웹훅] 수신:", {
      eventType,
      createdAt,
      elapsedMsHint: "processing",
    });

    if (eventType !== "PAYMENT_STATUS_CHANGED") {
      console.log("[웹훅] 미처리 이벤트 — 200 반환:", eventType);
      return NextResponse.json({ received: true, ignored: true, eventType });
    }

    if (!data || typeof data !== "object") {
      console.warn("[웹훅] data 없음");
      return NextResponse.json({ received: true, ignored: true });
    }

    const webhookPaymentKey = String(data.paymentKey || "").trim();
    const webhookOrderId = String(data.orderId || "").trim();
    const webhookStatus = String(data.status || "").trim();

    console.log("[웹훅] PAYMENT_STATUS_CHANGED 요약(미검증):", {
      webhookOrderId,
      webhookStatus,
      paymentKeyPrefix: webhookPaymentKey
        ? `${webhookPaymentKey.slice(0, 10)}…`
        : "",
    });

    if (!webhookPaymentKey) {
      console.warn("[웹훅] paymentKey 없음 — 무시");
      return NextResponse.json({ received: true, ignored: true });
    }

    // 1) Toss 재조회 (본문 미신뢰)
    const queried = await fetchTossPaymentByKey(webhookPaymentKey);
    if (!queried.success) {
      console.error("[웹훅] Toss 재조회 실패 — 재시도 유도:", queried.error);
      return NextResponse.json(
        { received: false, error: queried.error },
        { status: 500 },
      );
    }

    const payment = queried.payment;
    const orderId = payment.orderId;
    const status = payment.status;
    const totalAmount = payment.totalAmount;
    const paymentKey = payment.paymentKey;

    console.log("[웹훅] Toss 재조회 결과:", {
      orderId,
      status,
      totalAmount,
      paymentKeyPrefix: `${paymentKey.slice(0, 10)}…`,
    });

    // 2) 특강 카드 주문만
    if (!isSwimmitClassCardOrderId(orderId)) {
      console.log("[웹훅] 특강 카드 주문 아님 — 무시:", orderId);
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "not_class_card_order",
      });
    }

    // 3) DONE만 후처리
    if (status !== "DONE") {
      console.log("[웹훅] DONE 아님 — 후처리/알림 스킵:", status);
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "status_not_done",
        status,
      });
    }

    // 4) Notion 주문·금액 검증
    const found = await findCardOrderByTossOrderId(orderId);
    if (!found.success || !found.virtualAccountInfo) {
      console.error("[웹훅] Notion 주문 없음 — 재시도:", orderId);
      return NextResponse.json(
        { received: false, error: "notion_order_not_found" },
        { status: 500 },
      );
    }

    const meta = parseCardPendingStatus(found.virtualAccountInfo);
    if (!meta || meta.tossOrderId !== orderId) {
      console.error("[웹훅] 주문 메타 불일치 — 후처리 중단");
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "meta_mismatch",
      });
    }

    if (Number(meta.amount) !== Number(totalAmount)) {
      console.error("[웹훅] 금액 불일치 — 후처리/알림 중단:", {
        notionAmount: meta.amount,
        tossAmount: totalAmount,
        orderId,
      });
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "amount_mismatch",
      });
    }

    // 5) 멱등 후처리 (sessionStorage 없이 Notion 복구)
    const finalize = await finalizeCardEnrollmentCore({
      orderId,
      paymentKey,
      enrollment: null,
      allowMarkDoneFromWebhook: true,
      approvedAt: payment.approvedAt || createdAt || new Date().toISOString(),
    });

    console.log("[웹훅] 후처리 결과:", {
      success: finalize.success,
      enrollSaved: finalize.enrollSaved,
      sheetSkippedDuplicate: finalize.sheetSkippedDuplicate,
      markedDoneFromPending: finalize.markedDoneFromPending,
      code: finalize.code,
      elapsedMs: Date.now() - started,
    });

    // 6) 관리자 알림 준비 (실제 발송 없음, NOTIFIED 상태 저장 안 함)
    //    success 페이지에서는 호출하지 않음 — 웹훅만
    if (finalize.success && status === "DONE") {
      await notifyAdminPayment({
        customerName: finalize.customerName || found.applicant?.name || "",
        phone: finalize.phone || found.applicant?.phone || "",
        location: finalize.location || found.region || "",
        classDate: finalize.classDate || "",
        className: finalize.className || found.selectedClass || "",
        amount: totalAmount,
        approvedAt: payment.approvedAt || createdAt || new Date().toISOString(),
        orderId,
        paymentKey,
      });
    }

    return NextResponse.json({
      received: true,
      processed: Boolean(finalize.success),
      orderId,
      status,
      enrollSaved: finalize.enrollSaved,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error("[웹훅] 예외 — 재시도 유도:", error);
    return NextResponse.json(
      { received: false, error: "webhook_handler_error" },
      { status: 500 },
    );
  }
}
