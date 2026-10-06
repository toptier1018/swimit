import { CLASS_SCHEDULES, DEFAULT_CAPACITY_BY_CLASS, getClassScheduleLabel } from "./class-schedule-data";

/** 전월 15일까지(한국시간). 16일 00:00부터 사전예약·5,000원 혜택 종료 → 일반 결제 */
export const NOVEMBER_BENEFIT_END = Date.parse("2026-10-16T00:00:00+09:00");
export const NOVEMBER_BENEFIT_AMOUNT = 5000;
export const NOVEMBER_BENEFIT_NAME = "11월 특강 예약 혜택";

export function isNovemberSchedule(schedule?: { year: number; month: number } | null) {
  return schedule?.year === 2026 && schedule.month === 11;
}

/**
 * 11월 특강 사전예약(결제 없음) + 5,000원 혜택 기간인지.
 * 15일까지 true, 16일 0시부터 false → 일반 결제로 전환.
 */
export function isNovemberAdvanceReservationOpen(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isNovemberSchedule(schedule) && now < NOVEMBER_BENEFIT_END;
}

export function hasNovemberBenefit(
  schedule?: { year: number; month: number } | null,
  now = Date.now(),
) {
  return isNovemberAdvanceReservationOpen(schedule, now);
}

/** Only published special classes qualify. Prices and dates are server controlled. */
export function resolveNovemberReservation(classId: number, classKey: string, now = Date.now()) {
  const schedule = CLASS_SCHEDULES.find(item => item.id === classId);
  if (!schedule || !isNovemberSchedule(schedule)) return null;
  // 16일부터는 사전예약 API 종료 — 일반 결제 플로우로만 신청
  if (!isNovemberAdvanceReservationOpen(schedule, now)) {
    console.log("[11월사전예약] 기간 종료 — 일반 결제 전환", {
      classId,
      classKey,
      endAt: new Date(NOVEMBER_BENEFIT_END).toISOString(),
    });
    return null;
  }
  const prefix = `[${getClassScheduleLabel(schedule)}] 1부 특강 `;
  if (!classKey.startsWith(prefix) || !Object.hasOwn(DEFAULT_CAPACITY_BY_CLASS, classKey)) return null;
  const stroke = classKey.slice(prefix.length);
  if (!["자유형", "평영", "접영"].includes(stroke)) return null;
  const startHour = schedule.id === 25 ? "16" : "14";
  if (now >= Date.parse(`2026-11-${String(schedule.dateNum).padStart(2, "0")}T${startHour}:00:00+09:00`)) return null;
  const originalAmount = schedule.specialClass?.price ?? 80000;
  if (schedule.specialClass) {
    console.log("[3시간집중] 예약 금액 확인", {
      classId: schedule.id,
      originalAmount,
      discount: NOVEMBER_BENEFIT_AMOUNT,
    });
  }
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
