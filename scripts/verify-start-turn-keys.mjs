import {
  getStartTurnEnrollmentKey,
  START_TURN_SESSION,
  START_TURN_CAPACITY,
  CLASS_SCHEDULES,
} from "../lib/class-schedule-data.ts";

const dates = CLASS_SCHEDULES.filter(
  (i) => i.addonSpecialClass?.specialType === "start-turn-2h",
);

console.log("[verify] START_TURN_SESSION =", START_TURN_SESSION);
for (const d of dates) {
  const key = getStartTurnEnrollmentKey(d);
  const ok =
    key.includes("1부") &&
    key.endsWith("스타트") &&
    !key.includes("2부") &&
    (d.addonSpecialClass?.timeLabel === "14:00~16:00");
  console.log(ok ? "OK" : "FAIL", {
    key,
    time: d.addonSpecialClass?.timeLabel,
    capacity: d.addonSpecialClass?.capacity ?? START_TURN_CAPACITY,
  });
}
