import { NextResponse } from "next/server";
import { getAdvanceReservationPayWindowStatus } from "@/lib/advance-reservation-window";

/** 서버 Asia/Seoul 기준 결제 기간 상태 (클라이언트 시계 신뢰 금지) */
export async function GET() {
  const status = getAdvanceReservationPayWindowStatus();
  console.log("[사전예약결제API] 기간 상태:", {
    open: status.open,
    kst: status.kst,
    target: status.targetLabel,
  });
  return NextResponse.json({
    success: true,
    ...status,
  });
}
