import { CLASS_SCHEDULES, DEFAULT_CAPACITY_BY_CLASS, getClassScheduleLabel } from "./class-schedule-data";

export const NOVEMBER_BENEFIT_END = Date.parse("2026-10-16T00:00:00+09:00");
export const NOVEMBER_BENEFIT_AMOUNT = 5000;
export const NOVEMBER_BENEFIT_NAME = "11월 특강 예약 혜택";

export function isNovemberSchedule(schedule?: { year: number; month: number } | null) {
  return schedule?.year === 2026 && schedule.month === 11;
}
export function hasNovemberBenefit(schedule?: { year: number; month: number } | null, now = Date.now()) {
  return isNovemberSchedule(schedule) && now < NOVEMBER_BENEFIT_END;
}
/** Only published special classes qualify. Prices and dates are server controlled. */
export function resolveNovemberReservation(classId: number, classKey: string, now = Date.now()) {
  const schedule = CLASS_SCHEDULES.find(item => item.id === classId);
  if (!schedule || !isNovemberSchedule(schedule)) return null;
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
      discount: hasNovemberBenefit(schedule, now) ? NOVEMBER_BENEFIT_AMOUNT : 0,
    });
  }
  const discountAmount = hasNovemberBenefit(schedule, now) ? NOVEMBER_BENEFIT_AMOUNT : 0;
  return { schedule, stroke, originalAmount, discountAmount, expectedAmount: originalAmount - discountAmount,
    benefitName: discountAmount ? NOVEMBER_BENEFIT_NAME : "", reservedAt: new Date(now).toISOString() };
}
