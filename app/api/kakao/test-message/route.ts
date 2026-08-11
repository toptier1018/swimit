import { NextRequest, NextResponse } from "next/server";
import { sendKakaoMemoToMe } from "@/lib/kakao-talk-memo";

/**
 * [SETUP/TEST] 카카오톡 나에게 보내기 단독 테스트
 * Toss 웹훅·notifyAdminPayment와 연결하지 않음
 *
 * POST /api/kakao/test-message
 * Header: x-kakao-test-secret: <KAKAO_TEST_SECRET>
 * 또는 body: { "secret": "<KAKAO_TEST_SECRET>" }
 *
 * GET은 허용하지 않음 (브라우저 주소창 악용 방지)
 */
export async function POST(req: NextRequest) {
  const expected = process.env.KAKAO_TEST_SECRET;
  if (!expected) {
    console.error("[카카오테스트] KAKAO_TEST_SECRET 미설정");
    return NextResponse.json(
      { success: false, error: "테스트 Secret이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let bodySecret = "";
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.secret === "string") {
      bodySecret = body.secret;
    }
  } catch {
    bodySecret = "";
  }

  const headerSecret = req.headers.get("x-kakao-test-secret") || "";
  const provided = headerSecret || bodySecret;

  if (!provided || provided !== expected) {
    console.warn("[카카오테스트] Secret 불일치 — 401");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  console.log("[카카오테스트] 테스트 메시지 발송 요청 수신");

  const result = await sendKakaoMemoToMe();
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        httpStatus: result.httpStatus,
        kakaoCode: result.kakaoCode,
        refreshTokenRotated: result.refreshTokenRotated ?? false,
      },
      { status: result.httpStatus && result.httpStatus >= 400 ? result.httpStatus : 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "카카오톡 나에게 보내기 테스트 메시지를 발송했습니다.",
    refreshTokenRotated: result.refreshTokenRotated,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "GET은 지원하지 않습니다. POST + Secret으로 요청하세요.",
    },
    { status: 405 },
  );
}
