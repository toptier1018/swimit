import { NextResponse } from "next/server";

/**
 * [SETUP] 관리자 카카오 「나에게 보내기」 최초 연결용
 * Refresh Token 확보 후 외부 상시 공개 필요 여부 재검토 예정
 *
 * GET /api/kakao/connect
 * → 카카오 OAuth authorize 페이지로 redirect
 */
export async function GET() {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const redirectUri =
    process.env.KAKAO_REDIRECT_URI ||
    "https://swimit.vercel.app/api/kakao/callback";

  if (!restApiKey) {
    console.error("[카카오설정] KAKAO_REST_API_KEY 미설정");
    return new NextResponse(
      htmlPage(
        "설정 오류",
        "<p>카카오 REST API Key 환경변수가 없습니다. Vercel에 <code>KAKAO_REST_API_KEY</code>를 등록한 뒤 다시 시도해 주세요.</p>",
        true,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("client_id", restApiKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "talk_message");

  console.log("[카카오설정] OAuth authorize로 redirect", {
    redirectUri,
    scope: "talk_message",
  });

  return NextResponse.redirect(authUrl.toString());
}

function htmlPage(title: string, body: string, isError = false) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · 스윔잇</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 48px auto; padding: 0 16px; color: #0f172a; }
    .box { border: 1px solid ${isError ? "#fecaca" : "#bbf7d0"}; background: ${isError ? "#fef2f2" : "#f0fdf4"}; border-radius: 12px; padding: 20px; }
    h1 { font-size: 1.25rem; margin: 0 0 12px; }
    p { line-height: 1.6; margin: 0 0 10px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}
