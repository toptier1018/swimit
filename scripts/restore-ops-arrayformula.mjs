/**
 * 운영 시트 ARRAYFORMULA 복구
 * - A2: 수강자 A:O 연동 배열수식 복원
 * - A3:O 및 수식이 깨진 하드코딩 셀 정리 (확정예약상태 등 R열 이후는 유지)
 * - 정원키(X) 수식의 #REF! 제거
 * - 수강자 시트 박지회 링크 2부 → 1부
 */
import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const opsSheet = "스윔잇 수강자 운영";
const rawSheet = "스윔잇 수강자";
const ORDER = "CLASS-01F2B69561B4482A84";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const A2_FORMULA = `=ARRAYFORMULA(
IF('${rawSheet}'!B2:B="","",
'${rawSheet}'!A2:O
))`;

const Q2_FORMULA = `=ARRAYFORMULA('${rawSheet}'!P2:P)`;

// date-회차-실제클래스-특강지역
const X2_FORMULA = `=ARRAYFORMULA(IF(L2:L="","",TEXT(N2:N,"yyyy-mm-dd")&"-"&L2:L&"-"&IF(P2:P="",K2:K,P2:P)&"-"&O2:O))`;

async function main() {
  const sheets = google.sheets({ version: "v4", auth });

  // 1) 현재 수식/값 상태 확인
  const before = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!A2:X2`,
    valueRenderOption: "FORMULA",
  });
  console.log("[복구] 복구 전 A2:X2 수식:", before.data.values?.[0]?.slice(0, 3), "...", before.data.values?.[0]?.[23]);

  // 2) A3:O 하드값 제거 (배열수식 spill 방해 제거). 헤더/A2는 별도 처리
  //    큰 범위 clear — R열(확정예약상태) 이후는 건드리지 않음
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${opsSheet}'!A3:O2000`,
  });
  console.log("[복구] A3:O2000 클리어 완료 (배열수식 방해 제거)");

  // 3) A2 배열수식 재설정 (A2:O2 한 줄에 쓰고 배열이 아래로 확장)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${opsSheet}'!A2:O2`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${opsSheet}'!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[A2_FORMULA]] },
  });
  console.log("[복구] A2 ARRAYFORMULA 재설정");

  // 4) Q2 예약상태 배열수식 재설정 (기존에 있으면 유지, 깨졌으면 복원)
  const qFormula = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!Q2`,
    valueRenderOption: "FORMULA",
  });
  const q2 = String(qFormula.data.values?.[0]?.[0] || "");
  if (!q2.includes("ARRAYFORMULA")) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${opsSheet}'!Q2:Q2000`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${opsSheet}'!Q2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[Q2_FORMULA]] },
    });
    console.log("[복구] Q2 ARRAYFORMULA 재설정");
  } else {
    console.log("[복구] Q2 배열수식 유지");
  }

  // 5) 정원키(X) — 깨진 행수식/#REF!/하드코딩 제거 후 배열수식 복원
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${opsSheet}'!X2:X2000`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${opsSheet}'!X2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[X2_FORMULA]] },
  });
  console.log("[복구] X2 정원키 ARRAYFORMULA 재설정");

  // 6) 수강자 시트 박지회 링크 2부 → 1부
  const raw = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${rawSheet}'!A:T`,
  });
  const rawRows = raw.data.values || [];
  const rawHeader = (rawRows[0] || []).map((h) => String(h || "").trim());
  const orderCol = rawHeader.indexOf("신청번호");
  const linkCol = rawHeader.indexOf("링크");
  if (orderCol >= 0 && linkCol >= 0) {
    for (let i = 1; i < rawRows.length; i++) {
      const order = String(rawRows[i]?.[orderCol] || "").trim();
      if (order !== ORDER) continue;
      const link = String(rawRows[i]?.[linkCol] || "");
      if (link.includes("2부-")) {
        const next = link.replace("2부-", "1부-");
        const colLetter = String.fromCharCode(65 + linkCol);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${rawSheet}'!${colLetter}${i + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[next]] },
        });
        console.log("[복구] 수강자 링크 수정:", link, "→", next);
      } else {
        console.log("[복구] 수강자 링크 이미 정상:", link || "(없음)");
      }
    }
  }

  // 7) 검증
  await new Promise((r) => setTimeout(r, 1500));
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!A2:X5`,
  });
  const rows = check.data.values || [];
  console.log("[복구] 검증 A2:B4 / X2:", {
    a2b2: rows[0]?.slice(0, 3),
    a3b3: rows[1]?.slice(0, 3),
    a4b4: rows[2]?.slice(0, 3),
    x2: rows[0]?.[23],
  });

  const opsAll = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!A:C`,
  });
  const named = (opsAll.data.values || [])
    .slice(1)
    .filter((r) => String(r[1] || "").trim() && String(r[2] || "").trim()).length;
  console.log("[복구] 운영시트 이름+신청번호 있는 행 수:", named);

  const startHit = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${opsSheet}'!A:X`,
  });
  const h = startHit.data.values?.[0] || [];
  const oi = h.indexOf("신청번호");
  const si = h.indexOf("회차");
  const xi = h.indexOf("정원키");
  const ci = h.indexOf("클래스");
  const hit = (startHit.data.values || []).find(
    (r, idx) => idx > 0 && String(r[oi] || "").trim() === ORDER,
  );
  console.log("[복구] 박지회 운영행:", {
    신청번호: hit?.[oi],
    이름: hit?.[h.indexOf("이름")],
    클래스: hit?.[ci],
    회차: hit?.[si],
    정원키: hit?.[xi],
  });
}

main().catch((e) => {
  console.error("[복구] 실패:", e.message || e);
  process.exit(1);
});
