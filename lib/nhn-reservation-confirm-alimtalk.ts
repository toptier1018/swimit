import "server-only";

import {
  getNhnBankConfirmTemplateCode,
  NhnBankConfirmTemplateError,
  type NhnBankConfirmProgram,
} from "@/lib/nhn-bank-confirm-templates";
import { formatAlimtalkClassDateLabel } from "@/lib/reservation-confirm-alimtalk";

/** /api/schedules center 와 동일한 센터 표기 */
const CENTER_BY_LABEL: Record<string, string> = {
  서초: "서울 서초 인근",
  김포: "경기 김포 · 아스타스포츠센터",
  화성: "경기 화성 · 와이풀앤와이에스씨",
  목동: "서울 목동 · 목동스포츠센터",
  은평: "서울 은평구 · 삼정스포츠 수영장",
  인천: "인천 청라 · 청라스카이스위밍",
  청라: "인천 청라 · 청라스카이스위밍",
  동탄: "경기 동탄 · 스윔스튜디오제이",
  샤크베이: "경기 동탄 · 샤크베이 1호점",
  부산: "부산 · 조이풀스윔",
  중구: "서울 중구 · 스포빌키즈쿠아",
  수원: "수원·화성",
};

export type SendReservationConfirmationAlimtalkInput = {
  orderId: string;
  customerName: string;
  phone: string;
  /** YYYY-MM-DD 권장 */
  classDate?: string;
  /** schedules center 전체명 또는 region */
  center?: string;
  region?: string;
  /** 신청 클래스 (enrollment key 등) */
  className?: string;
  /** 실제 클래스 — 있으면 우선 */
  actualClassName?: string;
  /** 1부 / 2부 */
  session?: string;
  timeSlot?: string;
  /** enrollment key 예: [중구 10/11] 1부 특강 접영 */
  selectedClass?: string;
  program?: string;
};

export type SendReservationConfirmationAlimtalkResult =
  | {
      success: true;
      templateCode: string;
      center: string;
      program: NhnBankConfirmProgram;
      requestId?: string;
    }
  | {
      success: false;
      error: string;
      templateCode?: string;
      center?: string;
      program?: NhnBankConfirmProgram;
      errorCode?: string | number;
    };

function normalizeSession(raw: string): string {
  const m = String(raw || "").match(/(\d+부)/);
  return m?.[1] || "";
}

function resolveCenter(input: {
  center?: string;
  region?: string;
  selectedClass?: string;
}): string {
  const direct = String(input.center || "").trim();
  if (direct.includes("·") || direct.includes("김포") || direct.includes("화성") || direct.includes("수원")) {
    return direct;
  }

  const region = String(input.region || "").trim();
  if (region.includes("·")) return region;
  if (region.includes("김포")) return CENTER_BY_LABEL["김포"] || region;
  if (region.includes("화성") || region.includes("수원")) {
    return "수원·화성";
  }

  const selectedClass = String(input.selectedClass || "").trim();
  const label = selectedClass.match(/^\[([^\]]+)\]/)?.[1]?.trim() || "";
  const regionCode = label.replace(/\s+\d{1,2}\/\d{1,2}$/, "").trim();
  if (regionCode.includes("샤크베이")) return CENTER_BY_LABEL["샤크베이"];
  if (CENTER_BY_LABEL[regionCode]) return CENTER_BY_LABEL[regionCode];

  if (region && CENTER_BY_LABEL[region]) return CENTER_BY_LABEL[region];

  const hit = Object.values(CENTER_BY_LABEL).find(
    (c) => c === region || region.includes(c) || c.includes(region),
  );
  return hit || region || direct;
}

/**
 * 클래스명: 실제 클래스 우선, 없으면 신청 클래스
 */
export function resolveConfirmationClassName(input: {
  actualClassName?: string;
  className?: string;
  selectedClass?: string;
  program?: string;
}): string {
  const actual = String(input.actualClassName || "").trim();
  if (actual) {
    if (/(?:저항\s*)?진단/.test(actual)) return "진단";
    return actual.match(/(자유형|평영|접영|배영)/)?.[1] || actual;
  }

  const selectedClass = String(input.selectedClass || "").trim();
  if (/(?:저항\s*)?진단/.test(selectedClass) || input.program === "진단") {
    return "진단";
  }
  const fromKey = selectedClass.match(/(자유형|평영|접영|배영)/)?.[1];
  if (fromKey) return fromKey;

  const applied = String(input.className || "").trim();
  if (!applied) return "";
  if (/(?:저항\s*)?진단/.test(applied)) return "진단";
  return applied.match(/(자유형|평영|접영|배영)/)?.[1] || applied;
}

function resolveProgram(input: {
  program?: string;
  className: string;
  selectedClass?: string;
}): NhnBankConfirmProgram {
  const p = String(input.program || "").trim();
  if (p === "진단" || p.includes("진단")) return "진단";
  if (input.className === "진단") return "진단";
  if (/(?:저항\s*)?진단/.test(String(input.selectedClass || ""))) return "진단";
  return "특강";
}

/**
 * 카드결제 예약확정 — NHN Cloud만 호출
 * (입금 안내받기 v1 템플릿과 분리, Aligo 미사용)
 */
export async function sendReservationConfirmationAlimtalk(
  input: SendReservationConfirmationAlimtalkInput,
): Promise<SendReservationConfirmationAlimtalkResult> {
  let templateCode = "";
  let center = "";
  let program: NhnBankConfirmProgram | undefined;

  try {
    const customerName = String(input.customerName || "").trim();
    const phone = String(input.phone || "").replace(/\D/g, "");
    if (!customerName || phone.length < 10) {
      throw new NhnBankConfirmTemplateError(
        "고객명 또는 전화번호가 없습니다.",
      );
    }

    const placeLabel = resolveCenter({
      center: input.center,
      region: input.region,
      selectedClass: input.selectedClass,
    });
    center = placeLabel;

    const className = resolveConfirmationClassName({
      actualClassName: input.actualClassName,
      className: input.className,
      selectedClass: input.selectedClass,
      program: input.program,
    });
    if (!className) {
      throw new NhnBankConfirmTemplateError(
        "클래스명을 확인하지 못했습니다.",
      );
    }

    program = resolveProgram({
      program: input.program,
      className,
      selectedClass: input.selectedClass,
    });

    const session =
      normalizeSession(input.session || "") ||
      normalizeSession(input.timeSlot || "") ||
      normalizeSession(input.selectedClass || "") ||
      "1부";

    const classDateLabel = formatAlimtalkClassDateLabel({
      classDate: input.classDate,
      selectedClass: input.selectedClass,
    });

    const picked = getNhnBankConfirmTemplateCode({
      center: placeLabel,
      program,
      className,
    });
    templateCode = picked.templateCode;
    program = picked.program;

    console.log("[카드 예약확정] NHN 템플릿 선택", {
      orderId: input.orderId,
      center: placeLabel,
      program,
      templateCode,
    });

    const appKey = process.env.NHN_APPKEY?.trim() || "";
    const secretKey = process.env.NHN_SECRET_KEY?.trim() || "";
    const senderKey = process.env.NHN_SENDER_KEY?.trim() || "";
    if (!appKey || !secretKey || !senderKey) {
      console.error("[카드 예약확정] NHN 발송 실패", {
        orderId: input.orderId,
        templateCode,
        errorCode: "ENV_MISSING",
        errorMessage: "NHN_APPKEY / NHN_SECRET_KEY / NHN_SENDER_KEY 필요",
      });
      return {
        success: false,
        error: "NHN 환경변수가 없습니다.",
        templateCode,
        center: placeLabel,
        program,
        errorCode: "ENV_MISSING",
      };
    }

    const templateParameter = {
      고객명: customerName,
      특강일: classDateLabel,
      장소: placeLabel,
      클래스명: className,
      타임: session,
    };

    // placeholder 원문 금지
    for (const [key, value] of Object.entries(templateParameter)) {
      if (!value || /#\{/.test(value)) {
        throw new NhnBankConfirmTemplateError(
          `templateParameter 치환 실패: ${key}`,
        );
      }
    }

    const idempotencyKey = `SWIMIT-CARD-CONFIRM-${String(input.orderId || "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 100)}`;

    const requestBody = {
      senderKey,
      templateCode,
      recipientList: [
        {
          recipientNo: phone,
          templateParameter,
        },
      ],
    };

    console.log("[카드 예약확정] NHN 발송 요청", {
      orderId: input.orderId,
      templateCode,
      center: placeLabel,
      program,
      className,
      session,
      classDateLabel,
      phoneTail: phone.slice(-4),
      idempotencyKey,
    });

    const response = await fetch(
      `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Secret-Key": secretKey,
          "X-NC-API-IDEMPOTENCY-KEY": idempotencyKey,
        },
        body: JSON.stringify(requestBody),
      },
    );

    const result = await response.json().catch(() => ({}));
    const requestId =
      result?.message?.requestId != null
        ? String(result.message.requestId)
        : result?.header?.requestId != null
          ? String(result.header.requestId)
          : undefined;

    if (result?.header?.isSuccessful) {
      console.log("[카드 예약확정] NHN 발송 성공", {
        orderId: input.orderId,
        templateCode,
        ...(requestId ? { requestId } : {}),
      });
      return {
        success: true,
        templateCode,
        center: placeLabel,
        program,
        requestId,
      };
    }

    const recv = result?.message?.sendResults?.[0];
    const errorCode =
      recv?.resultCode ?? result?.header?.resultCode ?? response.status;
    const errorMessage =
      recv?.resultMessage ||
      result?.header?.resultMessage ||
      result?.message ||
      `NHN 발송 실패 (HTTP ${response.status})`;

    console.error("[카드 예약확정] NHN 발송 실패", {
      orderId: input.orderId,
      templateCode,
      errorCode,
      errorMessage,
    });

    return {
      success: false,
      error: String(errorMessage),
      templateCode,
      center: placeLabel,
      program,
      errorCode,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "카드 예약확정 NHN 발송 오류";
    console.error("[카드 예약확정] NHN 발송 실패", {
      orderId: input.orderId,
      templateCode: templateCode || undefined,
      errorCode: "EXCEPTION",
      errorMessage: message,
    });
    return {
      success: false,
      error: message,
      templateCode: templateCode || undefined,
      center: center || undefined,
      program,
      errorCode: "EXCEPTION",
    };
  }
}

/** @deprecated 카드결제 예약확정은 NHN sendReservationConfirmationAlimtalk 사용 */
export const sendCardPaymentReservationAlimtalk =
  sendReservationConfirmationAlimtalk;
