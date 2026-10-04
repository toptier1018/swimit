/**
 * 스타트 특강 시트 데이터 점검 (읽기 전용)
 * - 클래스=스타트(또는 스타트·턴) 행 목록
 * - 회차가 2부인 행 하이라이트
 *
 * 사용: node --env-file=.env scripts/check-start-turn-enrollment.mjs
 */
import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const opsSheet =
  process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || "스윔잇 수강자 운영";
const rawSheet =
  process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || "스윔잇 수강자";

function auth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("GOOGLE_* env missing");
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function headerIndex(header, names) {
  for (const name of names) {
    const i = header.findIndex((h) => String(h || "").trim() === name);
    if (i >= 0) return i;
  }
  return -1;
}

function isStartClass(value) {
  const v = String(value || "").trim();
  return v === "스타트" || v.includes("스타트");
}

function targetDate(raw) {
  const s = String(raw || "");
  return (
    /2026-10-18|10\/18|10월\s*18/.test(s) ||
    /2026-11-08|11\/8|11월\s*8/.test(s) ||
    /2026-11-22|11\/22|11월\s*22/.test(s)
  );
}

async function scanSheet(sheets, title) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A:Z`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const header = (rows[0] || []).map((h) => String(h || "").trim());
  const colClass = headerIndex(header, ["클래스", "실제 클래스"]);
  const colActual = headerIndex(header, ["실제 클래스"]);
  const colSession = headerIndex(header, ["회차"]);
  const colDate = headerIndex(header, ["날짜"]);
  const colRegion = headerIndex(header, ["특강지역", "특강지역/장소"]);
  const colName = headerIndex(header, ["이름", "고객명"]);
  const colOrder = headerIndex(header, ["신청번호"]);
  const colGarden = headerIndex(header, ["정원키"]);
  const colStatus = headerIndex(header, ["예약상태"]);
  const colConfirmed = headerIndex(header, ["확정예약상태"]);

  const found = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const cls = colClass >= 0 ? row[colClass] : "";
    const actual = colActual >= 0 ? row[colActual] : "";
    if (!isStartClass(cls) && !isStartClass(actual)) continue;
    const date = colDate >= 0 ? String(row[colDate] ?? "") : "";
    if (!targetDate(date) && !targetDate(String(row[colGarden] ?? ""))) {
      // 다른 날짜 스타트도 참고용으로 포함
    }
    found.push({
      sheet: title,
      row: i + 1,
      order: colOrder >= 0 ? String(row[colOrder] ?? "") : "",
      name: colName >= 0 ? String(row[colName] ?? "") : "",
      class: String(cls || ""),
      actual: String(actual || ""),
      session: colSession >= 0 ? String(row[colSession] ?? "") : "",
      date,
      region: colRegion >= 0 ? String(row[colRegion] ?? "") : "",
      gardenKey: colGarden >= 0 ? String(row[colGarden] ?? "") : "",
      status: colStatus >= 0 ? String(row[colStatus] ?? "") : "",
      confirmed: colConfirmed >= 0 ? String(row[colConfirmed] ?? "") : "",
    });
  }
  return found;
}

async function main() {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  const ops = await scanSheet(sheets, opsSheet);
  const raw = await scanSheet(sheets, rawSheet);
  const all = [...ops, ...raw];
  const wrongSession = all.filter((r) => /2부/.test(r.session) || /2부/.test(r.gardenKey));

  console.log("[스타트점검] 총 건수:", all.length);
  console.log("[스타트점검] 회차/정원키에 2부 포함:", wrongSession.length);
  console.log(
    JSON.stringify(
      {
        all,
        wrongSession,
        summaryByDateSession: all.reduce((acc, r) => {
          const key = `${r.date || "?"} | 회차=${r.session || "?"} | ${r.sheet}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[스타트점검] 실패:", err.message || err);
  process.exit(1);
});
