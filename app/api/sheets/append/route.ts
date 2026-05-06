import { NextRequest, NextResponse } from "next/server";
import { appendRowToGoogleSheet } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[Google Sheets API] 예약 행 추가 요청:", {
      신청번호: body?.신청번호,
      예약상태: body?.예약상태,
      이름: body?.이름,
    });

    if (!body?.이름 || !body?.전화번호 || !body?.예약상태) {
      return NextResponse.json(
        {
          success: false,
          error: "이름, 전화번호, 예약상태는 필수입니다.",
        },
        { status: 400 },
      );
    }

    const result = await appendRowToGoogleSheet({
      접수일시: body.접수일시 ?? "",
      신청번호: body.신청번호 ?? "",
      이름: body.이름 ?? "",
      전화번호: body.전화번호 ?? "",
      이메일: body.이메일 ?? "",
      성별: body.성별 ?? "",
      거주지역: body.거주지역 ?? "",
      수영경력: body.수영경력 ?? "",
      통증부위: body.통증부위 ?? "",
      해결문제: body.해결문제 ?? "",
      클래스: body.클래스 ?? "",
      회차: body.회차 ?? "",
      레인: body.레인 ?? "",
      날짜: body.날짜 ?? "",
      특강지역: body.특강지역 ?? "",
      예약상태: body.예약상태 ?? "",
    });

    if (!result.success) {
      console.error("[Google Sheets API] 행 추가 실패:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      );
    }

    console.log("[Google Sheets API] 행 추가 성공:", {
      신청번호: body?.신청번호,
      예약상태: body?.예약상태,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Google Sheets API] 예외 발생:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
