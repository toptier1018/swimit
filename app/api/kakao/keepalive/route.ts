import { NextRequest, NextResponse } from "next/server";
import { getKakaoAccessTokenFromRefresh } from "@/lib/kakao-auth";

/**
 * Refresh Token 로테이션 유지를 위한 주기 호출
 * - 결제 알림이 오래 없어도, 만료 1개월 전 구간에 새 refresh_token을 받아 저장소에 반영
 * - GET/POST 모두 허용 (Vercel Cron은 GET)
 *
 * 인증:
 * - Authorization: Bearer <CRON_SECRET>
 * - 또는 Header x-kakao-test-secret / body.secret = KAKAO_TEST_SECRET
 */
function isAuthorized(req: NextRequest, bodySecret: string): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim() || "";
  const auth = req.headers.get("authorization") || "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }

  const testSecret = process.env.KAKAO_TEST_SECRET?.trim() || "";
  const headerSecret = req.headers.get("x-kakao-test-secret") || "";
  const provided = headerSecret || bodySecret;
  if (testSecret && provided && provided === testSecret) {
    return true;
  }

  // Vercel Cron 기본 호출 (CRON_SECRET 미설정 시 폴백)
  if (req.headers.get("x-vercel-cron") === "1") {
    console.log("[카카오keepalive] x-vercel-cron 헤더로 인증");
    return true;
  }

  return false;
}

async function handleKeepalive(req: NextRequest) {
  let bodySecret = "";
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.secret === "string") {
      bodySecret = body.secret;
    }
  } catch {
    bodySecret = "";
  }

  if (!isAuthorized(req, bodySecret)) {
    console.warn("[카카오keepalive] Unauthorized");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  console.log("[카카오keepalive] Refresh 유지 호출 수신");

  const result = await getKakaoAccessTokenFromRefresh();
  if (!result.success) {
    console.error("[카카오keepalive] 실패:", {
      error: result.error,
      status: result.status,
    });
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        status: result.status,
      },
      { status: result.status && result.status >= 400 ? result.status : 502 },
    );
  }

  console.log("[카카오keepalive] 성공", {
    refreshTokenRotated: result.refreshTokenRotated,
    refreshTokenPersisted: result.refreshTokenPersisted,
  });

  return NextResponse.json({
    success: true,
    message: "카카오 Refresh Token keepalive 완료",
    refreshTokenRotated: result.refreshTokenRotated,
    refreshTokenPersisted: result.refreshTokenPersisted,
  });
}

export async function GET(req: NextRequest) {
  return handleKeepalive(req);
}

export async function POST(req: NextRequest) {
  return handleKeepalive(req);
}
