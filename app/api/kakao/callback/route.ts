import { NextRequest, NextResponse } from "next/server";

/**
 * [SETUP] 관리자 카카오 「나에게 보내기」 최초 연결용 Callback
 * Refresh Token 확보 후 외부 상시 공개 필요 여부 재검토 예정
 *
 * GET /api/kakao/callback
 * → authorization code로 토큰 발급
 * → talk_message scope 확인
 * → Refresh Token만 화면에 1회 표시 (로그에는 출력하지 않음)
 * → 실제 talk/memo 발송 API는 호출하지 않음
 */
export async function GET(req: NextRequest) {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const redirectUri =
    process.env.KAKAO_REDIRECT_URI ||
    "https://swimit.vercel.app/api/kakao/callback";

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (error) {
    console.error("[카카오설정] OAuth 거부/오류:", {
      error,
      // description만 (민감정보 없음)
      hasDescription: Boolean(errorDescription),
    });
    return htmlResponse(
      "카카오 인증 실패",
      `<p>카카오 로그인에 실패했거나 취소되었습니다.</p>
       <p>다시 <a href="/api/kakao/connect">/api/kakao/connect</a> 로 접속해 주세요.</p>`,
      true,
      400,
    );
  }

  if (!code) {
    return htmlResponse(
      "인증 코드 없음",
      `<p>authorization code가 없습니다. <a href="/api/kakao/connect">다시 연결</a>해 주세요.</p>`,
      true,
      400,
    );
  }

  if (!restApiKey || !clientSecret) {
    console.error("[카카오설정] 환경변수 누락", {
      hasRestKey: Boolean(restApiKey),
      hasClientSecret: Boolean(clientSecret),
    });
    return htmlResponse(
      "설정 오류",
      `<p>Vercel에 <code>KAKAO_REST_API_KEY</code>, <code>KAKAO_CLIENT_SECRET</code>를 등록한 뒤 다시 시도해 주세요.</p>`,
      true,
      500,
    );
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: tokenBody.toString(),
    });

    const tokenJson = (await tokenRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!tokenRes.ok) {
      // 민감값 없이 오류 코드/메시지만 로그
      console.error("[카카오설정] 토큰 발급 실패:", {
        status: tokenRes.status,
        error: typeof tokenJson.error === "string" ? tokenJson.error : undefined,
        error_description:
          typeof tokenJson.error_description === "string"
            ? tokenJson.error_description
            : undefined,
      });
      return htmlResponse(
        "토큰 발급 실패",
        `<p>카카오 토큰 발급에 실패했습니다. Redirect URI·Client Secret·앱 설정을 확인해 주세요.</p>
         <p><a href="/api/kakao/connect">다시 시도</a></p>`,
        true,
        400,
      );
    }

    const accessToken =
      typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
    const refreshToken =
      typeof tokenJson.refresh_token === "string"
        ? tokenJson.refresh_token
        : "";
    const expiresIn = Number(tokenJson.expires_in);
    const refreshTokenExpiresIn = Number(tokenJson.refresh_token_expires_in);
    const scope =
      typeof tokenJson.scope === "string" ? tokenJson.scope : "";

    // 값 자체는 로그하지 않음 — 존재 여부만
    console.log("[카카오설정] 토큰 발급 응답 검증:", {
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : null,
      refreshTokenExpiresIn: Number.isFinite(refreshTokenExpiresIn)
        ? refreshTokenExpiresIn
        : null,
      scopeHasTalkMessage: scope.split(/\s+/).includes("talk_message"),
      scopePartsCount: scope ? scope.split(/\s+/).filter(Boolean).length : 0,
    });

    if (!accessToken || !refreshToken) {
      return htmlResponse(
        "토큰 누락",
        `<p>access_token 또는 refresh_token이 응답에 없습니다. 카카오 앱 설정을 확인해 주세요.</p>`,
        true,
        400,
      );
    }

    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      return htmlResponse(
        "토큰 만료 정보 오류",
        `<p>expires_in 값이 올바르지 않습니다.</p>`,
        true,
        400,
      );
    }

    const scopes = scope.split(/\s+/).filter(Boolean);
    if (!scopes.includes("talk_message")) {
      return htmlResponse(
        "권한 부족",
        `<p><strong>카카오톡 메시지 전송 권한(talk_message) 동의가 필요합니다.</strong></p>
         <p>카카오 로그인 동의 화면에서 메시지 전송(talk_message)을 허용한 뒤
         <a href="/api/kakao/connect">다시 연결</a>해 주세요.</p>
         <p style="font-size:12px;color:#64748b">동의된 scope 개수: ${scopes.length}</p>`,
        true,
        403,
      );
    }

    // Refresh Token만 1회 표시 (Access Token / Secret / REST Key 미표시)
    const safeRefresh = escapeHtml(refreshToken);

    return htmlResponse(
      "카카오 관리자 인증이 완료되었습니다.",
      `
      <p>아래 Refresh Token을 <code>KAKAO_REFRESH_TOKEN</code>이라는 이름으로
      Vercel Production 환경변수에 등록하세요.</p>
      <p style="font-size:13px;color:#334155">등록 후 배포(Redeploy)가 필요할 수 있습니다.</p>
      <label for="rt" style="display:block;font-size:13px;font-weight:700;margin:16px 0 6px">KAKAO_REFRESH_TOKEN</label>
      <textarea id="rt" readonly rows="4" style="width:100%;font-family:ui-monospace,monospace;font-size:12px;padding:10px;border-radius:8px;border:1px solid #cbd5e1;box-sizing:border-box">${safeRefresh}</textarea>
      <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('rt').value).then(()=>{this.textContent='복사됨';}).catch(()=>{})"
        style="margin-top:10px;padding:10px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer">
        복사하기
      </button>
      <p style="margin-top:18px;font-size:12px;color:#64748b">
        talk_message 동의 확인됨 · Access Token은 화면에 표시하지 않습니다.<br/>
        이 페이지는 관리자 최초 설정용입니다. 실제 카카오톡 메시지는 아직 발송하지 않았습니다.
      </p>
      `,
      false,
      200,
    );
  } catch (err) {
    console.error("[카카오설정] callback 예외:", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : "unknown",
    });
    return htmlResponse(
      "처리 오류",
      `<p>토큰 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>`,
      true,
      500,
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlResponse(
  title: string,
  body: string,
  isError: boolean,
  status: number,
) {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · 스윔잇</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 48px auto; padding: 0 16px; color: #0f172a; }
    .box { border: 1px solid ${isError ? "#fecaca" : "#bbf7d0"}; background: ${isError ? "#fef2f2" : "#f0fdf4"}; border-radius: 12px; padding: 20px; }
    h1 { font-size: 1.25rem; margin: 0 0 12px; }
    p { line-height: 1.6; margin: 0 0 10px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; word-break: break-all; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
