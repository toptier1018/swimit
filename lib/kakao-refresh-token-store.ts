/**
 * 카카오 Refresh Token 런타임 저장소
 * - Google Sheets 전용 시트에 AES-256-GCM 암호화 저장
 * - Vercel 환경변수는 부트스트랩/백업용, 로테이션 값은 여기가 정본
 * - 토큰 값은 로그에 출력하지 않음
 */

import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { google } from "googleapis";

const SHEET_TITLE = "__swimit_kakao_oauth";
const CELL_RANGE = `${SHEET_TITLE}!B1`;
const META_RANGE = `${SHEET_TITLE}!A1:B3`;

function getSpreadsheetId(): string {
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
}

function getAuthClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) {
    throw new Error("Google Sheets 인증 환경변수가 없습니다.");
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function deriveKey(): Buffer {
  const secret =
    process.env.KAKAO_CLIENT_SECRET?.trim() ||
    process.env.KAKAO_REST_API_KEY?.trim() ||
    "";
  if (!secret) {
    throw new Error("카카오 암호화 키가 없습니다.");
  }
  return createHash("sha256")
    .update(`swimit-kakao-rt-v1:${secret}`)
    .digest();
}

function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < 12 + 16 + 1) {
    throw new Error("암호문 형식이 올바르지 않습니다.");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

async function ensureSecretSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,hidden))",
  });
  const existing = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_TITLE,
  );
  if (existing?.properties?.sheetId != null) {
    if (!existing.properties.hidden) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: existing.properties.sheetId,
                  hidden: true,
                },
                fields: "hidden",
              },
            },
          ],
        },
      });
      console.log("[카카오토큰저장소] 시트를 숨김 처리했습니다.");
    }
    return;
  }

  console.log("[카카오토큰저장소] 전용 시트 생성");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: SHEET_TITLE,
              hidden: true,
              gridProperties: { rowCount: 10, columnCount: 3 },
            },
          },
        },
      ],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: META_RANGE,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["refresh_token_enc", ""],
        ["updated_at", ""],
        ["note", "자동관리 — 수동 편집 금지"],
      ],
    },
  });
}

/**
 * 저장소에서 Refresh Token 로드 (없으면 null)
 */
export async function loadKakaoRefreshTokenFromStore(): Promise<string | null> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    console.warn("[카카오토큰저장소] GOOGLE_SHEETS_SPREADSHEET_ID 없음");
    return null;
  }

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    await ensureSecretSheet(sheets, spreadsheetId);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: CELL_RANGE,
    });
    const enc = String(res.data.values?.[0]?.[0] ?? "").trim();
    if (!enc) {
      console.log("[카카오토큰저장소] 저장된 토큰 없음");
      return null;
    }

    const plain = decryptToken(enc).trim();
    if (!plain) {
      console.warn("[카카오토큰저장소] 복호화 결과가 비어 있음");
      return null;
    }

    console.log("[카카오토큰저장소] 토큰 로드 성공", { length: plain.length });
    return plain;
  } catch (err) {
    console.error("[카카오토큰저장소] 로드 실패:", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/**
 * Refresh Token을 저장소에 암호화 저장
 */
export async function saveKakaoRefreshTokenToStore(
  refreshToken: string,
): Promise<boolean> {
  const token = refreshToken.trim();
  if (!token) {
    console.error("[카카오토큰저장소] 저장 거부: 빈 토큰");
    return false;
  }

  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    console.error("[카카오토큰저장소] GOOGLE_SHEETS_SPREADSHEET_ID 없음");
    return false;
  }

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    await ensureSecretSheet(sheets, spreadsheetId);

    const enc = encryptToken(token);
    const updatedAt = new Date().toISOString();

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: META_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["refresh_token_enc", enc],
          ["updated_at", updatedAt],
          ["note", "자동관리 — 수동 편집 금지"],
        ],
      },
    });

    console.log("[카카오토큰저장소] 토큰 저장 성공", {
      length: token.length,
      updatedAt,
    });
    return true;
  } catch (err) {
    console.error("[카카오토큰저장소] 저장 실패:", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}
