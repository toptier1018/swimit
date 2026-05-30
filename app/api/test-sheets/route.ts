import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const results: Record<string, string> = {};

  // 환경 변수 체크
  results.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL
    ? "✅ 있음"
    : "❌ 없음";
  results.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
    ? `✅ 있음 (${process.env.GOOGLE_PRIVATE_KEY.slice(0, 30)}...)`
    : "❌ 없음";
  results.GOOGLE_SHEETS_SPREADSHEET_ID = process.env
    .GOOGLE_SHEETS_SPREADSHEET_ID
    ? "✅ 있음"
    : "❌ 없음";
  results.GOOGLE_SHEETS_SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME
    ? `✅ 있음 (${process.env.GOOGLE_SHEETS_SHEET_NAME})`
    : "❌ 없음";

  // Google Sheets 연결 테스트
  try {
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
      /\\n/g,
      "\n",
    );
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    });

    results.연결테스트 = "✅ 구글 시트 연결 성공!";
  } catch (err) {
    results.연결테스트 = `❌ 연결 실패: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json(results);
}
