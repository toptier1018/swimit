/**
 * 카카오 OAuth 토큰 유틸 (서버 전용)
 * Access/Refresh Token 값은 로그에 출력하지 않음
 */

export type KakaoAccessTokenResult =
  | { success: true; accessToken: string; refreshTokenRotated: boolean }
  | { success: false; error: string; status?: number };

/**
 * KAKAO_REFRESH_TOKEN으로 Access Token 발급
 * POST https://kauth.kakao.com/oauth/token
 */
export async function getKakaoAccessTokenFromRefresh(): Promise<KakaoAccessTokenResult> {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const refreshToken = process.env.KAKAO_REFRESH_TOKEN;

  if (!restApiKey || !clientSecret || !refreshToken) {
    console.error("[카카오토큰] 환경변수 누락", {
      hasRestKey: Boolean(restApiKey),
      hasClientSecret: Boolean(clientSecret),
      hasRefreshToken: Boolean(refreshToken),
    });
    return {
      success: false,
      error: "카카오 토큰 환경변수가 설정되지 않았습니다.",
    };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: restApiKey,
    refresh_token: refreshToken,
    client_secret: clientSecret,
  });

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: body.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    console.error("[카카오토큰] refresh 실패:", {
      status: res.status,
      error: typeof json.error === "string" ? json.error : undefined,
      error_description:
        typeof json.error_description === "string"
          ? json.error_description
          : undefined,
    });
    return {
      success: false,
      error: "Access Token 갱신에 실패했습니다.",
      status: res.status,
    };
  }

  const accessToken =
    typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) {
    console.error("[카카오토큰] access_token 없음");
    return { success: false, error: "access_token이 응답에 없습니다." };
  }

  // 새 refresh_token이 오면 Vercel 수동 갱신 필요 — 값은 로그에 남기지 않음
  const refreshTokenRotated = typeof json.refresh_token === "string";
  if (refreshTokenRotated) {
    console.warn(
      "[카카오토큰] KAKAO_REFRESH_TOKEN_ROTATION_REQUIRED — Vercel의 KAKAO_REFRESH_TOKEN을 새 값으로 교체하세요. (토큰 값은 로그에 출력하지 않음)",
    );
  } else {
    console.log("[카카오토큰] Access Token 발급 성공", {
      expiresIn:
        typeof json.expires_in === "number" ? json.expires_in : undefined,
      refreshTokenRotated: false,
    });
  }

  return { success: true, accessToken, refreshTokenRotated };
}
