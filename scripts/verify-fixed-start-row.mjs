import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const order = "CLASS-01F2B69561B4482A84";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

function pick(header, row, name) {
  const i = header.findIndex((h) => String(h || "").trim() === name);
  return i >= 0 ? String(row[i] ?? "") : "(열없음)";
}

async function main() {
  const sheets = google.sheets({ version: "v4", auth });
  for (const title of ["스윔잇 수강자 운영", "스윔잇 수강자"]) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${title}'!A:AZ`,
    });
    const rows = res.data.values || [];
    const header = rows[0] || [];
    const colOrder = header.findIndex((h) => String(h || "").trim() === "신청번호");
    const hit = rows.find((r, idx) => idx > 0 && String(r[colOrder] || "").trim() === order);
    if (!hit) {
      console.log(title, "신청번호 행 없음");
      continue;
    }
    console.log(title, {
      신청번호: pick(header, hit, "신청번호"),
      이름: pick(header, hit, "이름") || pick(header, hit, "고객명"),
      클래스: pick(header, hit, "클래스"),
      실제클래스: pick(header, hit, "실제 클래스"),
      회차: pick(header, hit, "회차"),
      정원키: pick(header, hit, "정원키"),
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
