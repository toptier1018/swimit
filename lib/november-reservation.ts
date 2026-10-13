import {
  CLASS_SCHEDULES,
  DEFAULT_CAPACITY_BY_CLASS,
  getClassScheduleLabel,
  isStartTurnEnrollmentKey,
  matchesSpecialClassOption,
  resolveClassScheduleFromEnrollmentKey,
} from "./class-schedule-data";

/** 정식 오픈(결제 가능) 시작 — 2026-10-13 00:00 KST */
export const NOVEMBER_PAID_OPEN_START = Date.parse(
  "2026-10-13T00:00:00+09:00",
);
/** 한정 할인 종료(=정상가) — 2026-10-16 00:00 KST */
export const NOVEMBER_BENEFIT_END = Date.parse("2026-10-16T00:00:00+09:00");
export const NOVEMBER_BENEFIT_AMOUNT = 5000;
/** 시트「예약 혜택」컬럼 값 */
export const NOVEMBER_BENEFIT_NAME = "11월 오픈 혜택";

export function isNovemberSchedule(
  schedule?: { year: number; month: number } | null,
) {
  return schedule?.year === 2026 && schedule.month === 11;
}

/**
 * 우선예약(결제 없음) 기간 — 10/13 0시 미만만.
 * 10/13부터는 절대 우선예약으로 되돌리지 않는다.
 */
export function isNovemberAdvanceReservationOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isNovemberSchedule(schedule) && now < NOVEMBER_PAID_OPEN_START;
}

/** 11월 일정 정식 오픈(결제 가능) — 10/13 0시부터 계속 */
export function isNovemberPaidOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isNovemberSchedule(schedule) && now >= NOVEMBER_PAID_OPEN_START;
}

/**
 * 10/13~10/15 한정 5,000원 오픈 할인 기간.
 * 10/16 0시부터 false → 정상가.
 */
export function hasNovemberOpenDiscount(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return (
    isNovemberSchedule(schedule) &&
    now >= NOVEMBER_PAID_OPEN_START &&
    now < NOVEMBER_BENEFIT_END
  );
}

/** @deprecated 호환 — 오픈 한정 할인과 동일 */
export function hasNovemberBenefit(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return hasNovemberOpenDiscount(schedule, now);
}

/** 진단 제외 · 특강/스타트/장거리 집중만 할인 */
export function isNovemberDiscountEligibleClass(className: string): boolean {
  const name = String(className || "").trim();
  if (!name) return false;
  if (/진단/.test(name)) return false;

  const resolved = resolveClassScheduleFromEnrollmentKey(name);
  if (!resolved?.schedule || !isNovemberSchedule(resolved.schedule)) {
    return false;
  }

  if (isStartTurnEnrollmentKey(name)) return true;

  if (
    resolved.schedule.specialClass &&
    matchesSpecialClassOption(name, resolved.schedule.specialClass)
  ) {
    return true;
  }

  if (
    /^\[[^\]]+\]\s+\d+부\s*특강\s+(자유형|평영|접영)$/.test(name) ||
    /^\[[^\]]+\]\s+\d+부\s*특강\s+스타트$/.test(name)
  ) {
    return true;
  }

  return false;
}

export type NovemberOpenBenefit = {
  originalAmount: number;
  discountAmount: number;
  expectedAmount: number;
  benefitName: string;
  reservedAt: string;
};

/** 정상가 기준 오픈 할인 정보 (해당 없으면 null) */
export function resolveNovemberOpenBenefit(
  className: string,
  originalAmount: number,
  now = Date.now(),
): NovemberOpenBenefit | null {
  const resolved = resolveClassScheduleFromEnrollmentKey(className);
  if (!resolved?.schedule) return null;
  if (!hasNovemberOpenDiscount(resolved.schedule, now)) return null;
  if (!isNovemberDiscountEligibleClass(className)) return null;
  if (!Number.isFinite(originalAmount) || originalAmount <= NOVEMBER_BENEFIT_AMOUNT) {
    return null;
  }

  const benefit: NovemberOpenBenefit = {
    originalAmount,
    discountAmount: NOVEMBER_BENEFIT_AMOUNT,
    expectedAmount: originalAmount - NOVEMBER_BENEFIT_AMOUNT,
    benefitName: NOVEMBER_BENEFIT_NAME,
    reservedAt: new Date(now).toISOString(),
  };
  console.log("[11월오픈혜택] 할인 적용", {
    className,
    ...benefit,
  });
  return benefit;
}

/**
 * 우선예약 API용 (10/13 이전만).
 * 10/13 이후에는 null — 일반 결제 플로우만 사용.
 */
export function resolveNovemberReservation(
  classId: number,
  classKey: string,
  now = Date.now(),
) {
  const schedule = CLASS_SCHEDULES.find((item) => item.id === classId);
  if (!schedule || !isNovemberSchedule(schedule)) return null;

  if (!isNovemberAdvanceReservationOpen(schedule, now)) {
    console.log("[11월우선예약] 기간 종료 — 정식 오픈/결제 플로우", {
      classId,
      classKey,
      paidOpenFrom: new Date(NOVEMBER_PAID_OPEN_START).toISOString(),
    });
    return null;
  }

  const prefix = `[${getClassScheduleLabel(schedule)}] 1부 특강 `;
  if (
    !classKey.startsWith(prefix) ||
    !Object.hasOwn(DEFAULT_CAPACITY_BY_CLASS, classKey)
  ) {
    return null;
  }
  const stroke = classKey.slice(prefix.length);
  if (!["자유형", "평영", "접영"].includes(stroke)) return null;

  const startHour = schedule.id === 25 ? "16" : "14";
  if (
    now >=
    Date.parse(
      `2026-11-${String(schedule.dateNum).padStart(2, "0")}T${startHour}:00:00+09:00`,
    )
  ) {
    return null;
  }

  const originalAmount = schedule.specialClass?.price ?? 80000;
  return {
    schedule,
    stroke,
    originalAmount,
    discountAmount: NOVEMBER_BENEFIT_AMOUNT,
    expectedAmount: originalAmount - NOVEMBER_BENEFIT_AMOUNT,
    benefitName: NOVEMBER_BENEFIT_NAME,
    reservedAt: new Date(now).toISOString(),
  };
}
