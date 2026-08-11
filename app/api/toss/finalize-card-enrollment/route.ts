import { NextRequest, NextResponse } from "next/server";
import { finalizeCardEnrollmentCore } from "@/lib/finalize-card-enrollment";

/**
 * 토스 승인 이후 Notion/시트 후처리 (멱등)
 * - success 페이지에서 호출
 * - 관리자 알림(notifyAdminPayment)은 여기서 호출하지 않음 (웹훅 전용)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";
    const paymentKey =
      typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
    const enrollment =
      body.enrollment && typeof body.enrollment === "object"
        ? body.enrollment
        : null;

    console.log("[카드후처리] API 시작:", {
      orderId,
      paymentKeyPrefix: paymentKey ? `${paymentKey.slice(0, 10)}…` : "",
      hasEnrollment: Boolean(enrollment),
    });

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId가 필요합니다." },
        { status: 400 },
      );
    }

    const result = await finalizeCardEnrollmentCore({
      orderId,
      paymentKey,
      enrollment,
      allowMarkDoneFromWebhook: false,
    });

    if (!result.success) {
      const status =
        result.code === "NOT_CONFIRMED"
          ? 409
          : result.code === "ORDER_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json(
        {
          success: false,
          paymentConfirmedUnknown: result.code === "ORDER_NOT_FOUND",
          error: result.error,
          code: result.code,
          orderId: result.orderId,
          paymentKey: result.paymentKey,
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      paymentApproved: true,
      enrollSaved: result.enrollSaved,
      notionOk: result.notionOk,
      sheetOk: result.sheetOk,
      sheetSkippedDuplicate: result.sheetSkippedDuplicate,
      notionSkipped: result.notionSkipped,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      paymentKey: result.paymentKey,
      amount: result.amount,
      recoveryHint: result.recoveryHint,
    });
  } catch (error) {
    console.error("[카드후처리] 예외:", error);
    return NextResponse.json(
      { success: false, error: "후처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
