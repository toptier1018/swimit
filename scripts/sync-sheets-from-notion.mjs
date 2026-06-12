/**
 * Notion → Google Sheets 누락분 복구 (로컬 실행)
 * node scripts/sync-sheets-from-notion.mjs
 */
import fs from "fs";
import path from "path";
import { google } from "googleapis";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function richText(prop) {
  const arr = prop?.rich_text;
  if (!Array.isArray(arr)) return "";
  return arr.map((t) => t.plain_text ?? "").join("").trim();
}

function titleText(prop) {
  const arr = prop?.title;
  if (!Array.isArray(arr)) return "";
  return arr.map((t) => t.plain_text ?? "").join("").trim();
}

function dateStart(prop) {
  return prop?.date?.start ?? "";
}

function formatNotionDateForSheet(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function parseSelectedClassFull(full) {
  const m = full.match(/^\[[^\]]+\]\s+(\d+부\s*특강)\s+(\d+레인)\s+(.+)$/);
  if (m) {
    const 회차 = m[1].replace(/\s+/g, " ").match(/\d+부/)?.[0] ?? m[1];
    return { 회차, 레인: m[2], 클래스: m[3].trim() };
  }
  return { 회차: "", 레인: "", 클래스: full };
}

const CLASS_DATES = {
  서초: "2026-05-31",
  김포: "2026-06-14",
  화성: "2026-06-21",
  목동: "2026-06-28",
  은평: "2026-07-05",
  삼정: "2026-07-05",
};

function guessClassDate(region, selectedClass) {
  for (const [key, date] of Object.entries(CLASS_DATES)) {
    if (region.includes(key) || selectedClass.includes(key)) return date;
  }
  return "";
}

function pageToRow(page) {
  const p = page.properties;
  const orderNumber = richText(p["주문번호"]);
  if (!orderNumber) return null;
  const selectedClass = richText(p["선택된 클래스"]);
  const region = richText(p["지역"]);
  const parsed = parseSelectedClassFull(selectedClass);
  const phoneRaw = richText(p["전화번호"]);
  return [
    formatNotionDateForSheet(dateStart(p["결제 진행 시간"])),
    orderNumber,
    titleText(p["이름"]),
    phoneRaw ? `'${phoneRaw.replace(/-/g, "")}` : "",
    richText(p["이메일 (특강/ 수영 제품 할인 정보를 제공합니다)"]),
    richText(p["성별"]),
    richText(p["거주지역"]),
    richText(p["수영을 배우신 지 얼마나 되셨나요?"]),
    richText(
      p["수영 후 통증이 느껴지거나 불편한 부위가 있나요? (중복 선택 가능)"],
    ),
    richText(p["이번 특강을 통해 가장 해결하고 싶은 단 하나는 무엇인가요?"]),
    parsed.클래스,
    parsed.회차,
    parsed.레인,
    guessClassDate(region, selectedClass),
    region,
    richText(p["가상계좌 입금 정보"]) || "입금대기",
  ];
}

async function fetchNotionPages() {
  const key = process.env.NOTION_API_KEY;
  const db = process.env.NOTION_DATABASE_ID;
  const pages = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: { property: "주문번호", rich_text: { is_not_empty: true } },
        sorts: [{ property: "결제 진행 시간", direction: "ascending" }],
        start_cursor: cursor,
        page_size: 100,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function main() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!B:B`,
  });
  const orderSet = new Set();
  for (let i = 1; i < (existing.data.values?.length ?? 0); i++) {
    const c = String(existing.data.values[i]?.[0] ?? "").trim();
    if (c) orderSet.add(c);
  }
  console.log("[복구] 시트 기존 신청번호:", orderSet.size);

  const notionPages = await fetchNotionPages();
  console.log("[복구] Notion 결제 건:", notionPages.length);

  let appended = 0;
  const failed = [];
  const missing = [];

  for (const page of notionPages) {
    const row = pageToRow(page);
    if (!row) continue;
    const orderId = row[1];
    if (orderSet.has(orderId)) continue;
    missing.push({ orderId, name: row[2] });
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetName}'!A:P`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
      orderSet.add(orderId);
      appended++;
      console.log("[복구] 추가:", orderId, row[2]);
    } catch (err) {
      const msg = err?.message ?? String(err);
      failed.push({ orderId, name: row[2], error: msg });
      console.error("[복구] 실패:", orderId, row[2], msg);
    }
  }

  console.log("[복구] 완료 — 새로 추가:", appended);
  console.log("[복구] 누락(시도 대상):", missing.length);
  if (failed.length) {
    console.log("[복구] 실패 목록:", JSON.stringify(failed, null, 2));
    console.log(
      "\n※ 쓰기 권한 오류(403)면 구글 시트 → 공유 →",
      process.env.GOOGLE_CLIENT_EMAIL,
      "→ 편집자 권한을 확인하세요.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
