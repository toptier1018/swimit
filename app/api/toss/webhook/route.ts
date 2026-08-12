import { NextRequest, NextResponse } from "next/server";
import {
  findCardOrderByTossOrderId,
  updatePaymentInNotion,
} from "@/app/actions/notion";
import {
  finalizeCardEnrollmentCore,
  isSwimmitClassCardOrderId,
} from "@/lib/finalize-card-enrollment";
import { notifyAdminPayment } from "@/lib/notify-admin-payment";
import {
  parseCardPendingStatus,
  shouldSkipAdminNotify,
  toNotionCardStatusFields,
  type CardPendingMeta,
} from "@/lib/toss-card-order-meta";
import { fetchTossPaymentByKey } from "@/lib/toss-payment-query";

/**
 * Notion 카드 메타의 관리자 알림 상태만 갱신 (결제/시트와 분리)
 */
async function patchAdminNotifyMeta(params: {
  pageId: string;
  meta: CardPendingMeta;
  selectedClass: string;
  timeSlot: string;
  region: string;
  adminNotify?: CardPendingMeta["adminNotify"];
  adminNotifyAt?: string;
}): Promise<boolean> {
  const next: CardPendingMeta = {
    ...params.meta,
    adminNotify: params.adminNotify,
    adminNotifyAt: params.adminNotifyAt,
  };
  // 실패 시 ADMIN_NOTIFYING 제거용 — adminNotify undefined면 토큰 생략
  if (!params.adminNotify) {
    delete next.adminNotify;
    delete next.adminNotifyAt;
  }

  const mark = await updatePaymentInNotion({
    pageId: params.pageId,
    ...toNotionCardStatusFields(next),
    orderNumber: next.orderNumber,
    selectedClass: params.selectedClass || next.tossOrderId,
    timeSlot: params.timeSlot || "",
    region: params.region || "",
  });

  if (!mark.success) {
    console.error("[웹훅] 관리자알림 메타 저장 실패:", mark.error);
    return false;
  }
  return true;
}

/**
 * Toss Payments 웹훅
 * - PAYMENT_STATUS_CHANGED
 * - 본문 미신뢰 → paymentKey로 GET /v1/payments/{paymentKey} 재조회
 * - 서명 헤더 검증 없음 (일반 결제 웹훅에는 해당 서명 방식 없음)
 * - 관리자 카카오 알림은 이 라우트에서만 (success 페이지 미호출)
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
      hasApprovedAt: Boolean(payment.approvedAt),
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
    if (!found.success || !found.cardMetaRaw || !found.pageId) {
      console.error("[웹훅] Notion 주문 없음 — 재시도:", orderId);
      return NextResponse.json(
        { received: false, error: "notion_order_not_found" },
        { status: 500 },
      );
    }

    const meta = parseCardPendingStatus(found.cardMetaRaw);
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
    //    approvedAt: 후처리 보조용 — 알림 표시는 payment.approvedAt만 사용
    const finalize = await finalizeCardEnrollmentCore({
      orderId,
      paymentKey,
      enrollment: null,
      allowMarkDoneFromWebhook: true,
      approvedAt: payment.approvedAt || createdAt || undefined,
    });

    console.log("[웹훅] 후처리 결과:", {
      success: finalize.success,
      enrollSaved: finalize.enrollSaved,
      sheetSkippedDuplicate: finalize.sheetSkippedDuplicate,
      markedDoneFromPending: finalize.markedDoneFromPending,
      code: finalize.code,
      elapsedMs: Date.now() - started,
    });

    // 6) 관리자 카카오 알림 (부가 기능 — 실패해도 웹훅 200, 결제 성공 유지)
    let adminNotify: "sent" | "skipped" | "failed" | "not_attempted" =
      "not_attempted";

    if (finalize.success && status === "DONE") {
      try {
        // finalize가 메타를 다시 쓸 수 있으므로 최신 Notion 재조회
        const latest = await findCardOrderByTossOrderId(orderId);
        if (
          !latest.success ||
          !latest.pageId ||
          !latest.cardMetaRaw
        ) {
          console.error("[웹훅] 알림 전 Notion 재조회 실패 — 알림만 스킵");
          adminNotify = "failed";
        } else {
          const latestMeta = parseCardPendingStatus(
            latest.cardMetaRaw,
          );
          if (!latestMeta || latestMeta.tossOrderId !== orderId) {
            console.error("[웹훅] 알림 전 메타 파싱 실패 — 알림만 스킵");
            adminNotify = "failed";
          } else {
            const skipCheck = shouldSkipAdminNotify(latestMeta);
            if (skipCheck.skip) {
              console.log("[웹훅] 관리자 알림 스킵:", {
                reason: skipCheck.reason,
                orderId,
                orderNumber: latestMeta.orderNumber,
              });
              adminNotify = "skipped";
            } else {
              const notifyingAt = new Date().toISOString();
              const locked = await patchAdminNotifyMeta({
                pageId: latest.pageId,
                meta: latestMeta,
                selectedClass:
                  latest.selectedClass ||
                  finalize.className ||
                  latestMeta.tossOrderId,
                timeSlot: latest.timeSlot || "",
                region:
                  latest.region ||
                  finalize.location ||
                  "",
                adminNotify: "ADMIN_NOTIFYING",
                adminNotifyAt: notifyingAt,
              });

              if (!locked) {
                console.error(
                  "[웹훅] ADMIN_NOTIFYING 기록 실패 — 발송은 시도하지 않음(중복 위험 완화)",
                );
                adminNotify = "failed";
              } else {
                // 알 수 없는 특강 날짜는 추측하지 않고 생략
                const classDate = (finalize.classDate || "").trim();

                const notifyResult = await notifyAdminPayment({
                  customerName:
                    finalize.customerName ||
                    latest.applicant?.name ||
                    "",
                  phone:
                    finalize.phone || latest.applicant?.phone || "",
                  location:
                    finalize.location ||
                    latest.region ||
                    latest.applicant?.location ||
                    "",
                  classDate,
                  className:
                    finalize.className || latest.selectedClass || "",
                  amount: totalAmount,
                  // 승인 시각: Toss approvedAt만 (없으면 메시지에서 시간 줄 생략)
                  approvedAt: payment.approvedAt || "",
                  orderId,
                  paymentKey,
                  orderNumber: latestMeta.orderNumber,
                });

                if (notifyResult.success) {
                  const notifiedAt = new Date().toISOString();
                  const saved = await patchAdminNotifyMeta({
                    pageId: latest.pageId,
                    meta: {
                      ...latestMeta,
                      paymentKey:
                        paymentKey || latestMeta.paymentKey,
                    },
                    selectedClass:
                      latest.selectedClass ||
                      finalize.className ||
                      latestMeta.tossOrderId,
                    timeSlot: latest.timeSlot || "",
                    region:
                      latest.region || finalize.location || "",
                    adminNotify: "ADMIN_NOTIFIED",
                    adminNotifyAt: notifiedAt,
                  });
                  if (!saved) {
                    console.error(
                      "[웹훅] 카카오는 성공했지만 ADMIN_NOTIFIED 저장 실패 — 재전송 시 중복 알림 가능",
                      { orderId, orderNumber: latestMeta.orderNumber },
                    );
                  }
                  adminNotify = "sent";
                } else {
                  // ADMIN_NOTIFIED 저장 금지 — NOTIFYING 해제해 재시도 가능하게
                  await patchAdminNotifyMeta({
                    pageId: latest.pageId,
                    meta: latestMeta,
                    selectedClass:
                      latest.selectedClass ||
                      finalize.className ||
                      latestMeta.tossOrderId,
                    timeSlot: latest.timeSlot || "",
                    region:
                      latest.region || finalize.location || "",
                    adminNotify: undefined,
                    adminNotifyAt: undefined,
                  });
                  console.error(
                    "[웹훅] 관리자 알림 실패 (결제는 성공 유지):",
                    notifyResult.error,
                  );
                  adminNotify = "failed";
                }
              }
            }
          }
        }
      } catch (notifyError) {
        console.error(
          "[웹훅] 관리자 알림 예외 (결제는 성공 유지):",
          notifyError,
        );
        adminNotify = "failed";
      }
    }

    return NextResponse.json({
      received: true,
      processed: Boolean(finalize.success),
      orderId,
      status,
      enrollSaved: finalize.enrollSaved,
      adminNotify,
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
