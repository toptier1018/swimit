/**
 * NHN Cloud 예약확정 알림톡 템플릿
 * - 계좌이체 입금완료 → 예약확정
 * - 카드결제 DONE → 예약확정
 * 입금 안내받기(v1)와 분리.
 *
 * NHN API `templateCode`에는 NHN 템플릿 코드를 넣는다.
 * 카카오 템플릿 코드는 문서·로그 참고용이다.
 */

export type NhnBankConfirmTemplateEntry = {
  special: string;
  diagnosis: string;
  /** 카카오 비즈니스 채널 템플릿 코드 (참고·로그용) */
  kakaoTemplateCode?: string;
};

export const NHN_BANK_CONFIRM_TEMPLATE_CODES = {
  "서울 은평구 · 삼정스포츠 수영장": {
    special: "SWIMIT_EP_V1",
    diagnosis: "SWIMIT_EP_V1",
  },
  "서울 목동 · 목동스포츠센터": {
    special: "SWIMIT_MD_V1",
    diagnosis: "SWIMIT_MD_V1",
  },
  "인천 청라 · 청라스카이스위밍": {
    special: "SWIMIT_CR_V1",
    diagnosis: "SWIMIT_CR_V1",
  },
  "부산 · 조이풀스윔": {
    special: "SWIMIT_BS_V1",
    diagnosis: "SWIMIT_BS_V1",
  },
  /** 은평 12/12 북한산힐스테이트3차 — 삼정(EP)과 분리 */
  "서울 은평 · 북한산힐스테이트3차": {
    special: "SWIMIT_HS_V1",
    diagnosis: "SWIMIT_HS_V1",
    kakaoTemplateCode: "SWIMIT_HS_V1_Ihhs30ird",
  },
  /** 송파 헬스보이짐 — 강남(KM)과 분리 */
  "서울 송파 · 헬스보이짐": {
    special: "SWIMIT_SH_V1",
    diagnosis: "SWIMIT_SH_V1",
    kakaoTemplateCode: "SWIMIT_SH_V1_zhsCdsrPj",
  },
  /** 대구 올스위머 상인점 */
  "대구 · 올스위머 상인점": {
    special: "SWIMIT_DA_V1",
    diagnosis: "SWIMIT_DA_V1",
    kakaoTemplateCode: "SWIMIT_DA_V1_TuD9DsrEY",
  },
  "서울 중구 · 스포빌키즈쿠아": {
    special: "SWIMIT_SPVIL_V1",
    diagnosis: "SWIMIT_SPVIL_V1",
  },
  "경기 동탄 · 스윔스튜디오제이": {
    special: "SWIMIT_DT_V1",
    diagnosis: "SWIMIT_DT_DIAG_V1",
  },
  "경기 동탄 · 샤크베이 1호점": {
    special: "SWIMIT_SHARK_V1",
    diagnosis: "SWIMIT_SHARK_V1",
  },
  "강남 · 와이키키 링크&스윔": {
    special: "SWIMIT_KM_V1",
    diagnosis: "SWIMIT_KM_V1",
    kakaoTemplateCode: "SWIMIT_KM_V1_XuIzbdWv3",
  },
  "수원·화성": {
    special: "SWIMIT_SUWON_V1",
    diagnosis: "SWIMIT_SUWON_V1",
  },
  김포: {
    special: "SWIMIT_GIMPO_V1",
    diagnosis: "SWIMIT_GIMPO_V1",
  },
} as const satisfies Record<string, NhnBankConfirmTemplateEntry>;

export type NhnBankConfirmProgram = "특강" | "진단";

export class NhnBankConfirmTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NhnBankConfirmTemplateError";
  }
}

function isDiagnosisProgram(program: string, className: string): boolean {
  const p = String(program || "");
  const c = String(className || "");
  return (
    p === "진단" ||
    p.includes("진단") ||
    c === "진단" ||
    c.includes("진단")
  );
}

type TemplatePick = {
  templateCode: string;
  program: NhnBankConfirmProgram;
  centerKey: string;
  kakaoTemplateCode?: string;
};

function pickFromEntry(
  centerKey: string,
  entry: NhnBankConfirmTemplateEntry,
  program: NhnBankConfirmProgram,
  rawCenter: string,
): TemplatePick {
  const templateCode =
    program === "진단" ? entry.diagnosis : entry.special;
  if (!templateCode?.trim()) {
    throw new NhnBankConfirmTemplateError(
      `NHN 예약확정 템플릿 코드가 비어 있습니다. center="${centerKey}"`,
    );
  }
  const pick: TemplatePick = {
    templateCode: templateCode.trim(),
    program,
    centerKey,
    ...(entry.kakaoTemplateCode
      ? { kakaoTemplateCode: entry.kakaoTemplateCode }
      : {}),
  };
  console.log("[NHN입금확정템플릿] 선택", {
    center: rawCenter,
    ...pick,
  });
  return pick;
}

/**
 * 짧은 지역명·공백 차이로 잘못된 템플릿이 잡히지 않도록
 * 장소 고유 키워드를 먼저 본다. (송파≠강남, 힐스테이트≠삼정)
 */
function resolveByVenueKeyword(
  center: string,
  program: NhnBankConfirmProgram,
): TemplatePick | null {
  // 송파 헬스보이짐 — 강남 KM 절대 사용 금지
  if (
    center.includes("헬스보이") ||
    (center.includes("송파") && !center.includes("강남") && !center.includes("와이키키"))
  ) {
    return pickFromEntry(
      "서울 송파 · 헬스보이짐",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["서울 송파 · 헬스보이짐"],
      program,
      center,
    );
  }

  // 대구 올스위머
  if (center.includes("올스위머") || center.includes("대구")) {
    return pickFromEntry(
      "대구 · 올스위머 상인점",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["대구 · 올스위머 상인점"],
      program,
      center,
    );
  }

  // 은평 힐스테이트 (삼정 EP와 분리)
  if (center.includes("힐스테이트") || center.includes("북한산")) {
    return pickFromEntry(
      "서울 은평 · 북한산힐스테이트3차",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["서울 은평 · 북한산힐스테이트3차"],
      program,
      center,
    );
  }

  // 은평 삼정 (구 센터)
  if (center.includes("삼정")) {
    return pickFromEntry(
      "서울 은평구 · 삼정스포츠 수영장",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["서울 은평구 · 삼정스포츠 수영장"],
      program,
      center,
    );
  }

  // 강남 와이키키 — 송파와 분리 유지
  if (center.includes("강남") || center.includes("와이키키")) {
    return pickFromEntry(
      "강남 · 와이키키 링크&스윔",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["강남 · 와이키키 링크&스윔"],
      program,
      center,
    );
  }

  if (center.includes("김포")) {
    return pickFromEntry(
      "김포",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["김포"],
      program,
      center,
    );
  }

  if (center.includes("수원") || center.includes("화성")) {
    return pickFromEntry(
      "수원·화성",
      NHN_BANK_CONFIRM_TEMPLATE_CODES["수원·화성"],
      program,
      center,
    );
  }

  return null;
}

/**
 * 운영 시트 O열(장소) + 프로그램 → NHN 예약확정 템플릿 코드
 */
export function getNhnBankConfirmTemplateCode(input: {
  center: string;
  program?: string;
  className?: string;
}): TemplatePick {
  const center = String(input.center || "").trim();
  if (!center) {
    throw new NhnBankConfirmTemplateError(
      "NHN 예약확정 템플릿 선택 실패: 장소(center)가 비어 있습니다.",
    );
  }

  const program: NhnBankConfirmProgram = isDiagnosisProgram(
    input.program || "",
    input.className || "",
  )
    ? "진단"
    : "특강";

  // 1) 정확한 센터 키
  const exact =
    NHN_BANK_CONFIRM_TEMPLATE_CODES[
      center as keyof typeof NHN_BANK_CONFIRM_TEMPLATE_CODES
    ];
  if (exact) {
    return pickFromEntry(center, exact, program, center);
  }

  // 2) 장소 고유 키워드 (짧은 '은평' 등보다 우선)
  const byKeyword = resolveByVenueKeyword(center, program);
  if (byKeyword) return byKeyword;

  // 3) 등록 키 부분 일치 — 짧은 지역명만으로 매칭하지 않음
  //    (예: center="은평" → 삼정/힐스 중 임의 선택 금지)
  const candidates = Object.entries(NHN_BANK_CONFIRM_TEMPLATE_CODES).filter(
    ([key]) => key !== "김포" && key !== "수원·화성",
  );
  // 긴 키부터 매칭해 더 구체적인 센터를 우선
  candidates.sort((a, b) => b[0].length - a[0].length);

  for (const [key, codes] of candidates) {
    if (center.includes(key) || key.includes(center)) {
      // 지역 접두어만 겹치는 경우 차단 (예: "은평" ⊆ 두 은평 센터)
      const centerIsShortRegion =
        !center.includes("·") &&
        !center.includes("헬스보이") &&
        !center.includes("올스위머") &&
        !center.includes("힐스테이트") &&
        !center.includes("삼정") &&
        center.length <= 4;
      if (centerIsShortRegion) {
        continue;
      }
      return pickFromEntry(key, codes, program, center);
    }
  }

  throw new NhnBankConfirmTemplateError(
    `NHN 예약확정 템플릿 선택 실패: 등록되지 않은 장소입니다. center="${center}"`,
  );
}
