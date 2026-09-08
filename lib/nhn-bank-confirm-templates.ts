/**
 * 계좌이체(입금완료) → 예약확정 NHN 알림톡 템플릿
 * 카드결제 Aligo 템플릿과 분리. 입금 안내받기(v1)와도 분리.
 */

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
  "수원·화성": {
    special: "SWIMIT_SUWON_V1",
    diagnosis: "SWIMIT_SUWON_V1",
  },
  김포: {
    special: "SWIMIT_GIMPO_V1",
    diagnosis: "SWIMIT_GIMPO_V1",
  },
} as const;

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

/**
 * 운영 시트 O열(장소) + 프로그램 → NHN 예약확정 템플릿 코드
 */
export function getNhnBankConfirmTemplateCode(input: {
  center: string;
  program?: string;
  className?: string;
}): { templateCode: string; program: NhnBankConfirmProgram; centerKey: string } {
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

  const exact =
    NHN_BANK_CONFIRM_TEMPLATE_CODES[
      center as keyof typeof NHN_BANK_CONFIRM_TEMPLATE_CODES
    ];
  if (exact) {
    const templateCode =
      program === "진단" ? exact.diagnosis : exact.special;
    if (!templateCode?.trim()) {
      throw new NhnBankConfirmTemplateError(
        `NHN 예약확정 템플릿 코드가 비어 있습니다. center="${center}"`,
      );
    }
    console.log("[NHN입금확정템플릿] 선택", {
      center,
      centerKey: center,
      program,
      templateCode,
    });
    return { templateCode: templateCode.trim(), program, centerKey: center };
  }

  // 별칭: 김포 / 수원·화성 (시트 장소 문자열이 약간 달라도 허용)
  if (center.includes("김포")) {
    const templateCode =
      NHN_BANK_CONFIRM_TEMPLATE_CODES["김포"].special;
    console.log("[NHN입금확정템플릿] 선택", {
      center,
      centerKey: "김포",
      program,
      templateCode,
    });
    return { templateCode, program, centerKey: "김포" };
  }

  if (center.includes("수원") || center.includes("화성")) {
    const templateCode =
      NHN_BANK_CONFIRM_TEMPLATE_CODES["수원·화성"].special;
    console.log("[NHN입금확정템플릿] 선택", {
      center,
      centerKey: "수원·화성",
      program,
      templateCode,
    });
    return { templateCode, program, centerKey: "수원·화성" };
  }

  // 부분 일치 (등록 센터 키)
  for (const [key, codes] of Object.entries(NHN_BANK_CONFIRM_TEMPLATE_CODES)) {
    if (key === "김포" || key === "수원·화성") continue;
    if (center.includes(key) || key.includes(center)) {
      const templateCode =
        program === "진단" ? codes.diagnosis : codes.special;
      console.log("[NHN입금확정템플릿] 선택", {
        center,
        centerKey: key,
        program,
        templateCode,
      });
      return { templateCode, program, centerKey: key };
    }
  }

  throw new NhnBankConfirmTemplateError(
    `NHN 예약확정 템플릿 선택 실패: 등록되지 않은 장소입니다. center="${center}"`,
  );
}
