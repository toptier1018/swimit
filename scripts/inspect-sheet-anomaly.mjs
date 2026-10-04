import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

function summarize(title, rows) {
  const header = (rows[0] || []).map((h) => String(h || "").trim());
  const colOrder = header.indexOf("신청번호");
  const colName = header.indexOf("이름");
  const colClass = header.indexOf("클래스");
  const colSession = header.indexOf("회차");
  const colDate = header.indexOf("날짜");
  const colStatus = header.indexOf("예약상태");
  const colConfirmed = header.indexOf("확정예약상태");

  let emptyNameWithStatus = 0;
  let missingOrder = 0;
  let blankish = [];
  const around = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const order = String(row[colOrder] ?? "").trim();
    const name = String(row[colName] ?? "").trim();
    const status = colStatus >= 0 ? String(row[colStatus] ?? "").trim() : "";
    const confirmed =
      colConfirmed >= 0 ? String(row[colConfirmed] ?? "").trim() : "";
    const filled = row.filter((c) => String(c ?? "").trim()).length;

    if ((status || confirmed) && !name) emptyNameWithStatus += 1;
    if ((status || confirmed || filled >= 3) && !order) missingOrder += 1;

    if (filled > 0 && filled <= 4 && (status || confirmed)) {
      blankish.push({
        row: i + 1,
        filled,
        order,
        name,
        class: String(row[colClass] ?? ""),
        session: String(row[colSession] ?? ""),
        status,
        confirmed,
      });
    }

    if (i + 1 >= 750 && i + 1 <= 760) {
      around.push({
        row: i + 1,
        filled,
        order,
        name,
        class: String(row[colClass] ?? ""),
        session: String(row[colSession] ?? ""),
        date: String(row[colDate] ?? ""),
        status,
        confirmed,
        sample: row.slice(0, 20).map((c) => String(c ?? "").slice(0, 24)),
      });
    }
  }

  return {
    title,
    totalRows: Math.max(0, rows.length - 1),
    emptyNameWithStatus,
    missingOrder,
    blankish: blankish.slice(0, 30),
    around750_760: around,
  };
}

async function main() {
  const sheets = google.sheets({ version: "v4", auth });
  for (const title of ["스윔잇 수강자 운영", "스윔잇 수강자"]) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${title}'!A:AZ`,
    });
    console.log(JSON.stringify(summarize(title, res.data.values || []), null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
