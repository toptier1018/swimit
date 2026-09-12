import { NextResponse } from "next/server";
import { buildFishtankFormProgramsPayload } from "@/lib/fishtank-form-programs";

/**
 * GET /api/fishtank-form-programs
 * 어항샷 Google Form 「참여 프로그램」 선택지용 진단 일정 목록
 * Apps Script가 매일 호출해 폼 선택지를 동기화한다.
 */
export async function GET() {
  try {
    console.log("[어항샷폼API] /api/fishtank-form-programs 요청");
    const payload = buildFishtankFormProgramsPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "어항샷 폼 프로그램 목록을 만들지 못했습니다.";
    console.error("[어항샷폼API] 오류:", message);
    return NextResponse.json(
      { ok: false, error: message, options: [], count: 0 },
      { status: 500 },
    );
  }
}
