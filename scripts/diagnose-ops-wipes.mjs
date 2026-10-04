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

  // 수식 여부 확인 (일부 행)
  const formulaRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'스윔잇 수강자 운영'!A2:X10",
    valueRenderOption: "FORMULA",
  });
  console.log("FORMULA sample rows 2-10:");
  console.log(JSON.stringify(formulaRes.data.values || [], null, 2));

  const ops = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'스윔잇 수강자 운영'!A:X",
  });
  const raw = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'스윔잇 수강자'!A:T",
  });

  const opsRows = ops.data.values || [];
  const rawRows = raw.data.values || [];
  const opsH = opsRows[0] || [];
  const rawH = rawRows[0] || [];
  const opsOrder = opsH.indexOf("신청번호");
  const opsName = opsH.indexOf("이름");
  const opsConfirmed = opsH.indexOf("확정예약상태");
  const rawOrder = rawH.indexOf("신청번호");

  let full = 0;
  let wipedConfirmed = 0;
  const wipedSamples = [];
  for (let i = 1; i < opsRows.length; i++) {
    const r = opsRows[i] || [];
    const order = String(r[opsOrder] ?? "").trim();
    const name = String(r[opsName] ?? "").trim();
    const confirmed = String(r[opsConfirmed] ?? "").trim();
    if (order && name) full += 1;
    if (!order && !name && confirmed === "예약확정") {
      wipedConfirmed += 1;
      if (wipedSamples.length < 15) {
        wipedSamples.push({ row: i + 1, cells: r.slice(0, 24) });
      }
    }
  }

  const rawOrders = new Set(
    rawRows.slice(1).map((r) => String(r[rawOrder] ?? "").trim()).filter(Boolean),
  );
  const opsOrders = new Set(
    opsRows
      .slice(1)
      .map((r) => String(r[opsOrder] ?? "").trim())
      .filter(Boolean),
  );

  console.log(
    JSON.stringify(
      {
        opsFullNamedRows: full,
        opsWipedButConfirmed: wipedConfirmed,
        rawOrders: rawOrders.size,
        opsOrders: opsOrders.size,
        rawNotInOps: [...rawOrders].filter((o) => !opsOrders.has(o)).length,
        wipedSamples,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
