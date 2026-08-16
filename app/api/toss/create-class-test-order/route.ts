import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveClassPaymentAmount } from "@/lib/class-payment-amount";
import { toNotionCardStatusFields } from "@/lib/toss-card-order-meta";
import { updatePaymentInNotion } from "@/app/actions/notion";

/**
 * 특강 카드결제 주문 생성
 * - 클라이언트 amount는 신뢰하지 않음
 * - className 기준으로 서버가 금액을 결정
 * - 주문번호 = 토스 orderId (CLASS-…) — 시트·노션·취소에 동일 키 사용
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const className =
      typeof body.className === "string" ? body.className.trim() : "";
    const pageId = typeof body.pageId === "string" ? body.pageId.trim() : "";
    const timeSlot =
      typeof body.timeSlot === "string" ? body.timeSlot.trim() : "";
    const region = typeof body.region === "string" ? body.region.trim() : "";
    const paymentStartedAt =
      typeof body.paymentStartedAt === "string"
        ? body.paymentStartedAt
        : new Date().toISOString();
    const traffic =
      body.traffic && typeof body.traffic === "object"
        ? (body.traffic as Record<string, string>)
        : undefined;

    // 클라이언트가 보낸 amount는 참고용 로그만 (최종 금액으로 쓰지 않음)
    const clientAmountHint = Number(body.amount);
    console.log("[카드결제] 주문 생성 요청:", {
      className,
      pageId: pageId ? `${pageId.slice(0, 8)}…` : "",
      clientAmountHint: Number.isFinite(clientAmountHint)
        ? clientAmountHint
        : null,
    });

    if (!className || !pageId) {
      return NextResponse.json(
        {
          success: false,
          error: "className, pageId는 필수입니다.",
        },
        { status: 400 },
      );
    }

    const amount = resolveClassPaymentAmount(className);
    if (!amount) {
      return NextResponse.json(
        { success: false, error: "이 클래스는 카드결제가 불가합니다." },
        { status: 400 },
      );
    }

    if (
      Number.isFinite(clientAmountHint) &&
      clientAmountHint > 0 &&
      clientAmountHint !== amount
    ) {
      console.warn("[카드결제] 클라이언트 금액과 서버 금액 불일치 — 서버 금액 사용:", {
        clientAmountHint,
        serverAmount: amount,
        className,
      });
    }

    const orderId = `CLASS-${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
    // 카드: 신청번호/주문번호 = 토스 orderId (WC 별도 발급 없음)
    const orderNumber = orderId;
    const idempotencyKey = randomUUID();

    const pendingMeta = {
      status: "CARD_PENDING" as const,
      tossOrderId: orderId,
      amount,
      orderNumber,
      idempotencyKey,
    };
    const statusFields = toNotionCardStatusFields(pendingMeta);

    const notionUpdate = await updatePaymentInNotion({
      pageId,
      ...statusFields,
      orderNumber,
      selectedClass: className,
      timeSlot: timeSlot || className,
      region: region || "정보 없음",
      paymentStartedAt,
      traffic,
    });

    console.log("[카드결제] Notion 사람용 상태:", statusFields.virtualAccountInfo);

    if (!notionUpdate.success) {
      console.error("[카드결제] Notion 대기 주문 저장 실패:", notionUpdate.error);
      return NextResponse.json(
        {
          success: false,
          error: notionUpdate.error || "주문 저장에 실패했습니다.",
        },
        { status: 500 },
      );
    }

    console.log("[카드결제] 주문 생성 완료:", {
      orderId,
      amount,
      orderNumber,
      className,
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      orderName: className.slice(0, 100),
      amount,
      clientKey: process.env.TOSS_CLIENT_KEY ?? "",
    });
  } catch (error) {
    console.error("[카드결제] 주문 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "주문 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
