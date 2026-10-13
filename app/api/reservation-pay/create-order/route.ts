import { NextRequest, NextResponse } from "next/server";
import { createAdvanceReservationTossOrder } from "@/lib/advance-reservation-pay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderNumber =
      typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
    const phoneLast4 =
      typeof body.phoneLast4 === "string" ? body.phoneLast4 : "";
    const phoneFull =
      typeof body.phoneFull === "string" ? body.phoneFull : "";

    console.log("[사전예약결제API] 주문 생성 요청:", {
      orderNumber,
      hasFull: Boolean(phoneFull),
      phoneTail: phoneFull
        ? String(phoneFull).replace(/\D/g, "").slice(-4)
        : String(phoneLast4).replace(/\D/g, "").slice(-4),
    });

    const result = await createAdvanceReservationTossOrder({
      orderNumber,
      phoneLast4,
      phoneFull,
    });

    if (!result.success) {
      const status =
        result.code === "ALREADY_PAID"
          ? 409
          : result.code === "NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      tossOrderId: result.tossOrderId,
      orderNumber: result.orderNumber,
      amount: result.amount,
      orderName: result.orderName,
      customerName: result.customerName,
      customerPhone: result.customerPhone,
      clientKey: result.clientKey,
      label: result.label,
    });
  } catch (error) {
    console.error("[사전예약결제API] 주문 생성 예외:", error);
    return NextResponse.json(
      { success: false, error: "주문 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
