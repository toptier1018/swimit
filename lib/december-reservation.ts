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
 * 12월 사전예약 → 할인 결제
 * - 사전예약(결제 없음): DECEMBER_PAID_OPEN_START 미만
 * - 할인 결제(5,000원): PAID_OPEN ~ BENEFIT_END(11/15 23:59:59 KST)
 * - 정상가: 11/16 0시부터
 * 특강·스타트·진단 모두 5,000원 할인 (진단 정상가 40,000 → 35,000)
 */
/** 사전예약 종료 · 할인 결제 시작 — 2026-11-12 00:00 KST */
export const DECEMBER_PAID_OPEN_START = Date.parse(
  "2026-11-12T00:00:00+09:00",
);
/** 할인 종료(=정상가) — 2026-11-16 00:00 KST (11/15까지 할인) */
export const DECEMBER_BENEFIT_END = Date.parse("2026-11-16T00:00:00+09:00");
/** @deprecated 호환 — 할인 종료와 동일 */
export const DECEMBER_ADVANCE_END = DECEMBER_BENEFIT_END;
export const DECEMBER_BENEFIT_AMOUNT = 5000;
export const DECEMBER_BENEFIT_NAME = "12월 오픈 혜택";
export const DECEMBER_DIAGNOSIS_BASE_AMOUNT = 40000;
export const DECEMBER_SPECIAL_BASE_AMOUNT = 80000;

export function isDecemberSchedule(
  schedule?: { year: number; month: number } | null,
) {
  return schedule?.year === 2026 && schedule.month === 12;
}

/** 사전예약(결제 없음) — 11/12 0시 미만만. 이후에는 절대 사전예약으로 되돌리지 않는다. */
export function isDecemberAdvanceReservationOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isDecemberSchedule(schedule) && now < DECEMBER_PAID_OPEN_START;
}

/** 12월 일정 정식 오픈(결제 가능) — 11/12 0시부터 계속 */
export function isDecemberPaidOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isDecemberSchedule(schedule) && now >= DECEMBER_PAID_OPEN_START;
}

/**
 * 11/12~11/15 한정 5,000원 오픈 할인 기간.
 * 11/16 0시부터 false → 정상가.
 */
export function hasDecemberOpenDiscount(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return (
    isDecemberSchedule(schedule) &&
    now >= DECEMBER_PAID_OPEN_START &&
    now < DECEMBER_BENEFIT_END
  );
}

/** @deprecated 호환 — 오픈 한정 할인과 동일 */
export function hasDecemberBenefit(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return hasDecemberOpenDiscount(schedule, now);
}

/** 진단 포함 — 특강/스타트/진단 모두 사전예약·오픈 할인 대상 */
export function isDecemberDiscountEligibleClass(className: string): boolean {
  const name = String(className || "").trim();
  if (!name) return false;

  const resolved = resolveClassScheduleFromEnrollmentKey(name);
  if (!resolved?.schedule || !isDecemberSchedule(resolved.schedule)) {
    return false;
  }

  if (Object.hasOwn(DEFAULT_CAPACITY_BY_CLASS, name) && DEFAULT_CAPACITY_BY_CLASS[name] === 0) {
    return false;
  }

  if (isDiagnosisEnrollmentKey(name) || /진단/.test(name)) {
    console.log("[12월오픈혜택] 진단 클래스 할인 대상:", name);
    return true;
  }
  if (isStartTurnEnrollmentKey(name)) {
    console.log("[12월오픈혜택] 스타트 클래스 할인 대상:", name);
    return true;
  }
  if (/^\[[^\]]+\]\s+\d+부\s*특강\s+(자유형|평영|접영)$/.test(name)) {
    return true;
  }
  return false;
}

export type DecemberOpenBenefit = {
  originalAmount: number;
  discountAmount: number;
  expectedAmount: number;
  benefitName: string;
  reservedAt: string;
};

/** @deprecated 호환 별칭 */
export type DecemberAdvanceBenefit = DecemberOpenBenefit;

function resolveDecemberBaseAmount(className: string): number | null {
  const name = String(className || "").trim();
  if (isDiagnosisEnrollmentKey(name) || /진단/.test(name)) {
    return DECEMBER_DIAGNOSIS_BASE_AMOUNT;
  }
  if (isStartTurnEnrollmentKey(name)) {
    // 할인은 정상가 80,000원 기준 (런칭특가와 별도)
    return DECEMBER_SPECIAL_BASE_AMOUNT;
  }
  if (/^\[[^\]]+\]\s+\d+부\s*특강\s+(자유형|평영|접영)$/.test(name)) {
    const resolved = resolveClassScheduleFromEnrollmentKey(name);
    const specialPrice = resolved?.schedule.specialClass?.price;
    if (
      Number.isFinite(specialPrice) &&
      (specialPrice as number) > 0 &&
      matchesSpecialClassOption(name, resolved?.schedule.specialClass)
    ) {
      // 장거리 집중 등 SPECIAL 정상가 (예: 115,000)
      return specialPrice as number;
    }
    return DECEMBER_SPECIAL_BASE_AMOUNT;
  }
  return null;
}

/** 정상가 기준 오픈 할인 정보 (해당 없으면 null) */
export function resolveDecemberOpenBenefit(
  className: string,
  originalAmount?: number,
  now = Date.now(),
): DecemberOpenBenefit | null {
  const resolved = resolveClassScheduleFromEnrollmentKey(className);
  if (!resolved?.schedule) return null;
  if (!hasDecemberOpenDiscount(resolved.schedule, now)) return null;
  if (!isDecemberDiscountEligibleClass(className)) return null;

  // 스타트 등은 런칭특가(75,000)가 base로 올 수 있어, 12월 할인 기준가(80,000)를 우선한다.
  const decemberBase = resolveDecemberBaseAmount(className);
  const base =
    decemberBase != null && Number.isFinite(decemberBase)
      ? decemberBase
      : originalAmount != null && Number.isFinite(originalAmount)
        ? originalAmount
        : null;
  if (base == null || !Number.isFinite(base) || base <= DECEMBER_BENEFIT_AMOUNT) {
    return null;
  }

  const benefit: DecemberOpenBenefit = {
    originalAmount: base,
    discountAmount: DECEMBER_BENEFIT_AMOUNT,
    expectedAmount: base - DECEMBER_BENEFIT_AMOUNT,
    benefitName: DECEMBER_BENEFIT_NAME,
    reservedAt: new Date(now).toISOString(),
  };
  console.log("[12월오픈혜택] 할인 적용", {
    className,
    ...benefit,
  });
  return benefit;
}

/**
 * 사전예약 API용 (11/12 0시 미만만).
 * 11/12 이후에는 null — 일반 결제(+오픈 할인) 플로우만 사용.
 */
export function resolveDecemberReservation(
  classId: number,
  classKey: string,
  now = Date.now(),
) {
  const schedule = CLASS_SCHEDULES.find((item) => item.id === classId);
  if (!schedule || !isDecemberSchedule(schedule)) return null;

  if (!isDecemberAdvanceReservationOpen(schedule, now)) {
    console.log("[12월사전예약] 기간 종료 — 정식 오픈/결제 플로우", {
      classId,
      classKey,
      paidOpenFrom: new Date(DECEMBER_PAID_OPEN_START).toISOString(),
      benefitEndsAt: new Date(DECEMBER_BENEFIT_END).toISOString(),
    });
    return null;
  }

  if (!Object.hasOwn(DEFAULT_CAPACITY_BY_CLASS, classKey)) {
    console.warn("[12월사전예약] 정원 키 없음:", classKey);
    return null;
  }
  if ((DEFAULT_CAPACITY_BY_CLASS[classKey] ?? 0) <= 0) {
    console.warn("[12월사전예약] 모집 중단 클래스:", classKey);
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

  const originalAmount = resolveDecemberBaseAmount(classKey);
  if (originalAmount == null || originalAmount <= DECEMBER_BENEFIT_AMOUNT) {
    return null;
  }

  const benefit: DecemberOpenBenefit = {
    originalAmount,
    discountAmount: DECEMBER_BENEFIT_AMOUNT,
    expectedAmount: originalAmount - DECEMBER_BENEFIT_AMOUNT,
    benefitName: DECEMBER_BENEFIT_NAME,
    reservedAt: new Date(now).toISOString(),
  };

  console.log("[12월사전예약] 할인 적용", {
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
