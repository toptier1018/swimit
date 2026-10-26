/** 시트 클래스 열에는 이름만 저장한다. 정원 키는 별도로 유지한다. */
export function toClassSheetLabel(value: string): string {
  const label = value
    .trim()
    .replace(/^\[[^\]]+\]\s*\d+부\s*(?:특강\s*)?/, "")
    .trim();
  if (/^스타트(?:·턴|$)/.test(label)) return "스타트";
  // 「자유형 장거리 집중반」→「자유형」 (화면 표시명과 분리)
  const intensiveStroke = label.match(
    /^(자유형|평영|접영)\s*(?:장거리\s*)?집중반/,
  )?.[1];
  if (intensiveStroke) {
    console.log("[시트클래스명] 집중반→영법만:", {
      from: label,
      to: intensiveStroke,
    });
    return intensiveStroke;
  }
  return label;
}
