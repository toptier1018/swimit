import { NextRequest, NextResponse } from "next/server";
import { lookupAdvanceReservations } from "@/lib/advance-reservation-pay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const phoneLast4 =
      typeof body.phoneLast4 === "string" ? body.phoneLast4 : "";
    const phoneFull =
      typeof body.phoneFull === "string" ? body.phoneFull : "";

    console.log("[사전예약결제API] 조회 요청:", {
      hasLast4: Boolean(phoneLast4),
      hasFull: Boolean(phoneFull),
      last4Hint: phoneFull
        ? String(phoneFull).replace(/\D/g, "").slice(-4)
        : String(phoneLast4).replace(/\D/g, "").slice(-4),
    });

    const result = await lookupAdvanceReservations({
      phoneLast4,
      phoneFull,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: result.code === "NOT_FOUND" ? 404 : 400 },
      );
    }

    if (result.needFullPhone) {
      return NextResponse.json({
        success: true,
        needFullPhone: true,
        message: result.message,
        items: [],
      });
    }

    return NextResponse.json({
      success: true,
      needFullPhone: false,
      items: result.items,
    });
  } catch (error) {
    console.error("[사전예약결제API] 조회 예외:", error);
    return NextResponse.json(
      { success: false, error: "조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
