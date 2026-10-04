import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function main() {
  const sheets = google.sheets({ version: "v4", auth });
  const title = "스윔잇 수강자 운영";
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A:AZ`,
  });
  const rows = res.data.values || [];
  const header = (rows[0] || []).map((h) => String(h || "").trim());
  console.log("headers sample:", header.slice(0, 25));

  const hits = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const joined = row.map((c) => String(c ?? "")).join(" | ");
    if (
      joined.includes("CLASS-01F2B69561B4482A84") ||
      joined.includes("박지회") ||
      joined.includes("1부-스타트") ||
      joined.includes("2부-스타트") ||
      (joined.includes("스타트") && joined.includes("2026-10-18"))
    ) {
      hits.push({ row: i + 1, joined: joined.slice(0, 300) });
    }
  }
  console.log("hits:", hits.length);
  console.log(JSON.stringify(hits, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
