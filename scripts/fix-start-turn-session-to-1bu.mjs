/**
 * 스타트 특강 회차 2부 → 1부 수정 (특정 신청번호만)
 * 사용: node --env-file=.env scripts/fix-start-turn-session-to-1bu.mjs
 */
import { google } from "googleapis";

const ORDER = "CLASS-01F2B69561B4482A84";
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function colLetter(index0) {
  let n = index0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
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

async function fixSheet(sheets, title) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A:AZ`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const header = (rows[0] || []).map((h) => String(h || "").trim());
  const colOrder = headerIndex(header, ["신청번호"]);
  const colClass = headerIndex(header, ["클래스"]);
  const colActual = headerIndex(header, ["실제 클래스"]);
  const colSession = headerIndex(header, ["회차"]);
  const colGarden = headerIndex(header, ["정원키"]);

  if (colOrder < 0 || colSession < 0) {
    throw new Error(`[${title}] 신청번호/회차 열을 찾지 못함`);
  }

  const updates = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const order = String(row[colOrder] ?? "").trim();
    if (order !== ORDER) continue;

    const cls = colClass >= 0 ? String(row[colClass] ?? "") : "";
    const actual = colActual >= 0 ? String(row[colActual] ?? "") : "";
    if (!isStartClass(cls) && !isStartClass(actual)) {
      console.warn(`[${title}] 대상 행이지만 클래스가 스타트가 아님 — 스킵`, {
        row: i + 1,
        cls,
        actual,
      });
      continue;
    }

    const rowNum = i + 1;
    const beforeSession = String(row[colSession] ?? "");
    const beforeGarden =
      colGarden >= 0 ? String(row[colGarden] ?? "") : "";

    if (beforeSession !== "1부") {
      updates.push({
        range: `'${title}'!${colLetter(colSession)}${rowNum}`,
        values: [["1부"]],
      });
    }

    if (colGarden >= 0 && beforeGarden.includes("2부-스타트")) {
      const nextGarden = beforeGarden.replace("2부-스타트", "1부-스타트");
      updates.push({
        range: `'${title}'!${colLetter(colGarden)}${rowNum}`,
        values: [[nextGarden]],
      });
    }

    console.log(`[스타트수정] ${title} 행 ${rowNum}`, {
      order,
      beforeSession,
      afterSession: "1부",
      beforeGarden: beforeGarden || "(없음)",
      afterGarden: beforeGarden.includes("2부-스타트")
        ? beforeGarden.replace("2부-스타트", "1부-스타트")
        : beforeGarden || "(변경없음)",
    });
  }

  if (updates.length === 0) {
    console.log(`[스타트수정] ${title}: 변경할 셀 없음`);
    return [];
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates,
    },
  });
  console.log(`[스타트수정] ${title}: ${updates.length}칸 업데이트 완료`);
  return updates;
}

async function main() {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  console.log("[스타트수정] 시작 — 신청번호", ORDER);
  await fixSheet(sheets, opsSheet);
  await fixSheet(sheets, rawSheet);
  console.log("[스타트수정] 완료");
}

main().catch((err) => {
  console.error("[스타트수정] 실패:", err.message || err);
  process.exit(1);
});
