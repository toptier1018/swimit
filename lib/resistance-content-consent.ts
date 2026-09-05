export const CLASS_VIDEO_CONSENT_VERSION = "class-video-consent-v2" as const;
export const RESISTANCE_VIDEO_CONSENT_VERSION =
  "resistance-video-content-consent-v2" as const;
export const RESISTANCE_PAYMENT_CONSENT_VERSION =
  "resistance-payment-content-consent-v1" as const;
export const LEGACY_RESISTANCE_CONTENT_CONSENT_VERSION =
  "resistance-content-consent-v1" as const;

/** 진단 결제 직전 최종 확인. 예전 값도 읽기만 허용한다. */
export const RESISTANCE_CONTENT_CONSENT_VERSION =
  RESISTANCE_PAYMENT_CONSENT_VERSION;

export type VideoConsentKind = "class" | "resistance";

export type VideoConsentVersion =
  | typeof CLASS_VIDEO_CONSENT_VERSION
  | typeof RESISTANCE_VIDEO_CONSENT_VERSION
  | typeof RESISTANCE_PAYMENT_CONSENT_VERSION
  | typeof LEGACY_RESISTANCE_CONTENT_CONSENT_VERSION;

export type ContentConsent = {
  agreed: true;
  agreedAt: string;
  version: VideoConsentVersion;
  className: string;
  formVersion?: VideoConsentVersion;
};

/** @deprecated ContentConsent와 동일. 기존 import 호환용 */
export type ResistanceContentConsent = ContentConsent;

const ALL_CONSENT_VERSIONS: readonly VideoConsentVersion[] = [
  CLASS_VIDEO_CONSENT_VERSION,
  RESISTANCE_VIDEO_CONSENT_VERSION,
  RESISTANCE_PAYMENT_CONSENT_VERSION,
  LEGACY_RESISTANCE_CONTENT_CONSENT_VERSION,
];

export const VIDEO_PRIVACY_BULLETS = [
  "얼굴은 블러 처리합니다.",
  "이름 및 연락처는 공개하지 않습니다.",
  "문신 등 개인을 특정할 수 있는 특징은 필요 시 추가 블러 처리합니다.",
  "개인을 특정할 수 있는 음성 및 정보는 제거합니다.",
] as const;

export type VideoConsentCopy = {
  kind: VideoConsentKind;
  itemTitle: string;
  modalTitle: string;
  summary: string;
  intro: string[];
  purposes?: string[];
  outro: string[];
  closing: string;
};

export const VIDEO_CONSENT_COPY: Record<VideoConsentKind, VideoConsentCopy> = {
  class: {
    kind: "class",
    itemTitle: "수영 강의 영상 촬영 및 활용 동의",
    modalTitle: "수영 강의 영상 촬영 및 활용 안내",
    summary: "얼굴은 블러 처리하며, 이름과 연락처는 공개하지 않습니다.",
    intro: [
      "스윔잇 특강은 회원님의 현재 수영 자세를 확인하고 더 정확한 피드백을 제공하기 위해 수중·수면 영상 촬영을 진행합니다.",
      "촬영된 영상은 회원님의 자세 분석, 수업 피드백 및 스윔잇의 수영 교육 자료 제작에 활용될 수 있습니다.",
    ],
    outro: [
      "촬영 영상의 일부는 비슷한 수영 고민을 가진 분들에게 도움이 되는 교육 콘텐츠 및 스윔잇 프로그램 소개 자료로 활용될 수 있습니다.",
      "활용 매체에는 스윔잇 공식 인스타그램, 유튜브, 네이버 카페·블로그, 홈페이지, 카카오톡 채널 및 온라인 콘텐츠 등이 포함될 수 있습니다.",
      "촬영 영상은 필요한 부분을 편집하거나 자막, 슬로모션, 동작 비교 등의 방식으로 가공될 수 있습니다.",
    ],
    closing: "위 내용을 확인하였으며 수영 강의 영상 촬영 및 활용에 동의합니다.",
  },
  resistance: {
    kind: "resistance",
    itemTitle: "저항 진단 촬영 및 콘텐츠 활용 동의",
    modalTitle: "저항 진단 촬영 및 콘텐츠 활용 안내",
    summary: "얼굴은 블러 처리하며, 이름과 연락처는 공개하지 않습니다.",
    intro: [
      "저항 진단 프로그램은 회원님의 수영 모습을 수중·수면에서 촬영하고 분석하는 프로그램입니다.",
      "촬영 영상의 일부는 스윔잇의 수영 교육 콘텐츠 및 저항 진단 프로그램 소개를 위해 활용될 수 있습니다.",
    ],
    purposes: [
      "회원님의 수영 자세 및 저항 분석",
      "저항 진단 리포트 및 피드백 제공",
      "수영 교육 콘텐츠 제작",
      "실제 저항 사례 및 수강 사례 소개",
      "스윔잇 저항 진단 프로그램 및 특강 소개",
    ],
    outro: [
      "활용 매체에는 스윔잇 공식 인스타그램, 유튜브, 네이버 카페·블로그, 홈페이지, 카카오톡 채널 및 온라인 콘텐츠 등이 포함될 수 있습니다.",
      "촬영 영상은 필요한 부분을 편집하거나 자막, 슬로모션, 비교 화면, 저항 포인트 표시 등의 방식으로 가공될 수 있습니다.",
      "저항 진단 프로그램은 위와 같은 촬영 및 콘텐츠 활용 내용을 포함하여 운영됩니다.",
    ],
    closing: "위 내용을 확인하였으며 저항 진단 촬영 및 콘텐츠 활용에 동의합니다.",
  },
};

export function getVideoConsentKind(input: {
  productType?: string | null;
  className?: string | null;
}): VideoConsentKind {
  return isResistanceDiagnosisProduct(input) ? "resistance" : "class";
}

export function getVideoConsentCopy(kind: VideoConsentKind): VideoConsentCopy {
  return VIDEO_CONSENT_COPY[kind];
}

export function isResistanceDiagnosisProduct(input: {
  productType?: string | null;
  className?: string | null;
}): boolean {
  return (
    input.productType === "diagnosis" ||
    /(?:저항\s*)?진단|어항샷/.test(String(input.className || ""))
  );
}

export function isContentConsentVersion(
  value: unknown,
): value is VideoConsentVersion {
  return (
    typeof value === "string" &&
    (ALL_CONSENT_VERSIONS as readonly string[]).includes(value)
  );
}

export function isDiagnosisPaymentConsentVersion(value: unknown): boolean {
  return (
    value === RESISTANCE_PAYMENT_CONSENT_VERSION ||
    value === LEGACY_RESISTANCE_CONTENT_CONSENT_VERSION
  );
}

export function parseContentConsent(
  raw: unknown,
  expectedClassName?: string,
): ContentConsent | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.agreed !== true) return null;
  if (
    typeof data.agreedAt !== "string" ||
    !Number.isFinite(Date.parse(data.agreedAt))
  ) {
    return null;
  }
  if (!isContentConsentVersion(data.version)) return null;
  if (typeof data.className !== "string" || !data.className.trim()) return null;
  if (expectedClassName && data.className !== expectedClassName) return null;

  return {
    agreed: true,
    agreedAt: data.agreedAt,
    version: data.version,
    className: data.className,
    formVersion: isContentConsentVersion(data.formVersion)
      ? data.formVersion
      : undefined,
  };
}
