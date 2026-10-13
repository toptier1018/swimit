import {
  isAdvanceReservationPayWindowOpen,
  getAdvancePayTargetYearMonth,
  getKstDateParts,
} from "../lib/advance-reservation-window.ts";

function atKst(y, m, d, h = 0, mi = 0, s = 0) {
  return Date.parse(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}+09:00`,
  );
}

const cases = [
  ["10/12 23:59 closed", atKst(2026, 10, 12, 23, 59, 59), false, null],
  ["10/13 00:00 open → Nov", atKst(2026, 10, 13, 0, 0, 0), true, { y: 2026, m: 11 }],
  ["10/15 23:59 open", atKst(2026, 10, 15, 23, 59, 59), true, { y: 2026, m: 11 }],
  ["10/16 00:00 closed", atKst(2026, 10, 16, 0, 0, 0), false, null],
  ["11/13 open → Dec", atKst(2026, 11, 13, 12, 0, 0), true, { y: 2026, m: 12 }],
  ["12/14 open → Jan2027", atKst(2026, 12, 14, 8, 0, 0), true, { y: 2027, m: 1 }],
];

let fail = 0;
for (const [name, t, expectOpen, expectTarget] of cases) {
  const open = isAdvanceReservationPayWindowOpen(t);
  const target = getAdvancePayTargetYearMonth(t);
  const kst = getKstDateParts(t);
  const ok =
    open === expectOpen &&
    (!expectTarget ||
      (target.year === expectTarget.y && target.month === expectTarget.m));
  if (!ok) fail += 1;
  console.log(ok ? "OK" : "FAIL", name, { kst, open, target });
}
console.log(fail === 0 ? "ALL PASS" : `FAILS=${fail}`);
process.exit(fail === 0 ? 0 : 1);
