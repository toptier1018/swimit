const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
let now = Date.parse("2026-10-15T23:59:59.999+09:00");
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
function loader(stubs = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const req = name => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith(".")) {
        const target = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
        return load(target + ".ts");
      }
      return require(name);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: req, Date: TestDate, process,
      console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, URL, fetch }, { filename: file });
    return module.exports;
  }
  return relative => load(path.join(root, relative));
}
async function main() {
  const load = loader();
  const promo = load("lib/november-reservation.ts");
  const schedules = load("lib/class-schedule-data.ts");
  const events = schedules.CLASS_SCHEDULES.filter(s => s.year === 2026 && s.month === 11);
  assert.equal(events.length, 4);
  for (const event of events) {
    const key = "[" + schedules.getClassScheduleLabel(event) + "] 1부 특강 자유형";
    const expected = event.specialClass ? event.specialClass.price - 5000 : 75000;
    assert.equal(promo.resolveNovemberReservation(event.id, key).expectedAmount, expected);
    assert.equal(promo.resolveNovemberReservation(event.id, key, promo.NOVEMBER_BENEFIT_END).discountAmount, 0);
    assert.equal(promo.resolveNovemberReservation(event.id, key, Date.parse("2026-12-01")), null);
  }
  assert.equal(promo.resolveNovemberReservation(23, "[동탄 10/25] 1부 특강 자유형"), null);
  assert.equal(promo.resolveNovemberReservation(24, "[부산 11/8] 1부 진단"), null);
  assert.equal(promo.resolveNovemberReservation(24, "[강남 11/15] 1부 특강 자유형"), null);
  let duplicate = false, failed = false, full = false, manual = false, writes = [];
  const key = "[부산 11/8] 1부 특강 자유형";
  const route = loader({
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/google-sheets": { appendAdvanceReservationToGoogleSheet: async (row, benefit) => { if (failed) return { success: false, error: "test failure" }; writes.push({ row, benefit }); return { success: true }; } },
    "@/lib/ops-sheet-enrollment": {
      checkGoogleSheetDuplicateForSameClass: async () => ({ success: true, hasDuplicate: duplicate }),
      getOpsSheetEnrollmentCounts: async () => ({ success: true, counts: { [key]: full ? 14 : 0 } }),
      formatOpsSheetDateTime: date => date.toISOString(),
    },
    "@/lib/schedules": { getClassSettingsFromNotion: async () => ({ thresholds: {}, waitlistClasses: manual ? [key] : [] }) },
  })("app/api/reservations/november/route.ts");
  const body = {
    classId: 24, classKey: key, agreed: true, amount: 1, discountAmount: 80000,
    form: { name: "테스트", phone: "010-0000-0000", email: "", gender: "male", location: "", swimmingExperience: "1년", painAreas: [], message: "" },
    contentConsent: { agreed: true, agreedAt: new Date().toISOString(), className: key, version: "class-video-consent-v2" },
  };
  const submit = overrides => route.POST({ json: async () => ({ ...body, ...overrides }) });
  let response = await submit();
  assert.equal(response.status, 200);
  assert.equal(response.body.expectedAmount, 75000);
  assert.equal(writes[0].row.예약상태, "사전예약");
  assert.equal(writes[0].row.입금기한, "");
  assert.equal(writes[0].benefit.discountAmount, 5000);
  now = promo.NOVEMBER_BENEFIT_END;
  response = await submit();
  assert.equal(response.body.expectedAmount, 80000);
  now -= 1;
  duplicate = true;
  const previousWrites = writes.length;
  assert.equal((await submit()).status, 409);
  assert.equal(writes.length, previousWrites);
  duplicate = false; full = true;
  assert.equal((await submit()).body.status, "예약대기");
  full = false; manual = true;
  assert.equal((await submit()).body.status, "예약대기");
  manual = false;
  assert.equal((await submit({ classId: 25 })).status, 400);
  assert.equal((await submit({ agreed: false })).status, 400);
  assert.equal((await submit({ contentConsent: null })).status, 400);
  failed = true;
  assert.equal((await submit()).status, 503);

  // Verify real sheet serialization with a fake Google API; never touch customer data.
  process.env.GOOGLE_CLIENT_EMAIL = "test@example.invalid";
  process.env.GOOGLE_PRIVATE_KEY = "test";
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "test";
  process.env.GOOGLE_SHEETS_SHEET_NAME = "raw";
  process.env.GOOGLE_SHEETS_OPS_SHEET_NAME = "ops";
  const headers = ["접수일시","신청번호","이름","전화번호","이메일","성별","거주지역","수영경력","통증부위","해결문제","클래스","회차","레인","날짜","특강지역","예약상태","링크","입금기한","대기순번"];
  const persisted = [];
  const fakeSheets = { spreadsheets: {
    get: async () => ({ data: { sheets: [{ properties: { title: "raw", sheetId: 1, gridProperties: { columnCount: 40 } } }] } }),
    batchUpdate: async () => ({}),
    values: {
      get: async ({ range }) => ({ data: { values: range.endsWith("!1:1") ? [headers] : [] } }),
      update: async args => { persisted.push({ kind: "headers", ...args }); return {}; },
      append: async args => { persisted.push({ kind: "row", ...args }); return {}; },
    },
  } };
  const googleStub = { google: { auth: { GoogleAuth: class {} }, sheets: () => fakeSheets } };
  const sheetsModule = loader({ googleapis: googleStub })("lib/google-sheets.ts");
  assert.equal((await sheetsModule.appendAdvanceReservationToGoogleSheet(writes[0].row, writes[0].benefit)).success, true);
  assert.equal(persisted.filter(x => x.kind === "row").length, 1);
  const savedHeaders = persisted[0].requestBody.values[0];
  const saved = persisted[1].requestBody.values[0];
  assert.equal(saved[15], "사전예약");
  assert.equal(saved[17], "");
  assert.equal(saved[3], "01000000000");
  assert.equal(saved[savedHeaders.indexOf("예약 할인액")], 5000);
  assert.equal(saved[savedHeaders.indexOf("할인 후 예정 금액")], 75000);
  assert.equal(saved[26], true);
  assert.equal(persisted[1].valueInputOption, "RAW");

  // A reservation must not expire under the normal next-day payment deadline.
  const opsHeaders = ["신청번호", "예약상태", "확정예약상태", "날짜", "특강지역", "회차", "클래스"];
  const rawRow = headers.map(h => writes[0].row[h] ?? "");
  const cancelledOrder = "cancelled";
  const rawCancelled = [...rawRow]; rawCancelled[1] = cancelledOrder;
  const rawWaitlist = [...rawRow]; rawWaitlist[1] = "waitlist"; rawWaitlist[15] = "예약대기";
  fakeSheets.spreadsheets.values.get = async ({ range }) => ({
    data: { values: range.startsWith("'ops'") ?
      [opsHeaders, [cancelledOrder, "사전예약", "취소", "2026-11-08", "부산 · 조이풀스윔", "1부", key]] :
      [headers, rawRow, rawCancelled, rawWaitlist] },
  });
  now = Date.parse("2026-10-25T12:00:00+09:00");
  const ops = loader({ googleapis: googleStub })("lib/ops-sheet-enrollment.ts");
  const counts = await ops.getOpsSheetEnrollmentCounts();
  assert.equal(counts.success, true);
  assert.equal(counts.counts[key], 1);
  const duplicateResult = await ops.checkGoogleSheetDuplicateForSameClass({ name: body.form.name, phone: body.form.phone, selectedClass: key });
  assert.equal(duplicateResult.hasDuplicate, true);
  console.log("PASS: November deadlines, 4 schedules, server pricing, consent, duplicate/failure/waitlist handling, atomic sheet payload, reservation counts.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
