/**
 * 스윔잇 예약확정 알림톡 템플릿 코드
 *
 * 규칙:
 * - 클래스(영법)별이 아니라 "센터 + 프로그램" 기준
 * - special: 해당 센터의 모든 특강(자유형/평영/접영 등)
 * - diagnosis: 해당 센터의 진단 프로그램
 *
 * 진단 fallback:
 * - diagnosis 코드가 있고 special 과 다르면 → diagnosis
 * - diagnosis 없거나 special 과 동일 → special (발송 중단하지 않음)
 *
 * 앞으로 템플릿 코드를 바꿀 때는 이 파일만 수정하면 됩니다.
 * /api/schedules 의 center 문자열과 키가 정확히 일치해야 합니다.
 */

export const ALIMTALK_TEMPLATE_CODES = {
  "서울 은평구 · 삼정스포츠 수영장": {
    special: "UL_0787",
    diagnosis: "UL_0787",
  },

  "서울 목동 · 목동스포츠센터": {
    special: "UL_0784",
    diagnosis: "UL_0784",
  },

  "인천 청라 · 청라스카이스위밍": {
    special: "UL_0788",
    diagnosis: "UL_0788",
  },

  "부산 · 조이풀스윔": {
    special: "UL_0791",
    diagnosis: "UL_0791",
  },

  "서울 중구 · 스포빌키즈쿠아": {
    special: "UL_0848",
    diagnosis: "UL_0848",
  },

  "경기 동탄 · 스윔스튜디오제이": {
    special: "UL_0790",
    diagnosis: "UL_0794",
  },

  "경기 동탄 · 샤크베이 1호점": {
    special: "UL_0795",
    diagnosis: "UL_0795",
  },
} as const;

export type AlimtalkCenter = keyof typeof ALIMTALK_TEMPLATE_CODES;
export type AlimtalkProgram = "특강" | "진단";
export type AlimtalkTemplateKind = "special" | "diagnosis";

export class AlimtalkTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlimtalkTemplateError";
  }
}

export type AlimtalkTemplateSelection = {
  center: string;
  program: AlimtalkProgram;
  /** 실제 발송에 쓸 tpl_code */
  templateCode: string;
  /** message_1 에 쓸 승인 문구 종류 (tpl_code 와 반드시 일치) */
  messageKind: AlimtalkTemplateKind;
  /** 진단인데 special 코드/문구로 보낸 경우 */
  fallbackToSpecial: boolean;
};

function isDiagnosisProgram(program: string): boolean {
  const programKey = String(program || "").trim();
  return (
    programKey === "진단" ||
    programKey.includes("진단") ||
    programKey.toLowerCase() === "diagnosis"
  );
}

/**
 * 센터 + 프로그램 → tpl_code + message 종류 + fallback 여부
 *
 * 우선순위:
 * - 특강 → special
 * - 진단 + diagnosis 있고 special 과 다름 → diagnosis
 * - 진단 + diagnosis 없거나 special 과 동일 → special fallback
 */
export function resolveAlimtalkTemplateSelection(
  center: string,
  program: string,
): AlimtalkTemplateSelection {
  const centerKey = String(center || "").trim();
  const programKey = String(program || "").trim();

  if (!centerKey) {
    throw new AlimtalkTemplateError(
      "알림톡 템플릿 선택 실패: 센터명이 비어 있습니다.",
    );
  }

  const templates =
    ALIMTALK_TEMPLATE_CODES[centerKey as AlimtalkCenter];
  if (!templates) {
    throw new AlimtalkTemplateError(
      `알림톡 템플릿 선택 실패: 등록되지 않은 센터입니다. center="${centerKey}"`,
    );
  }

  const specialCode = String(templates.special || "").trim();
  if (!specialCode) {
    throw new AlimtalkTemplateError(
      `알림톡 템플릿 선택 실패: special 템플릿 코드가 비어 있습니다. center="${centerKey}"`,
    );
  }

  const resolvedProgram: AlimtalkProgram = isDiagnosisProgram(programKey)
    ? "진단"
    : "특강";

  if (resolvedProgram !== "진단") {
    const selection: AlimtalkTemplateSelection = {
      center: centerKey,
      program: "특강",
      templateCode: specialCode,
      messageKind: "special",
      fallbackToSpecial: false,
    };
    console.log("[알림톡템플릿] 선택", selection);
    return selection;
  }

  const diagnosisCode = String(templates.diagnosis || "").trim();
  const hasDedicatedDiagnosis =
    Boolean(diagnosisCode) && diagnosisCode !== specialCode;

  if (hasDedicatedDiagnosis) {
    const selection: AlimtalkTemplateSelection = {
      center: centerKey,
      program: "진단",
      templateCode: diagnosisCode,
      messageKind: "diagnosis",
      fallbackToSpecial: false,
    };
    console.log("[알림톡템플릿] 선택", selection);
    return selection;
  }

  // 진단이지만 diagnosis 없거나 special 과 동일 → special fallback (발송 중단하지 않음)
  const selection: AlimtalkTemplateSelection = {
    center: centerKey,
    program: "진단",
    templateCode: specialCode,
    messageKind: "special",
    fallbackToSpecial: true,
  };
  console.log("[알림톡템플릿] 선택", selection);
  return selection;
}

/**
 * 센터 + 프로그램으로 예약확정 알림톡 템플릿 코드를 고른다.
 * 진단은 전용 코드가 없으면 special 로 fallback 한다.
 */
export function getAlimtalkTemplateCode(
  center: string,
  program: string,
): string {
  return resolveAlimtalkTemplateSelection(center, program).templateCode;
}
