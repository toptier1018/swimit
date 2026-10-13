/**
 * 11월 정식 오픈·한정 할인 기간 검증 (로컬 단위)
 * node scripts/verify-november-open-discount.mjs
 */
import {
  hasNovemberOpenDiscount,
  isNovemberAdvanceReservationOpen,
  isNovemberDiscountEligibleClass,
  isNovemberPaidOpen,
  resolveNovemberOpenBenefit,
  resolveNovemberReservation,
  NOVEMBER_PAID_OPEN_START,
  NOVEMBER_BENEFIT_END,
  NOVEMBER_BENEFIT_AMOUNT,
} from "../lib/november-reservation.ts";
import { resolveClassPaymentAmount } from "../lib/class-payment-amount.ts";

const nov = { year: 2026, month: 11 };
const beforeOpen = NOVEMBER_PAID_OPEN_START - 1000;
const duringDiscount = NOVEMBER_PAID_OPEN_START + 1000;
const afterDiscount = NOVEMBER_BENEFIT_END + 1000;

const checks = [];
const assert = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(ok ? "OK" : "FAIL", name, detail);
};

assert(
  "10/13 전 = 우선예약",
  isNovemberAdvanceReservationOpen(nov, beforeOpen) === true,
);
assert(
  "10/13 후 = 우선예약 아님",
  isNovemberAdvanceReservationOpen(nov, duringDiscount) === false,
);
assert(
  "10/16 후에도 우선예약 아님",
  isNovemberAdvanceReservationOpen(nov, afterDiscount) === false,
);
assert(
  "10/13부터 결제 오픈",
  isNovemberPaidOpen(nov, duringDiscount) === true,
);
assert(
  "10/16 후에도 결제 오픈",
  isNovemberPaidOpen(nov, afterDiscount) === true,
);
assert(
  "할인 기간 중 true",
  hasNovemberOpenDiscount(nov, duringDiscount) === true,
);
assert(
  "10/16 할인 종료",
  hasNovemberOpenDiscount(nov, afterDiscount) === false,
);

const free = "[부산 11/8] 1부 특강 자유형";
const start = "[부산 11/8] 1부 특강 스타트";
const intensive = "[동탄 11/29] 1부 특강 자유형";
const diagnosis = "[부산 11/8] 1부 진단";

assert("일반 특강 할인 대상", isNovemberDiscountEligibleClass(free));
assert("스타트 할인 대상", isNovemberDiscountEligibleClass(start));
assert("진단 할인 제외", !isNovemberDiscountEligibleClass(diagnosis));

// resolveNovemberOpenBenefit uses Date.now() internally for schedule window —
// we pass now via resolve which reads hasNovemberOpenDiscount(schedule, now)
const benefitDuring = resolveNovemberOpenBenefit(free, 80000, duringDiscount);
const benefitAfter = resolveNovemberOpenBenefit(free, 80000, afterDiscount);
assert(
  "할인 중 5천원",
  benefitDuring?.discountAmount === NOVEMBER_BENEFIT_AMOUNT &&
    benefitDuring?.expectedAmount === 75000,
  JSON.stringify(benefitDuring),
);
assert("할인 후 null", benefitAfter == null, String(benefitAfter));

const intensiveBenefit = resolveNovemberOpenBenefit(
  intensive,
  115000,
  duringDiscount,
);
assert(
  "장거리 110000",
  intensiveBenefit?.expectedAmount === 110000,
  JSON.stringify(intensiveBenefit),
);

const advanceDuring = resolveNovemberReservation(24, free, duringDiscount);
assert("오픈 후 우선예약 API null", advanceDuring == null);

// 결제 금액 (현재 시각 기준 — 실행일이 10/13~15면 할인 반영)
const payNow = resolveClassPaymentAmount(free);
console.log("현재 resolveClassPaymentAmount(일반특강):", payNow);

const failed = checks.filter((c) => !c.ok);
console.log("\n결과:", failed.length === 0 ? "전부 통과" : `${failed.length}건 실패`);
process.exit(failed.length === 0 ? 0 : 1);
