import {
  hasNovemberBenefit,
  isNovemberAdvanceReservationOpen,
  resolveNovemberReservation,
  NOVEMBER_BENEFIT_END,
} from "../lib/november-reservation.ts";

const nov = { year: 2026, month: 11 };
const before = NOVEMBER_BENEFIT_END - 1000;
const after = NOVEMBER_BENEFIT_END + 1000;

console.log("before open?", isNovemberAdvanceReservationOpen(nov, before));
console.log("after open?", isNovemberAdvanceReservationOpen(nov, after));
console.log("before benefit?", hasNovemberBenefit(nov, before));
console.log("after benefit?", hasNovemberBenefit(nov, after));

const offerBefore = resolveNovemberReservation(
  24,
  "[부산 11/8] 1부 특강 자유형",
  before,
);
const offerAfter = resolveNovemberReservation(
  24,
  "[부산 11/8] 1부 특강 자유형",
  after,
);
console.log("API before:", offerBefore ? `ok discount=${offerBefore.discountAmount}` : null);
console.log("API after:", offerAfter);
