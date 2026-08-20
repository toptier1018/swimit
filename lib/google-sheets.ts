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
  /** Q: 링크 */
  링크?: string;
  /** R: 입금기한 (무통장 홀드용, 예: 2026. 8. 17 오후 2:00:00) */
  입금기한?: string;
  /** S: 대기순번 */
  대기순번?: string;
  /** U: 유입경로 (T열은 운영용 여백으로 유지) */
  유입경로?: string;
  /** V: video */
  video?: string;
  /** W: source */
  source?: string;
  /** X: utm_source */
  utm_source?: string;
  /** Y: utm_medium */
  utm_medium?: string;
  /** Z: utm_campaign */
  utm_campaign?: string;
};

/** B열(신청번호) 목록 — 중복 복구 방지 */
export async function getSheetOrderNumbers(): Promise<
  | {
      success: true;
      orderNumbers: Set<string>;
    }
  | { success: false; error: string }
> {
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
      입금기한: row["입금기한"] ?? "",
      유입경로: row["유입경로"] ?? "",
      시트명: env.sheetName,
    });

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    // A~S 운영 필드 + T 여백 + U~Z 퍼널 추적 필드
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.sheetName}'!Q1:Z1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "링크",
            "입금기한",
            "대기순번",
            "",
            "유입경로",
            "video",
            "source",
            "utm_source",
            "utm_medium",
            "utm_campaign",
          ],
        ],
      },
    });
    console.log("[Google Sheets] Q~Z 헤더 확인 완료 (퍼널 U열부터)");

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
        row["링크"] ?? "",
        row["입금기한"] ?? "",
        row["대기순번"] ?? "",
        "", // T: 운영 시트에서 자유롭게 사용하는 여백
        row["유입경로"] ?? "",
        row["video"] ?? "",
        row["source"] ?? "",
        row["utm_source"] ?? "",
        row["utm_medium"] ?? "",
        row["utm_campaign"] ?? "",
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.sheetName}'!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    console.log("[Google Sheets] 행 추가 성공:", {
      신청번호: row["신청번호"],
      예약상태: row["예약상태"],
      입금기한: row["입금기한"] ?? "",
      유입경로: row["유입경로"] ?? "",
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error appending to sheet.";
    console.error("[Google Sheets] append error:", message);
    return { success: false, error: message };
  }
}
