import { readFileSync } from "fs";
import { resolve } from "path";
import { google } from "googleapis";

const envText = readFileSync(resolve(".env"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m || process.env[m[1]]) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[m[1]] = v.replace(/\\n/g, "\n");
}

const order = "NR-b8d71c01-c5ea-4e40-93d3-20e4a2e23b91";
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });
const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const sheetNames = [
  process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || "스윔잇 수강자",
  process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || "스윔잇 수강자 운영",
];

for (const name of sheetNames) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `'${name.replace(/'/g, "''")}'!A:AZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = res.data.values || [];
  const header = (values[0] || []).map((h) => String(h || "").trim());
  const colOrder = header.findIndex((h) => h === "신청번호");
  let found = false;
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    if (String(row[colOrder] ?? "").trim() !== order) continue;
    found = true;
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      if (h) obj[h] = String(row[idx] ?? "");
    });
    console.log(
      JSON.stringify(
        {
          sheet: name,
          rowNumber: i + 1,
          신청번호: obj["신청번호"],
          이름: obj["이름"],
          예약상태: obj["예약상태"],
          확정예약상태: obj["확정예약상태"],
          입금상태: obj["입금상태"],
          마지막알림: obj["마지막알림"],
          특강지역: obj["특강지역"],
          클래스: obj["클래스"],
          실제클래스: obj["실제 클래스"] || obj["실제클래스"] || "",
          날짜: obj["날짜"],
          회차: obj["회차"],
          토스주문번호: obj["토스주문번호"] || "",
        },
        null,
        2,
      ),
    );
  }
  if (!found) console.log(JSON.stringify({ sheet: name, found: false }));
}
