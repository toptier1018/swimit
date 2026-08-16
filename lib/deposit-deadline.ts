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
