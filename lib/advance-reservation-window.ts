/**
 * 사전예약 공용 결제 기간 — 매월 자동 반복 (Asia/Seoul)
 * 13일 00:00:00 ~ 15일 23:59:59 (달력 일 기준 day 13~15)
 * 결제 대상 일정 = 다음 달
 */

export const ADVANCE_PAY_TIMEZONE = "Asia/Seoul";
export const ADVANCE_PAY_WINDOW_START_DAY = 13;
export const ADVANCE_PAY_WINDOW_END_DAY = 15;

export const ADVANCE_PAY_CLOSED_MESSAGE =
  "이번 달 사전예약 결제 기간이 종료되었습니다.\n\n사전예약 결제는 매월 13일~15일에 진행됩니다.";

export type KstDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** 서버·클라이언트 공용: Asia/Seoul 달력 시각 분해 */
export function getKstDateParts(now = Date.now()): KstDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ADVANCE_PAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));

  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value || 0);

  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
    minute: num("minute"),
    second: num("second"),
  };
}

/** 매월 13~15일(KST)만 true — 하드코딩된 연·월 없음 */
export function isAdvanceReservationPayWindowOpen(now = Date.now()): boolean {
  const { day } = getKstDateParts(now);
  return (
    day >= ADVANCE_PAY_WINDOW_START_DAY && day <= ADVANCE_PAY_WINDOW_END_DAY
  );
}

/** 결제 창 동안 보여줄 대상 일정 = 다음 달 */
export function getAdvancePayTargetYearMonth(now = Date.now()): {
  year: number;
  month: number;
} {
  const { year, month } = getKstDateParts(now);
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

export function formatAdvancePayWindowLabel(now = Date.now()): string {
  const { year, month } = getKstDateParts(now);
  return `${year}년 ${month}월 ${ADVANCE_PAY_WINDOW_START_DAY}일~${ADVANCE_PAY_WINDOW_END_DAY}일`;
}

export function getAdvanceReservationPayWindowStatus(now = Date.now()) {
  const kst = getKstDateParts(now);
  const open = isAdvanceReservationPayWindowOpen(now);
  const target = getAdvancePayTargetYearMonth(now);
  const status = {
    open,
    timezone: ADVANCE_PAY_TIMEZONE,
    kst: {
      year: kst.year,
      month: kst.month,
      day: kst.day,
    },
    windowLabel: formatAdvancePayWindowLabel(now),
    targetYear: target.year,
    targetMonth: target.month,
    targetLabel: `${target.year}년 ${target.month}월`,
    message: open ? "" : ADVANCE_PAY_CLOSED_MESSAGE,
  };
  console.log("[사전예약결제기간]", {
    open: status.open,
    kst: status.kst,
    target: status.targetLabel,
    window: status.windowLabel,
  });
  return status;
}
