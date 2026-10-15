/** 시트 클래스 열에는 이름만 저장한다. 정원 키는 별도로 유지한다. */
export function toClassSheetLabel(value: string): string {
  const label = value.trim().replace(/^\[[^\]]+\]\s*\d+부\s*(?:특강\s*)?/, "").trim();
  return /^스타트(?:·턴|$)/.test(label) ? "스타트" : label;
}
