import "server-only";

import {
  AlimtalkTemplateError,
  resolveAlimtalkTemplateSelection,
  type AlimtalkProgram,
  type AlimtalkTemplateKind,
  type AlimtalkTemplateSelection,
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

/**
 * 특강용 승인 템플릿 본문 (Aligo 등록 문구와 동일)
 * #{…} 만 실제 예약 값으로 치환한다.
 */
export const SPECIAL_RESERVATION_ALIMTALK_TEMPLATE = `🎉 스윔잇 특강 예약 확정 안내

반갑습니다, #{고객명} 회원님!
‘저항 없는 수영’ 스윔잇 특강에 합류하신 것을 환영합니다.

📅 특강일
👉 #{특강일}

📌 예약 확정 클래스
👉 #{장소}
👉 #{클래스명} #{타임}

#{고객명} 회원님께서
오직 수영에만 집중하실 수 있도록
스윔잇이 현장 준비를 모두 마쳤습니다.

━━━━━━━━━━━━━━
📢 필독 가이드 꼭 확인 (중요)
✨ 아래 체크 포인트를 꼭 확인해주세요.
━━━━━━━━━━━━━━

✔ 클래스별 배정 레인 및 클래스 시간
✔ 특강 장소 및 오시는 길
✔ 필수 준비물 체크
✔ 수영장 입장 방법`;

/**
 * 진단용 승인 템플릿 본문 (Aligo UL_0794 등 진단 전용 문구)
 * 특강 문구와 분리 관리.
 */
export const DIAGNOSIS_RESERVATION_ALIMTALK_TEMPLATE = `🎉 스윔잇 진단 예약 확정 안내

반갑습니다, #{고객명} 회원님!
‘저항 없는 수영’ 스윔잇 진단 프로그램에
합류하신 것을 환영합니다.

📅 진단일
👉 #{특강일}

📌 예약 확정 프로그램
👉 #{장소}
👉 #{클래스명} #{타임}

#{고객명} 회원님께서
오직 수영에만 집중하실 수 있도록
스윔잇이 현장 준비를 모두 마쳤습니다.

━━━━━━━━━━━━━━
📢 필독 가이드 꼭 확인 (중요)
✨ 아래 체크 포인트를 꼭 확인해주세요.
━━━━━━━━━━━━━━

✔ 배정 레인 및 시간
✔ 장소 및 오시는 길
✔ 수영장 입장 방법`;

export type ReservationAlimtalkFields = {
  center: string;
  program: AlimtalkProgram;
  className: string;
  session: string;
  /** YYYY-MM-DD 원본 (있으면) */
  date?: string;
  /** "2026년 10월 11일" */
  classDateLabel: string;
  customerName: string;
  customerPhone: string;
};

export type SendCardPaymentReservationAlimtalkInput = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  /** Notion/시트 지역 — schedules center 전체명 권장 */
  region?: string;
  /** enrollment key 예: [은평 9/13] 1부 특강 자유형 */
  selectedClass?: string;
  /** YYYY-MM-DD 권장 */
  classDate?: string;
  timeSlot?: string;
  pageId?: string;
};

export type SendCardPaymentReservationAlimtalkResult =
  | {
      success: true;
      templateCode: string;
      center: string;
      program: AlimtalkProgram;
      messageId?: string;
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

  if (/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$/.test(raw)) {
    return raw.replace(/\s+/g, " ");
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}년 ${Number(iso[2])}월 ${Number(iso[3])}일`;
  }

  const fromKey = String(input.selectedClass || "").match(
    /\[(?:[^\]]*?)\s+(\d{1,2})\/(\d{1,2})\]/,
  );
  if (fromKey) {
    return `2026년 ${Number(fromKey[1])}월 ${Number(fromKey[2])}일`;
  }

  const dotted = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (dotted) {
    const year = Number(dotted[1]);
    if (year >= 2020 && year <= 2100) {
      return `${year}년 ${Number(dotted[2])}월 ${Number(dotted[3])}일`;
    }
  }

  throw new AlimtalkTemplateError(
    `알림톡 특강일 형식 오류: classDate="${raw}", selectedClass="${input.selectedClass || ""}"`,
  );
}

/**
 * orderId 기준 카드결제 주문 필드 → 알림톡 치환용 값
 * (웹훅에서 Notion/enrollment 조회 결과를 넘김)
 */
export function resolveReservationAlimtalkFields(
  input: SendCardPaymentReservationAlimtalkInput,
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

  const dateRaw = String(input.classDate || "").trim();

  return {
    center,
    program,
    className,
    session,
    date: dateRaw || undefined,
    classDateLabel,
    customerName,
    customerPhone,
  };
}

/**
 * tpl_code 에 맞는 승인 문구 선택.
 * - diagnosis 전용 코드 → 진단 문구
 * - special / special fallback → 특강 승인 문구
 *   (진단 주문이라도 "진단 문구 + 특강 tpl_code" 조합 금지)
 */
export function getReservationAlimtalkTemplateBody(
  messageKind: AlimtalkTemplateKind,
): { kind: AlimtalkTemplateKind; body: string } {
  if (messageKind === "diagnosis") {
    return {
      kind: "diagnosis",
      body: DIAGNOSIS_RESERVATION_ALIMTALK_TEMPLATE,
    };
  }
  return {
    kind: "special",
    body: SPECIAL_RESERVATION_ALIMTALK_TEMPLATE,
  };
}

function fillAlimtalkPlaceholders(
  templateBody: string,
  fields: ReservationAlimtalkFields,
): string {
  // 특강 승인 템플릿의 #{클래스명} 은 자유형/평영/접영뿐 아니라
  // fallback 진단 주문의 "진단" 문자열도 동일 자리에 들어가며 구조상 호환됨.
  const message = templateBody
    .replace(/#\{고객명\}/g, fields.customerName)
    .replace(/#\{특강일\}/g, fields.classDateLabel)
    .replace(/#\{장소\}/g, fields.center)
    .replace(/#\{클래스명\}/g, fields.className)
    .replace(/#\{타임\}/g, fields.session);

  const leftover = message.match(/#\{[^}]+\}/g);
  if (leftover?.length) {
    throw new AlimtalkTemplateError(
      `알림톡 message_1 치환 미완료: ${leftover.join(", ")}`,
    );
  }

  if (!message.trim()) {
    throw new AlimtalkTemplateError(
      "알림톡 message_1 생성 실패: 본문이 비어 있습니다.",
    );
  }

  return message;
}

/**
 * 실제 고객/예약 정보로 #{…} 를 모두 치환한 최종 message_1 생성
 * selection.messageKind 기준으로 승인 문구를 고른다 (tpl_code 와 일치).
 */
export function buildAligoReservationMessage(
  fields: ReservationAlimtalkFields,
  selection: AlimtalkTemplateSelection,
): {
  message: string;
  templateKind: AlimtalkTemplateKind;
  fallbackToSpecial: boolean;
} {
  const { kind, body: templateBody } = getReservationAlimtalkTemplateBody(
    selection.messageKind,
  );
  const message = fillAlimtalkPlaceholders(templateBody, fields);

  return {
    message,
    templateKind: kind,
    fallbackToSpecial: selection.fallbackToSpecial,
  };
}

function getAligoEnv() {
  const apikey = process.env.ALIGO_API_KEY?.trim() || "";
  const userid = process.env.ALIGO_USER_ID?.trim() || "";
  const senderkey = process.env.ALIGO_SENDER_KEY?.trim() || "";
  const sender = process.env.ALIGO_SENDER?.trim() || "";
  return { apikey, userid, senderkey, sender };
}

async function createAligoToken(apikey: string, userid: string): Promise<string> {
  const body = new URLSearchParams({ apikey, userid });
  const response = await fetch(
    "https://kakaoapi.aligo.in/akv10/token/create/30/s/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body,
    },
  );
  const result = await response.json().catch(() => ({}));
  if (Number(result?.code) !== 0 || !result?.token) {
    throw new Error(
      `알리고 토큰 발급 실패: code=${result?.code}, message=${result?.message || ""}`,
    );
  }
  return String(result.token);
}

/** subject_1 용 — 템플릿명만 조회 (본문은 로컬 치환본 사용) */
async function fetchAligoTemplateSubject(params: {
  apikey: string;
  userid: string;
  senderkey: string;
  token: string;
  tplCode: string;
}): Promise<string> {
  const body = new URLSearchParams({
    apikey: params.apikey,
    userid: params.userid,
    senderkey: params.senderkey,
    token: params.token,
  });
  const response = await fetch(
    "https://kakaoapi.aligo.in/akv10/template/list/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body,
    },
  );
  const result = await response.json().catch(() => ({}));
  if (Number(result?.code) !== 0 || !Array.isArray(result?.list)) {
    throw new Error(
      `알리고 템플릿 조회 실패: code=${result?.code}, message=${result?.message || ""}`,
    );
  }

  const found = result.list.find(
    (item: { templtCode?: string }) =>
      String(item?.templtCode || "").trim() === params.tplCode,
  );
  if (!found) {
    throw new Error(
      `알리고 템플릿 없음: tpl_code=${params.tplCode} (다른 템플릿으로 fallback 하지 않음)`,
    );
  }

  return (
    String(found.templtName || "").trim() || "스윔잇 예약 확정 안내"
  );
}

/**
 * 카드결제 예약확정 전용 — Aligo만 호출
 * message_1 은 주문 데이터로 치환한 최종 문장만 전송
 */
export async function sendCardPaymentReservationAlimtalk(
  input: SendCardPaymentReservationAlimtalkInput,
): Promise<SendCardPaymentReservationAlimtalkResult> {
  let templateCode = "";
  let center = "";
  let program: AlimtalkProgram | undefined;

  try {
    // 1) orderId 로 조회된 주문/예약 필드 → 치환값
    const fields = resolveReservationAlimtalkFields(input);
    center = fields.center;
    program = fields.program;

    // 2) tpl_code + message 종류 (진단 → special fallback 포함)
    const selection = resolveAlimtalkTemplateSelection(
      fields.center,
      fields.program,
    );
    templateCode = selection.templateCode;

    // 3) selection.messageKind 에 맞는 승인 문구 + 실제 예약값으로 message_1
    const built = buildAligoReservationMessage(fields, selection);
    const message_1 = built.message;
    if (!message_1 || /#\{[^}]+\}/.test(message_1)) {
      throw new AlimtalkTemplateError(
        "알림톡 message_1 이 최종 치환되지 않았습니다. 발송 중단.",
      );
    }

    const { apikey, userid, senderkey, sender } = getAligoEnv();
    if (!apikey || !userid || !senderkey || !sender) {
      console.error("[알리고 예약확정] 실패", {
        orderId: input.orderId,
        templateCode,
        code: "ENV_MISSING",
        message:
          "ALIGO_API_KEY / ALIGO_USER_ID / ALIGO_SENDER_KEY / ALIGO_SENDER 필요",
      });
      return {
        success: false,
        error: "Aligo 환경변수가 없습니다.",
        templateCode,
        center,
        program,
      };
    }

    console.log("[알리고 예약확정] 요청", {
      orderId: input.orderId,
      center: fields.center,
      program: fields.program,
      templateCode,
      templateKind: built.templateKind,
      fallbackToSpecial: built.fallbackToSpecial,
      messageReady: true,
      messageLength: message_1.length,
      hasPlaceholder: false,
    });

    const token = await createAligoToken(apikey, userid);
    const subject_1 = await fetchAligoTemplateSubject({
      apikey,
      userid,
      senderkey,
      token,
      tplCode: templateCode,
    });

    // 4) 최종 치환된 message_1 만 Aligo로 전송 (placeholder 원문 금지)
    const body = new URLSearchParams({
      apikey,
      userid,
      senderkey,
      token,
      tpl_code: templateCode,
      sender,
      receiver_1: fields.customerPhone,
      recvname_1: fields.customerName,
      subject_1,
      message_1,
    });

    const response = await fetch(
      "https://kakaoapi.aligo.in/akv10/alimtalk/send/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
      },
    );
    const result = await response.json().catch(() => ({}));
    const code = Number(result?.code);
    const messageId =
      result?.info?.mid != null
        ? String(result.info.mid)
        : result?.info?.messageId != null
          ? String(result.info.messageId)
          : undefined;

    if (code === 0) {
      console.log("[알리고 예약확정] 성공", {
        orderId: input.orderId,
        templateCode,
        ...(messageId ? { messageId } : {}),
      });
      return {
        success: true,
        templateCode,
        center,
        program,
        messageId,
      };
    }

    console.error("[알리고 예약확정] 실패", {
      orderId: input.orderId,
      templateCode,
      code: result?.code,
      message: result?.message,
    });
    return {
      success: false,
      error: `Aligo 발송 실패: code=${result?.code}, message=${result?.message || ""}`,
      templateCode,
      center,
      program,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알리고 예약확정 발송 중 오류";
    console.error("[알리고 예약확정] 실패", {
      orderId: input.orderId,
      templateCode: templateCode || undefined,
      code: "EXCEPTION",
      message,
    });
    return {
      success: false,
      error: message,
      templateCode: templateCode || undefined,
      center: center || undefined,
      program,
    };
  }
}

/** @deprecated 카드결제 전용 함수명으로 사용하세요 */
export const sendReservationConfirmAlimtalk =
  sendCardPaymentReservationAlimtalk;
