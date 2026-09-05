export const RESISTANCE_CONTENT_CONSENT_VERSION =
  "resistance-content-consent-v1";

export type ResistanceContentConsent = {
  agreed: true;
  agreedAt: string;
  version: typeof RESISTANCE_CONTENT_CONSENT_VERSION;
  className: string;
};

export function isResistanceDiagnosisProduct(input: {
  productType?: string;
  className?: string;
}): boolean {
  return (
    input.productType === "diagnosis" ||
    /(?:저항\s*)?진단/.test(String(input.className || ""))
  );
}
