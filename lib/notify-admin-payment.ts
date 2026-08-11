/**
 * 관리자 결제 알림 — 카카오톡 「나에게 보내기」
 * Toss 웹훅에서만 호출. 실패해도 결제/Notion/시트 후처리를 되돌리지 않음.
 */

import { sendKakaoMemoToMe } from "@/lib/kakao-talk-memo";

export type AdminPaymentNotifyPayload = {
  customerName: string;
  phone: string;
  location: string;
  classDate: string;
  className: string;
  amount: number;
  approvedAt: string;
  orderId: string;
  paymentKey: string;
  /** 고객에게 보이는 WC 주문번호 (메시지 표시용) */
  orderNumber?: string;
};

export type NotifyAdminPaymentResult = {
  success: boolean;
  error?: string;
  refreshTokenRotated?: boolean;
};

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "";
  const last4 = digits.slice(-4);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${last4}`;
  }
  return `****-${last4}`;
}

/** Toss approvedAt → Asia/Seoul HH:mm (없으면 빈 문자열) */
function formatApprovedTimeSeoul(approvedAt: string): string {
  if (!approvedAt.trim()) return "";
  const d = new Date(approvedAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatAmountKrw(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

/**
 * 카카오 기본 텍스트 템플릿용 본문
 * 알 수 없는 항목은 생략 (추측 표시 금지)
 * paymentKey 등 민감정보는 포함하지 않음
 */
export function buildAdminPaymentKakaoText(
  payload: AdminPaymentNotifyPayload,
): string {
  const lines: string[] = ["💳 스윔잇 카드 결제 완료", ""];

  if (payload.customerName.trim()) {
    lines.push(payload.customerName.trim());
  }
  if (payload.location.trim()) {
    lines.push(`📍 ${payload.location.trim()}`);
  }
  if (payload.classDate.trim()) {
    lines.push(`📅 ${payload.classDate.trim()}`);
  }
  if (payload.className.trim()) {
    lines.push(`🏊 ${payload.className.trim()}`);
  }

  lines.push("");

  if (Number.isFinite(payload.amount) && payload.amount > 0) {
    lines.push(`💰 ${formatAmountKrw(payload.amount)}`);
  }

  const timeSeoul = formatApprovedTimeSeoul(payload.approvedAt);
  if (timeSeoul) {
    lines.push(`🕐 ${timeSeoul}`);
  }

  const masked = maskPhone(payload.phone);
  if (masked) {
    lines.push(`📞 ${masked}`);
  }

  const displayOrder =
    payload.orderNumber?.trim() || payload.orderId?.trim() || "";
  if (displayOrder) {
    lines.push("");
    lines.push("주문번호");
    lines.push(displayOrder);
  }

  return lines.join("\n").trim();
}

/**
 * 카카오톡 나에게 보내기 실제 발송
 * sendKakaoMemoToMe result_code === 0 일 때만 success
 */
export async function notifyAdminPayment(
  payload: AdminPaymentNotifyPayload,
): Promise<NotifyAdminPaymentResult> {
  console.log("[관리자알림] notifyAdminPayment 시작:", {
    customerName: payload.customerName,
    phone: payload.phone ? maskPhone(payload.phone) || "****" : "",
    location: payload.location,
    classDate: payload.classDate || "(생략)",
    className: payload.className,
    amount: payload.amount,
    approvedAt: payload.approvedAt || "(없음)",
    orderId: payload.orderId,
    orderNumber: payload.orderNumber || "",
    // paymentKey는 로그에도 전문 출력하지 않음
    paymentKeyPrefix: payload.paymentKey
      ? `${payload.paymentKey.slice(0, 10)}…`
      : "",
  });

  try {
    const text = buildAdminPaymentKakaoText(payload);
    const result = await sendKakaoMemoToMe({
      templateObject: {
        object_type: "text",
        text,
        link: {
          web_url: "https://swimit.vercel.app/",
          mobile_web_url: "https://swimit.vercel.app/",
        },
        button_title: "스윔잇 열기",
      },
    });

    if (!result.success) {
      console.error("[관리자알림] 카카오 발송 실패:", {
        error: result.error,
        httpStatus: result.httpStatus,
        kakaoCode: result.kakaoCode,
        refreshTokenRotated: result.refreshTokenRotated ?? false,
      });
      return {
        success: false,
        error: result.error,
        refreshTokenRotated: result.refreshTokenRotated,
      };
    }

    console.log("[관리자알림] 카카오 발송 성공", {
      orderId: payload.orderId,
      orderNumber: payload.orderNumber || "",
      refreshTokenRotated: result.refreshTokenRotated,
    });

    return {
      success: true,
      refreshTokenRotated: result.refreshTokenRotated,
    };
  } catch (error) {
    console.error("[관리자알림] 예외 (결제는 유지):", {
      message: error instanceof Error ? error.message : "unknown",
      orderId: payload.orderId,
    });
    return {
      success: false,
      error: "관리자 알림 중 예외가 발생했습니다.",
    };
  }
}
