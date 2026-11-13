/**
 * 사전예약 결제 완료됐지만 예약확정 알림톡이 안 간 건 수동 발송
 * 대상: NR-b8d71c01-c5ea-4e40-93d3-20e4a2e23b91 (노보람 / 송파)
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { google } from "googleapis";
import { getNhnBankConfirmTemplateCode } from "../lib/nhn-bank-confirm-templates";

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

const ORDER = "NR-b8d71c01-c5ea-4e40-93d3-20e4a2e23b91";
const OPS =
  process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || "스윔잇 수강자 운영";

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

const res = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: `'${OPS.replace(/'/g, "''")}'!A:T`,
  valueRenderOption: "FORMATTED_VALUE",
});
const values = res.data.values || [];
const header = (values[0] || []).map((h) => String(h || "").trim());
const idx = (name: string) => header.findIndex((h) => h === name);
const colOrder = idx("신청번호");
const colName = idx("이름");
const colPhone = idx("전화번호");
const colClass = idx("클래스");
const colActual = idx("실제 클래스") >= 0 ? idx("실제 클래스") : idx("실제클래스");
const colDate = idx("날짜");
const colRegion = idx("특강지역");
const colSession = idx("회차");
const colNotify = idx("마지막알림") >= 0 ? idx("마지막알림") : 19;
const colConfirmed = idx("확정예약상태");
const colPayment = idx("입금상태");

let rowNumber = -1;
let row: string[] = [];
for (let i = 1; i < values.length; i++) {
  if (String(values[i]?.[colOrder] ?? "").trim() === ORDER) {
    rowNumber = i + 1;
    row = values[i] || [];
    break;
  }
}
if (rowNumber < 0) {
  console.error("[수동발송] 행을 찾지 못함", ORDER);
  process.exit(1);
}

const lastNotify = String(row[colNotify] ?? "").trim();
const confirmed = String(row[colConfirmed] ?? "").trim();
const payment = String(row[colPayment] ?? "").trim();
const customerName = String(row[colName] ?? "").trim();
const phone = String(row[colPhone] ?? "").replace(/\D/g, "");
const center = String(row[colRegion] ?? "").trim();
const className = String(
  (colActual >= 0 ? row[colActual] : "") || row[colClass] || "",
).trim();
const session = String(row[colSession] ?? "").trim() || "1부";
const dateRaw = String(row[colDate] ?? "").trim();

console.log("[수동발송] 행 확인", {
  rowNumber,
  customerName,
  phoneTail: phone.slice(-4),
  center,
  className,
  session,
  dateRaw,
  confirmed,
  payment,
  lastNotify,
});

if (lastNotify === "예약확정") {
  console.log("[수동발송] 이미 T=예약확정 — 재발송 안 함");
  process.exit(0);
}
if (confirmed !== "예약확정" || payment !== "입금완료") {
  console.error("[수동발송] 확정/입금 상태 아님 — 중단");
  process.exit(1);
}

const iso = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
const classDateLabel = iso
  ? `${iso[1]}년 ${Number(iso[2])}월 ${Number(iso[3])}일`
  : dateRaw;
const picked = getNhnBankConfirmTemplateCode({ center, className });
const templateParameter = {
  고객명: customerName,
  특강일: classDateLabel,
  장소: center,
  클래스명: className,
  타임: session.match(/(\d+부)/)?.[1] || session || "1부",
};
for (const [k, v] of Object.entries(templateParameter)) {
  if (!v || /#\{/.test(v)) {
    console.error("[수동발송] 변수 치환 실패", k, v);
    process.exit(1);
  }
}

const appKey = process.env.NHN_APPKEY!.trim();
const secretKey = process.env.NHN_SECRET_KEY!.trim();
const senderKey = process.env.NHN_SENDER_KEY!.trim();
const idempotencyKey = `SWIMIT-MANUAL-CONFIRM-${ORDER}`.slice(0, 120);

console.log("[수동발송] NHN 요청", {
  templateCode: picked.templateCode,
  kakaoTemplateCode: picked.kakaoTemplateCode,
  templateParameter,
  idempotencyKey,
});

const nhnRes = await fetch(
  `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/messages`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret-Key": secretKey,
      "X-NC-API-IDEMPOTENCY-KEY": idempotencyKey,
    },
    body: JSON.stringify({
      senderKey,
      templateCode: picked.templateCode,
      recipientList: [
        {
          recipientNo: phone,
          templateParameter,
        },
      ],
    }),
  },
);
const nhnBody = await nhnRes.json().catch(() => ({}));
console.log("[수동발송] NHN 응답", JSON.stringify(nhnBody).slice(0, 800));

if (!nhnBody?.header?.isSuccessful) {
  console.error("[수동발송] 발송 실패");
  process.exit(1);
}

const colLetter = (n: number) => {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
};

await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `'${OPS.replace(/'/g, "''")}'!${colLetter(colNotify)}${rowNumber}`,
  valueInputOption: "USER_ENTERED",
  requestBody: { values: [["예약확정"]] },
});
console.log("[수동발송] 성공 — T열 예약확정 기록", {
  rowNumber,
  templateCode: picked.templateCode,
});
