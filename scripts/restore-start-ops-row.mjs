/**
 * 박지회 스타트 신청 — 운영 시트 756행 복구
 * (수강자 시트 + 수정 전 점검 로그 기준)
 */
import { google } from "googleapis";

const ORDER = "CLASS-01F2B69561B4482A84";
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const opsSheet = "스윔잇 수강자 운영";
const rawSheet = "스윔잇 수강자";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

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

function idx(header, name) {
  return header.findIndex((h) => String(h || "").trim() === name);
}

async function main() {
  const sheets = google.sheets({ version: "v4", auth });

  const rawRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${rawSheet}'!A:AZ`,
  });
  const rawRows = rawRes.data.values || [];
  const rawHeader = (rawRows[0] || []).map((h) => String(h || "").trim());
  const rawOrderCol = idx(rawHeader, "신청번호");
  const rawRow = rawRows.find(
    (r, i) => i > 0 && String(r[rawOrderCol] || "").trim() === ORDER,
  );
  if (!rawRow) throw new Error("수강자 시트에서 원본 행을 찾지 못함");

  const pickRaw = (name) => {
    const i = idx(rawHeader, name);
    return i >= 0 ? String(rawRow[i] ?? "") : "";
  };

  const opsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!A1:AZ1`,
  });
  const opsHeader = (opsRes.data.values?.[0] || []).map((h) =>
    String(h || "").trim(),
  );

  // 수정 전 check 스크립트 로그 + 수강자 시트 값으로 복구
  const restore = {
    접수일시: pickRaw("접수일시"),
    신청번호: ORDER,
    이름: pickRaw("이름") || "박지회",
    전화번호: pickRaw("전화번호"),
    이메일: pickRaw("이메일"),
    성별: pickRaw("성별"),
    거주지역: pickRaw("거주지역"),
    수영경력: pickRaw("수영경력"),
    통증부위: pickRaw("통증부위"),
    해결문제: pickRaw("해결문제"),
    클래스: "스타트",
    회차: "1부",
    레인: pickRaw("레인") || "미배정",
    날짜: pickRaw("날짜") || "2026-10-18",
    특강지역: pickRaw("특강지역") || "서울 목동 · 목동스포츠센터",
    "실제 클래스": "스타트",
    예약상태: pickRaw("예약상태") || "결제완료",
    확정예약상태: "예약확정",
    입금상태: "입금완료",
    마지막알림: "예약확정",
    정원키: "2026-10-18-1부-스타트-서울 목동 · 목동스포츠센터",
  };

  // 기존에 남아 있던 숫자성 열은 유지하기 위해 현재 행을 먼저 읽음
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!A756:AZ756`,
  });
  const currentRow = current.data.values?.[0] || [];

  const nextRow = opsHeader.map((name, i) => {
    if (Object.prototype.hasOwnProperty.call(restore, name)) {
      return restore[name];
    }
    return currentRow[i] ?? "";
  });

  const endCol = colLetter(Math.max(opsHeader.length - 1, nextRow.length - 1));
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${opsSheet}'!A756:${endCol}756`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [nextRow] },
  });

  console.log("[복구] 운영 시트 756행 복구 완료", {
    신청번호: restore.신청번호,
    이름: restore.이름,
    클래스: restore.클래스,
    회차: restore.회차,
    정원키: restore.정원키,
    확정예약상태: restore.확정예약상태,
  });
}

main().catch((e) => {
  console.error("[복구] 실패:", e.message || e);
  process.exit(1);
});
