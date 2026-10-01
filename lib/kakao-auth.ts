/**
 * 카카오 OAuth 토큰 유틸 (서버 전용)
 * Access/Refresh Token 값은 로그에 출력하지 않음
 *
 * Refresh Token 우선순위:
 * 1) Google Sheets 런타임 저장소 (로테이션 정본)
 * 2) Vercel 환경변수 KAKAO_REFRESH_TOKEN (부트스트랩/백업)
 *
 * 카카오가 새 refresh_token을 주면 즉시 저장소에 반영한다.
 */

import {
  loadKakaoRefreshTokenFromStore,
  saveKakaoRefreshTokenToStore,
} from "@/lib/kakao-refresh-token-store";

export type KakaoAccessTokenResult =
  | {
      success: true;
      accessToken: string;
      refreshTokenRotated: boolean;
      refreshTokenPersisted: boolean;
    }
  | { success: false; error: string; status?: number };

type RefreshAttemptResult =
  | {
      ok: true;
      accessToken: string;
      newRefreshToken: string | null;
      expiresIn?: number;
    }
  | {
      ok: false;
      status: number;
      error?: string;
      errorDescription?: string;
    };

async function requestAccessTokenWithRefresh(
  restApiKey: string,
  clientSecret: string,
  refreshToken: string,
): Promise<RefreshAttemptResult> {
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
    return {
      ok: false,
      status: res.status,
      error: typeof json.error === "string" ? json.error : undefined,
      errorDescription:
        typeof json.error_description === "string"
          ? json.error_description
          : undefined,
    };
  }

  const accessToken =
    typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) {
    return {
      ok: false,
      status: res.status,
      error: "missing_access_token",
    };
  }

  return {
    ok: true,
    accessToken,
    newRefreshToken:
      typeof json.refresh_token === "string" ? json.refresh_token : null,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

/**
 * Refresh Token으로 Access Token 발급
 * POST https://kauth.kakao.com/oauth/token
 */
export async function getKakaoAccessTokenFromRefresh(): Promise<KakaoAccessTokenResult> {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const envRefreshToken = (process.env.KAKAO_REFRESH_TOKEN || "").trim();

  if (!restApiKey || !clientSecret) {
    console.error("[카카오토큰] 환경변수 누락", {
      hasRestKey: Boolean(restApiKey),
      hasClientSecret: Boolean(clientSecret),
    });
    return {
      success: false,
      error: "카카오 토큰 환경변수가 설정되지 않았습니다.",
    };
  }

  const storedRefreshToken = await loadKakaoRefreshTokenFromStore();
  const candidates = [storedRefreshToken, envRefreshToken].filter(
    (token, index, arr): token is string =>
      Boolean(token) && arr.indexOf(token) === index,
  );

  if (candidates.length === 0) {
    console.error("[카카오토큰] Refresh Token 없음 (저장소·환경변수 모두 비어 있음)");
    return {
      success: false,
      error: "카카오 토큰 환경변수가 설정되지 않았습니다.",
    };
  }

  console.log("[카카오토큰] Access Token 발급 시도", {
    candidateCount: candidates.length,
    hasStored: Boolean(storedRefreshToken),
    hasEnv: Boolean(envRefreshToken),
  });

  let lastStatus: number | undefined;
  let lastError = "Access Token 갱신에 실패했습니다.";

  for (let i = 0; i < candidates.length; i += 1) {
    const refreshToken = candidates[i];
    const source = refreshToken === storedRefreshToken ? "store" : "env";
    const attempt = await requestAccessTokenWithRefresh(
      restApiKey,
      clientSecret,
      refreshToken,
    );

    if (!attempt.ok) {
      lastStatus = attempt.status;
      lastError = "Access Token 갱신에 실패했습니다.";
      console.error("[카카오토큰] refresh 실패:", {
        source,
        status: attempt.status,
        error: attempt.error,
        error_description: attempt.errorDescription,
      });
      continue;
    }

    const refreshTokenRotated = Boolean(attempt.newRefreshToken);
    const tokenToPersist = attempt.newRefreshToken || refreshToken;
    const shouldPersist =
      refreshTokenRotated ||
      !storedRefreshToken ||
      storedRefreshToken !== tokenToPersist;

    let refreshTokenPersisted = false;
    if (shouldPersist) {
      refreshTokenPersisted =
        await saveKakaoRefreshTokenToStore(tokenToPersist);
      if (refreshTokenRotated && !refreshTokenPersisted) {
        console.error(
          "[카카오토큰] 로테이션 토큰 저장 실패 — 다음 발송이 실패할 수 있습니다.",
        );
      } else if (refreshTokenRotated) {
        console.log(
          "[카카오토큰] Refresh Token 로테이션 감지 → 저장소에 자동 저장 완료",
        );
      } else if (refreshTokenPersisted) {
        console.log("[카카오토큰] 부트스트랩 토큰을 저장소에 동기화했습니다.");
      }
    }

    console.log("[카카오토큰] Access Token 발급 성공", {
      source,
      expiresIn: attempt.expiresIn,
      refreshTokenRotated,
      refreshTokenPersisted,
    });

    return {
      success: true,
      accessToken: attempt.accessToken,
      refreshTokenRotated,
      refreshTokenPersisted,
    };
  }

  return {
    success: false,
    error: lastError,
    status: lastStatus,
  };
}
