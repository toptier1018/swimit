import { NextRequest, NextResponse } from "next/server";
import { confirmAdvanceReservationPayment } from "@/lib/advance-reservation-pay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentKey =
      typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
    const tossOrderId =
      typeof body.tossOrderId === "string"
        ? body.tossOrderId.trim()
        : typeof body.orderId === "string"
          ? body.orderId.trim()
          : "";

    console.log("[사전예약결제API] 승인 요청:", {
      tossOrderId,
      paymentKeyPrefix: paymentKey ? `${paymentKey.slice(0, 10)}…` : "",
    });

    const result = await confirmAdvanceReservationPayment({
      paymentKey,
      tossOrderId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: result.code === "WINDOW_CLOSED" ? 403 : 400 },
      );
    }

    return NextResponse.json({
      success: true,
      orderNumber: result.orderNumber,
      amount: result.amount,
      label: result.label,
      customerName: result.customerName,
      alreadyConfirmed: Boolean(result.alreadyConfirmed),
    });
  } catch (error) {
    console.error("[사전예약결제API] 승인 예외:", error);
    return NextResponse.json(
      { success: false, error: "결제 승인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
