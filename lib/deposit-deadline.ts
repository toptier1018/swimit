/**
 * 무통장 입금기한 (익일 14:00 KST) — 클라이언트/서버 공용
 */

/** 접수 시각 기준, 서울 달력 익일 14:00 */
export function getBankTransferDeadlineKst(from: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  probe.setUTCDate(probe.getUTCDate() + 1);
  // 14:00 KST = 05:00 UTC
  return new Date(
    Date.UTC(
      probe.getUTCFullYear(),
      probe.getUTCMonth(),
      probe.getUTCDate(),
      5,
      0,
      0,
    ),
  );
}

/** 시트 표기: 2026. 8. 16 오후 2:00:00 */
export function formatOpsSheetDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute").padStart(2, "0");
  const second = get("second").padStart(2, "0");
  const dayPeriod = get("dayPeriod").toLowerCase().includes("pm")
    ? "오후"
    : "오전";

  return `${year}. ${month}. ${day} ${dayPeriod} ${hour}:${minute}:${second}`;
}

export function formatBankTransferDeadline(from: Date = new Date()): string {
  return formatOpsSheetDateTime(getBankTransferDeadlineKst(from));
}

/** 입금 안내 알림톡 #{입금기한} 표기: 2026년 10월 12일 오후 2시 00분 */
export function formatAlimtalkDepositDeadline(from: Date = new Date()): string {
  const formatted = formatBankTransferDeadline(from);
  const matched = formatted.match(
    /(\d+)\.\s*(\d+)\.\s*(\d+)\s*(오전|오후)\s*(\d+):(\d+)/,
  );
  if (!matched) return formatted;
  return `${matched[1]}년 ${matched[2]}월 ${matched[3]}일 ${matched[4]} ${matched[5]}시 ${matched[6]}분`;
}
