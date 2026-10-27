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
 * 12월 사전예약 — 2026-11-15 23:59:59 KST까지 (11/16 0시 미만)
 * 특강·스타트·진단 모두 5,000원 할인 (진단 기본 35,000 → 사전예약 30,000)
 */
export const DECEMBER_ADVANCE_END = Date.parse("2026-11-16T00:00:00+09:00");
export const DECEMBER_BENEFIT_AMOUNT = 5000;
export const DECEMBER_BENEFIT_NAME = "12월 사전예약 혜택";
export const DECEMBER_DIAGNOSIS_BASE_AMOUNT = 35000;
export const DECEMBER_SPECIAL_BASE_AMOUNT = 80000;

export function isDecemberSchedule(
  schedule?: { year: number; month: number } | null,
) {
  return schedule?.year === 2026 && schedule.month === 12;
}

/** 사전예약(결제 없음) — 11/15까지 */
export function isDecemberAdvanceReservationOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isDecemberSchedule(schedule) && now < DECEMBER_ADVANCE_END;
}

/** 11/16 0시부터 정식 결제 오픈(정상가) */
export function isDecemberPaidOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isDecemberSchedule(schedule) && now >= DECEMBER_ADVANCE_END;
}

/** 진단 포함 — 특강/스타트/진단 모두 사전예약 할인 대상 */
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
    console.log("[12월사전예약] 진단 클래스 할인 대상:", name);
    return true;
  }
  if (isStartTurnEnrollmentKey(name)) {
    console.log("[12월사전예약] 스타트 클래스 할인 대상:", name);
    return true;
  }
  if (/^\[[^\]]+\]\s+\d+부\s*특강\s+(자유형|평영|접영)$/.test(name)) {
    return true;
  }
  return false;
}

export type DecemberAdvanceBenefit = {
  originalAmount: number;
  discountAmount: number;
  expectedAmount: number;
  benefitName: string;
  reservedAt: string;
};

function resolveDecemberBaseAmount(className: string): number | null {
  const name = String(className || "").trim();
  if (isDiagnosisEnrollmentKey(name) || /진단/.test(name)) {
    return DECEMBER_DIAGNOSIS_BASE_AMOUNT;
  }
  if (isStartTurnEnrollmentKey(name)) {
    // 사전예약 할인은 정상가 80,000원 기준 (런칭특가와 별도)
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

/**
 * 사전예약 API용 (11/15까지).
 * 특강·스타트·진단 모두 접수. 진단 기본 35,000원 · 사전예약 30,000원.
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
      paidOpenFrom: new Date(DECEMBER_ADVANCE_END).toISOString(),
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

  const benefit: DecemberAdvanceBenefit = {
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
