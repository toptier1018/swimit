import {
  CLASS_SCHEDULES,
  DEFAULT_CAPACITY_BY_CLASS,
  getClassScheduleLabel,
  isDiagnosisEnrollmentKey,
  isStartTurnEnrollmentKey,
  matchesSpecialClassOption,
  resolveClassScheduleFromEnrollmentKey,
} from "./class-schedule-data";

/**
 * 1월 사전등록 → 할인 결제
 * - 사전등록(결제 없음): JANUARY_PAID_OPEN_START 미만
 * - 할인 결제(5,000원): PAID_OPEN ~ BENEFIT_END(12/15 23:59:59 KST)
 * - 정상가: 12/16 0시부터
 * 특강·진단 모두 5,000원 할인 (진단 정상가 40,000 → 35,000)
 */
/** 사전등록 종료 · 할인 결제 시작 — 2026-12-12 00:00 KST */
export const JANUARY_PAID_OPEN_START = Date.parse(
  "2026-12-12T00:00:00+09:00",
);
/** 할인 종료(=정상가) — 2026-12-16 00:00 KST (12/15까지 할인) */
export const JANUARY_BENEFIT_END = Date.parse("2026-12-16T00:00:00+09:00");
export const JANUARY_BENEFIT_AMOUNT = 5000;
export const JANUARY_BENEFIT_NAME = "1월 사전등록 혜택";
export const JANUARY_DIAGNOSIS_BASE_AMOUNT = 40000;
export const JANUARY_SPECIAL_BASE_AMOUNT = 80000;

export function isJanuarySchedule(
  schedule?: { year: number; month: number } | null,
) {
  // 12월 특강 다음 회차 — 2027년 1월
  return schedule?.year === 2027 && schedule.month === 1;
}

/** 사전등록(결제 없음) — 12/12 0시 미만만 */
export function isJanuaryAdvanceReservationOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isJanuarySchedule(schedule) && now < JANUARY_PAID_OPEN_START;
}

/** 1월 일정 정식 오픈(결제 가능) — 12/12 0시부터 계속 */
export function isJanuaryPaidOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isJanuarySchedule(schedule) && now >= JANUARY_PAID_OPEN_START;
}

/**
 * 12/12~12/15 한정 5,000원 오픈 할인 기간.
 * 12/16 0시부터 false → 정상가.
 */
export function hasJanuaryOpenDiscount(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return (
    isJanuarySchedule(schedule) &&
    now >= JANUARY_PAID_OPEN_START &&
    now < JANUARY_BENEFIT_END
  );
}

/** 진단 포함 — 특강/스타트/진단 모두 사전등록·오픈 할인 대상 */
export function isJanuaryDiscountEligibleClass(className: string): boolean {
  const name = String(className || "").trim();
  if (!name) return false;

  const resolved = resolveClassScheduleFromEnrollmentKey(name);
  if (!resolved?.schedule || !isJanuarySchedule(resolved.schedule)) {
    return false;
  }

  if (
    Object.hasOwn(DEFAULT_CAPACITY_BY_CLASS, name) &&
    DEFAULT_CAPACITY_BY_CLASS[name] === 0
  ) {
    return false;
  }

  if (isDiagnosisEnrollmentKey(name) || /진단/.test(name)) {
    console.log("[1월사전등록] 진단 클래스 할인 대상:", name);
    return true;
  }
  if (isStartTurnEnrollmentKey(name)) {
    console.log("[1월사전등록] 스타트 클래스 할인 대상:", name);
    return true;
  }
  if (/^\[[^\]]+\]\s+\d+부\s*특강\s+(자유형|평영|접영)$/.test(name)) {
    return true;
  }
  return false;
}

export type JanuaryOpenBenefit = {
  originalAmount: number;
  discountAmount: number;
  expectedAmount: number;
  benefitName: string;
  reservedAt: string;
};

function resolveJanuaryBaseAmount(className: string): number | null {
  const name = String(className || "").trim();
  if (isDiagnosisEnrollmentKey(name) || /진단/.test(name)) {
    return JANUARY_DIAGNOSIS_BASE_AMOUNT;
  }
  if (isStartTurnEnrollmentKey(name)) {
    return JANUARY_SPECIAL_BASE_AMOUNT;
  }
  if (/^\[[^\]]+\]\s+\d+부\s*특강\s+(자유형|평영|접영)$/.test(name)) {
    const resolved = resolveClassScheduleFromEnrollmentKey(name);
    const specialPrice = resolved?.schedule.specialClass?.price;
    if (
      Number.isFinite(specialPrice) &&
      (specialPrice as number) > 0 &&
      matchesSpecialClassOption(name, resolved?.schedule.specialClass)
    ) {
      return specialPrice as number;
    }
    return JANUARY_SPECIAL_BASE_AMOUNT;
  }
  return null;
}

/** 정상가 기준 오픈 할인 정보 (해당 없으면 null) */
export function resolveJanuaryOpenBenefit(
  className: string,
  originalAmount?: number,
  now = Date.now(),
): JanuaryOpenBenefit | null {
  const resolved = resolveClassScheduleFromEnrollmentKey(className);
  if (!resolved?.schedule) return null;
  if (!hasJanuaryOpenDiscount(resolved.schedule, now)) return null;
  if (!isJanuaryDiscountEligibleClass(className)) return null;

  const januaryBase = resolveJanuaryBaseAmount(className);
  const base =
    januaryBase != null && Number.isFinite(januaryBase)
      ? januaryBase
      : originalAmount != null && Number.isFinite(originalAmount)
        ? originalAmount
        : null;
  if (
    base == null ||
    !Number.isFinite(base) ||
    base <= JANUARY_BENEFIT_AMOUNT
  ) {
    return null;
  }

  const benefit: JanuaryOpenBenefit = {
    originalAmount: base,
    discountAmount: JANUARY_BENEFIT_AMOUNT,
    expectedAmount: base - JANUARY_BENEFIT_AMOUNT,
    benefitName: JANUARY_BENEFIT_NAME,
    reservedAt: new Date(now).toISOString(),
  };
  console.log("[1월오픈혜택] 할인 적용", {
    className,
    ...benefit,
  });
  return benefit;
}

/**
 * 사전등록 API용 (12/12 0시 미만만).
 * 12/12 이후에는 null — 일반 결제(+오픈 할인) 플로우만 사용.
 */
export function resolveJanuaryReservation(
  classId: number,
  classKey: string,
  now = Date.now(),
) {
  const schedule = CLASS_SCHEDULES.find((item) => item.id === classId);
  if (!schedule || !isJanuarySchedule(schedule)) return null;

  if (!isJanuaryAdvanceReservationOpen(schedule, now)) {
    console.log("[1월사전등록] 기간 종료 — 정식 오픈/결제 플로우", {
      classId,
      classKey,
      paidOpenFrom: new Date(JANUARY_PAID_OPEN_START).toISOString(),
      benefitEndsAt: new Date(JANUARY_BENEFIT_END).toISOString(),
    });
    return null;
  }

  if (!Object.hasOwn(DEFAULT_CAPACITY_BY_CLASS, classKey)) {
    console.warn("[1월사전등록] 정원 키 없음:", classKey);
    return null;
  }
  if ((DEFAULT_CAPACITY_BY_CLASS[classKey] ?? 0) <= 0) {
    console.warn("[1월사전등록] 모집 중단 클래스:", classKey);
    return null;
  }

  const label = getClassScheduleLabel(schedule);
  let sheetClass = "";

  if (isDiagnosisEnrollmentKey(classKey) || /진단/.test(classKey)) {
    if (!classKey.includes(`[${label}]`) || !/진단/.test(classKey)) {
      return null;
    }
    sheetClass = "진단";
  } else if (isStartTurnEnrollmentKey(classKey)) {
    sheetClass = "스타트";
  } else {
    const prefix = `[${label}] 1부 특강 `;
    if (!classKey.startsWith(prefix)) return null;
    const stroke = classKey.slice(prefix.length);
    if (!["자유형", "평영", "접영"].includes(stroke)) return null;
    sheetClass = stroke;
  }

  const originalAmount = resolveJanuaryBaseAmount(classKey);
  if (originalAmount == null || originalAmount <= JANUARY_BENEFIT_AMOUNT) {
    return null;
  }

  const benefit: JanuaryOpenBenefit = {
    originalAmount,
    discountAmount: JANUARY_BENEFIT_AMOUNT,
    expectedAmount: originalAmount - JANUARY_BENEFIT_AMOUNT,
    benefitName: JANUARY_BENEFIT_NAME,
    reservedAt: new Date(now).toISOString(),
  };

  console.log("[1월사전등록] 할인 적용", {
    classId,
    classKey,
    sheetClass,
    ...benefit,
  });

  return {
    schedule,
    stroke: sheetClass,
    ...benefit,
  };
}
