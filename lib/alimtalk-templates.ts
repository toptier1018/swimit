/**
 * 스윔잇 예약확정 알림톡 템플릿 코드
 *
 * 규칙:
 * - 클래스(영법)별이 아니라 "센터 + 프로그램" 기준
 * - special: 해당 센터의 모든 특강(자유형/평영/접영 등)
 * - diagnosis: 해당 센터의 진단 프로그램
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

export class AlimtalkTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlimtalkTemplateError";
  }
}

/**
 * 센터 + 프로그램으로 예약확정 알림톡 템플릿 코드를 고른다.
 * - 미등록 센터 / 빈 코드 → 오류 (다른 센터로 fallback 금지)
 */
export function getAlimtalkTemplateCode(
  center: string,
  program: string,
): string {
  const centerKey = String(center || "").trim();
  const programKey = String(program || "").trim();

  if (!centerKey) {
    throw new AlimtalkTemplateError(
      "알림톡 템플릿 선택 실패: 센터명이 비어 있습니다.",
    );
  }

  const config =
    ALIMTALK_TEMPLATE_CODES[centerKey as AlimtalkCenter];
  if (!config) {
    throw new AlimtalkTemplateError(
      `알림톡 템플릿 선택 실패: 등록되지 않은 센터입니다. center="${centerKey}"`,
    );
  }

  const isDiagnosis =
    programKey === "진단" ||
    programKey.includes("진단") ||
    programKey.toLowerCase() === "diagnosis";

  const templateCode = isDiagnosis ? config.diagnosis : config.special;
  const kind = isDiagnosis ? "diagnosis" : "special";

  if (!templateCode || !String(templateCode).trim()) {
    throw new AlimtalkTemplateError(
      `알림톡 템플릿 선택 실패: 빈 템플릿 코드입니다. center="${centerKey}", program="${programKey}", kind=${kind}`,
    );
  }

  console.log("[알림톡템플릿] 선택:", {
    center: centerKey,
    program: isDiagnosis ? "진단" : "특강",
    kind,
    templateCode,
  });

  return String(templateCode).trim();
}
