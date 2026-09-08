import { NextResponse } from "next/server";
import { getSchedules } from "@/lib/schedules";

/**
 * GET /api/schedules
 * debug=true 관리자 패널과 같은 일정·정원·신청 인원을 JSON으로 반환
 */
export async function GET() {
  try {
    console.log("[일정API] /api/schedules 요청");
    const schedules = await getSchedules();
    return NextResponse.json(schedules, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[일정API] 오류:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "일정 데이터를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
