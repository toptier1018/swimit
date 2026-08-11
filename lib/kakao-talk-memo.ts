/**
 * 카카오톡 「나에게 보내기」 (기본 템플릿)
 * POST https://kapi.kakao.com/v2/api/talk/memo/default/send
 */

import { getKakaoAccessTokenFromRefresh } from "@/lib/kakao-auth";

export type KakaoMemoSendResult =
  | { success: true; refreshTokenRotated: boolean }
  | {
      success: false;
      error: string;
      httpStatus?: number;
      kakaoCode?: number | string;
      refreshTokenRotated?: boolean;
    };

const TEST_TEMPLATE = {
  object_type: "text",
  text: "💳 스윔잇 결제 알림 테스트\n\n카카오톡 결제 알림 연결이 정상적으로 완료되었습니다.",
  link: {
    web_url: "https://swimit.vercel.app/",
    mobile_web_url: "https://swimit.vercel.app/",
  },
  button_title: "스윔잇 열기",
};

/**
 * 나와의 채팅으로 기본 템플릿 메시지 발송
 * result_code === 0 만 성공
 */
export async function sendKakaoMemoToMe(options?: {
  templateObject?: Record<string, unknown>;
}): Promise<KakaoMemoSendResult> {
  const tokenResult = await getKakaoAccessTokenFromRefresh();
  if (!tokenResult.success) {
    return {
      success: false,
      error: tokenResult.error,
      httpStatus: tokenResult.status,
    };
  }

  const templateObject = options?.templateObject ?? TEST_TEMPLATE;
  const body = new URLSearchParams({
    template_object: JSON.stringify(templateObject),
  });

  const res = await fetch(
    "https://kapi.kakao.com/v2/api/talk/memo/default/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: body.toString(),
    },
  );

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const resultCode = json.result_code;
  const kakaoCode = json.code;

  if (!res.ok || resultCode !== 0) {
    console.error("[카카오메시지] 발송 실패:", {
      httpStatus: res.status,
      result_code: resultCode,
      code: kakaoCode,
      msg: typeof json.msg === "string" ? json.msg : undefined,
    });
    return {
      success: false,
      error: "카카오톡 메시지 발송에 실패했습니다.",
      httpStatus: res.status,
      kakaoCode:
        typeof resultCode === "number"
          ? resultCode
          : typeof kakaoCode === "number" || typeof kakaoCode === "string"
            ? kakaoCode
            : undefined,
      refreshTokenRotated: tokenResult.refreshTokenRotated,
    };
  }

  console.log("[카카오메시지] 발송 성공 (result_code=0)", {
    refreshTokenRotated: tokenResult.refreshTokenRotated,
  });

  return {
    success: true,
    refreshTokenRotated: tokenResult.refreshTokenRotated,
  };
}
