/** 목동 10/18 진단 신청 잔여 건 확인 (읽기 전용) */
import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

function isOct18(date) {
  const s = String(date || "");
  return /2026-10-18|10\/18|10월\s*18/.test(s);
}

function isDiagnosis(cls, actual) {
  const t = `${cls} ${actual}`;
  return /진단/.test(t);
}

function isMokdong(region) {
  return String(region || "").includes("목동");
}

async function scan(title) {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A:Z`,
  });
  const rows = res.data.values || [];
  const h = (rows[0] || []).map((x) => String(x || "").trim());
  const i = (name) => h.indexOf(name);
  const hits = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const date = i("날짜") >= 0 ? row[i("날짜")] : "";
    const region = i("특강지역") >= 0 ? row[i("특강지역")] : "";
    const cls = i("클래스") >= 0 ? row[i("클래스")] : "";
    const actual = i("실제 클래스") >= 0 ? row[i("실제 클래스")] : "";
    if (!isOct18(date) || !isMokdong(region) || !isDiagnosis(cls, actual)) continue;
    hits.push({
      sheet: title,
      row: r + 1,
      order: i("신청번호") >= 0 ? row[i("신청번호")] : "",
      name: i("이름") >= 0 ? row[i("이름")] : "",
      class: cls,
      actual,
      session: i("회차") >= 0 ? row[i("회차")] : "",
      status: i("예약상태") >= 0 ? row[i("예약상태")] : "",
      confirmed: i("확정예약상태") >= 0 ? row[i("확정예약상태")] : "",
    });
  }
  return hits;
}

async function main() {
  const all = [
    ...(await scan("스윔잇 수강자 운영")),
    ...(await scan("스윔잇 수강자")),
  ];
  console.log(JSON.stringify({ count: all.length, rows: all }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
