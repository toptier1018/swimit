import "server-only";
import { google } from "googleapis";

const env = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME,
};

function getAuthClient() {
  if (!env.clientEmail || !env.privateKey) {
    throw new Error(
      "GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be set in the environment.",
    );
  }

  const privateKey = env.privateKey.replace(/\\n/g, "\n");

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: env.clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export type GoogleSheetRowInput = {
  /** A: 접수일시 */
  접수일시: string;
  /** B: 신청번호 */
  신청번호: string;
  /** C: 이름 */
  이름: string;
  /** D: 전화번호 */
  전화번호: string;
  /** E: 이메일 */
  이메일: string;
  /** F: 성별 */
  성별: string;
  /** G: 거주지역 */
  거주지역: string;
  /** H: 수영경력 */
  수영경력: string;
  /** I: 통증부위 */
  통증부위: string;
  /** J: 해결문제 */
  해결문제: string;
  /** K: 클래스 */
  클래스: string;
  /** L: 회차 */
  회차: string;
  /** M: 레인 */
  레인: string;
  /** N: 날짜 */
  날짜: string;
  /** O: 특강지역 */
  특강지역: string;
  /** P: 예약상태 */
  예약상태: string;
};

/** 시트 B열(신청번호) 목록 — 중복 복구 방지 */
export async function getSheetOrderNumbers(): Promise<{
  success: true;
  orderNumbers: Set<string>;
} | { success: false; error: string }> {
  try {
    if (!env.spreadsheetId || !env.sheetName) {
      return {
        success: false,
        error:
          "GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_SHEET_NAME must be set.",
      };
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.sheetName}'!B:B`,
    });

    const rows = res.data.values ?? [];
    const orderNumbers = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const cell = String(rows[i]?.[0] ?? "").trim();
      if (cell) orderNumbers.add(cell);
    }

    console.log("[Google Sheets] 기존 신청번호 개수:", orderNumbers.size);
    return { success: true, orderNumbers };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to read sheet.";
    console.error("[Google Sheets] read error:", message);
    return { success: false, error: message };
  }
}

export async function appendRowToGoogleSheet(
  row: GoogleSheetRowInput,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!env.spreadsheetId || !env.sheetName) {
      return {
        success: false,
        error:
          "GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_SHEET_NAME must be set.",
      };
    }

    console.log("[Google Sheets] 행 추가 시작:", {
      신청번호: row["신청번호"],
      예약상태: row["예약상태"],
      시트명: env.sheetName,
    });

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const values: string[][] = [
      [
        row["접수일시"],
        row["신청번호"],
        row["이름"],
        row["전화번호"],
        row["이메일"],
        row["성별"],
        row["거주지역"],
        row["수영경력"],
        row["통증부위"],
        row["해결문제"],
        row["클래스"],
        row["회차"],
        row["레인"],
        row["날짜"],
        row["특강지역"],
        row["예약상태"],
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.sheetName}'!A:P`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    console.log("[Google Sheets] 행 추가 성공:", {
      신청번호: row["신청번호"],
      예약상태: row["예약상태"],
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error appending to sheet.";
    console.error("[Google Sheets] append error:", message);
    return { success: false, error: message };
  }
}
