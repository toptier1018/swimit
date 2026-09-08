import "server-only";

import {
  AlimtalkTemplateError,
  getAlimtalkTemplateCode,
  type AlimtalkProgram,
} from "@/lib/alimtalk-templates";

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
};

export type ReservationAlimtalkFields = {
  center: string;
  program: AlimtalkProgram;
  className: string;
  session: string;
  classDateLabel: string;
  customerName: string;
  customerPhone: string;
};

export type SendReservationConfirmAlimtalkInput = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  /** Notion/시트 지역 — 가능하면 schedules center 전체명 */
  region?: string;
  /** enrollment key 예: [은평 9/13] 1부 특강 자유형 */
  selectedClass?: string;
  /** YYYY-MM-DD 권장 */
  classDate?: string;
  timeSlot?: string;
  pageId?: string;
};

export type SendReservationConfirmAlimtalkResult =
  | {
      success: true;
      templateCode: string;
      center: string;
      program: AlimtalkProgram;
    }
  | {
      success: false;
      error: string;
      skipped?: boolean;
      templateCode?: string;
      center?: string;
      program?: AlimtalkProgram;
    };

/**
 * #{특강일} → "2026년 10월 11일"
 * Google Sheets 일련번호는 절대 그대로 보내지 않는다.
 */
export function formatAlimtalkClassDateLabel(input: {
  classDate?: string;
  selectedClass?: string;
}): string {
  const raw = String(input.classDate || "").trim();

  // 이미 "2026년 10월 11일" 형태
  if (/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$/.test(raw)) {
    return raw.replace(/\s+/g, " ");
  }

  // YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}년 ${Number(iso[2])}월 ${Number(iso[3])}일`;
  }

  // enrollment key: [중구 10/11]
  const fromKey = String(input.selectedClass || "").match(
    /\[(?:[^\]]*?)\s+(\d{1,2})\/(\d{1,2})\]/,
  );
  if (fromKey) {
    return `2026년 ${Number(fromKey[1])}월 ${Number(fromKey[2])}일`;
  }

  // 시트 표기 "2026. 10. 11" 등
  const dotted = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (dotted) {
    const year = Number(dotted[1]);
    // Google Sheets 일련번호(4만대) 방어
    if (year >= 2020 && year <= 2100) {
      return `${year}년 ${Number(dotted[2])}월 ${Number(dotted[3])}일`;
    }
  }

  throw new AlimtalkTemplateError(
    `알림톡 특강일 형식 오류: classDate="${raw}", selectedClass="${input.selectedClass || ""}"`,
  );
}

export function resolveReservationAlimtalkFields(
  input: SendReservationConfirmAlimtalkInput,
): ReservationAlimtalkFields {
  const selectedClass = String(input.selectedClass || "").trim();
  const region = String(input.region || "").trim();

  const diagnosisMatch = selectedClass.match(
    /^\[([^\]]+)\]\s+(\d+부)\s*(?:저항\s*)?진단(?:\s*프로그램)?$/,
  );
  const specialMatch = selectedClass.match(
    /^\[([^\]]+)\]\s+(\d+부)\s*특강\s+(자유형|평영|접영|배영)/,
  );

  let program: AlimtalkProgram = "특강";
  let session = "";
  let className = "";
  let label = "";

  if (diagnosisMatch) {
    program = "진단";
    label = diagnosisMatch[1].trim();
    session = diagnosisMatch[2];
    className = "진단";
  } else if (specialMatch) {
    program = "특강";
    label = specialMatch[1].trim();
    session = specialMatch[2];
    className = specialMatch[3];
  } else if (/(?:저항\s*)?진단/.test(selectedClass)) {
    program = "진단";
    className = "진단";
    session =
      selectedClass.match(/(\d+부)/)?.[1] ||
      String(input.timeSlot || "").match(/(\d+부)/)?.[1] ||
      "1부";
  } else {
    program = "특강";
    className =
      selectedClass.match(/(자유형|평영|접영|배영)/)?.[1] ||
      selectedClass ||
      "특강";
    session =
      selectedClass.match(/(\d+부)/)?.[1] ||
      String(input.timeSlot || "").match(/(\d+부)/)?.[1] ||
      "1부";
  }

  // #{타임} 은 1부/2부만
  session = session.match(/^(\d+부)/)?.[1] || "1부";

  let center = "";
  if (region && region.includes("·")) {
    center = region;
  } else if (label) {
    const regionCode = label.replace(/\s+\d{1,2}\/\d{1,2}$/, "").trim();
    if (regionCode.includes("샤크베이")) {
      center = CENTER_BY_LABEL["샤크베이"];
    } else {
      center = CENTER_BY_LABEL[regionCode] || "";
    }
  }
  if (!center && region) {
    // region 이 이미 schedules center 이거나 부분 문자열인 경우
    const hit = Object.values(CENTER_BY_LABEL).find(
      (c) => c === region || region.includes(c) || c.includes(region),
    );
    center = hit || region;
  }

  const classDateLabel = formatAlimtalkClassDateLabel({
    classDate: input.classDate,
    selectedClass,
  });

  const customerName = String(input.customerName || "").trim();
  const customerPhone = String(input.customerPhone || "")
    .replace(/-/g, "")
    .trim();

  if (!customerName || !customerPhone) {
    throw new AlimtalkTemplateError(
      "알림톡 발송 중단: 고객명 또는 전화번호가 없습니다.",
    );
  }
  if (!center) {
    throw new AlimtalkTemplateError(
      `알림톡 발송 중단: 센터를 확인하지 못했습니다. region="${region}", selectedClass="${selectedClass}"`,
    );
  }

  return {
    center,
    program,
    className,
    session,
    classDateLabel,
    customerName,
    customerPhone,
  };
}

/**
 * 카드 결제 완료 후 예약확정 알림톡
 * - 템플릿: getAlimtalkTemplateCode(center, program)
 * - 전송: 현재 운영 중인 NHN Cloud 알림톡 (환경변수)
 *   (페이지 주석의 '알리고'와 동일 역할 — 템플릿 코드만 설정 파일에서 관리)
 */
export async function sendReservationConfirmAlimtalk(
  input: SendReservationConfirmAlimtalkInput,
): Promise<SendReservationConfirmAlimtalkResult> {
  try {
    const fields = resolveReservationAlimtalkFields(input);
    const templateCode = getAlimtalkTemplateCode(
      fields.center,
      fields.program,
    );

    const appKey = process.env.NHN_APPKEY;
    const secretKey = process.env.NHN_SECRET_KEY;
    const senderKey = process.env.NHN_SENDER_KEY;

    if (!appKey || !secretKey || !senderKey) {
      console.error("[예약확정알림톡] NHN 환경변수 없음 — 발송 중단");
      return {
        success: false,
        error: "NHN Cloud 알림톡 환경변수가 없습니다.",
        templateCode,
        center: fields.center,
        program: fields.program,
      };
    }

    const requestBody = {
      senderKey,
      templateCode,
      recipientList: [
        {
          recipientNo: fields.customerPhone,
          templateParameter: {
            고객명: fields.customerName,
            특강일: fields.classDateLabel,
            장소: fields.center,
            클래스명: fields.className,
            타임: fields.session,
          },
        },
      ],
    };

    console.log("[예약확정알림톡] 발송 요청:", {
      orderId: input.orderId,
      center: fields.center,
      program: fields.program,
      templateCode,
      className: fields.className,
      session: fields.session,
      classDateLabel: fields.classDateLabel,
      phoneSuffix: fields.customerPhone.slice(-4),
    });

    const response = await fetch(
      `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Secret-Key": secretKey,
        },
        body: JSON.stringify(requestBody),
      },
    );

    const result = await response.json().catch(() => ({}));
    console.log(
      "[예약확정알림톡] API 응답:",
      JSON.stringify(result).slice(0, 800),
    );

    if (result?.header?.isSuccessful) {
      console.log("[예약확정알림톡] 발송 성공:", {
        orderId: input.orderId,
        templateCode,
        center: fields.center,
        program: fields.program,
      });
      return {
        success: true,
        templateCode,
        center: fields.center,
        program: fields.program,
      };
    }

    const error =
      result?.header?.resultMessage ||
      result?.message ||
      "예약확정 알림톡 발송 실패";
    console.error("[예약확정알림톡] 발송 실패 — 잘못된 템플릿으로 재시도하지 않음:", {
      orderId: input.orderId,
      templateCode,
      center: fields.center,
      program: fields.program,
      error,
    });
    return {
      success: false,
      error,
      templateCode,
      center: fields.center,
      program: fields.program,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알림톡 발송 중 알 수 없는 오류";
    console.error("[예약확정알림톡] 발송 중단:", {
      orderId: input.orderId,
      error: message,
    });
    return { success: false, error: message };
  }
}
