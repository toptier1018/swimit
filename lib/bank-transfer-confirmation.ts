import "server-only";

import { google } from "googleapis";
import { formatAlimtalkClassDateLabel } from "@/lib/reservation-confirm-alimtalk";
import {
  getNhnBankConfirmTemplateCode,
  NhnBankConfirmTemplateError,
} from "@/lib/nhn-bank-confirm-templates";

const OPS_SHEET_DEFAULT = "스윔잇 수강자 운영";
/** 동시 요청 잠금용 (성공 전 임시값, 실패 시 빈칸으로 복구) */
export const BANK_CONFIRM_LOCK_VALUE = "발송중";
export const BANK_CONFIRM_DONE_VALUE = "예약확정";

const env = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  opsSheetName:
    process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || OPS_SHEET_DEFAULT,
};

/** 동일 인스턴스 내 동시 요청 직렬화 */
const inFlightByRow = new Map<string, Promise<unknown>>();

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

function cell(row: string[], colIndex0: number): string {
  return String(row[colIndex0] ?? "").trim();
}

/** Sheets 일련번호 → Date (UTC 기준 엑셀 epoch) */
function sheetSerialToParts(serial: number): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) {
    return null;
  }
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function formatBankConfirmClassDate(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) {
    throw new NhnBankConfirmTemplateError(
      "특강일(N열)이 비어 있습니다.",
    );
  }

  // 이미 "2026년 10월 11일" 형태
  if (/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$/.test(s)) {
    return s.replace(/\s+/g, " ");
  }

  // 순수 숫자(시리얼)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const parts = sheetSerialToParts(Number(s));
    if (parts) {
      return `${parts.year}년 ${parts.month}월 ${parts.day}일`;
    }
  }

  try {
    return formatAlimtalkClassDateLabel({ classDate: s });
  } catch {
    const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
      return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
    }
    throw new NhnBankConfirmTemplateError(
      `특강일 형식 오류: raw="${s}"`,
    );
  }
}

function normalizeSession(raw: string): string {
  const m = String(raw || "").match(/(\d+부)/);
  return m?.[1] || String(raw || "").trim() || "1부";
}

function normalizeClassName(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/(?:저항\s*)?진단/.test(s)) return "진단";
  const stroke = s.match(/(자유형|평영|접영|배영)/)?.[1];
  return stroke || s;
}

export type OpsBankConfirmRow = {
  rowNumber: number;
  sheetName: string;
  customerName: string;
  customerPhone: string;
  session: string;
  dateRaw: string;
  classDateLabel: string;
  center: string;
  className: string;
  confirmedStatus: string;
  paymentStatus: string;
  lastNotify: string;
};

export type ProcessBankTransferConfirmationResult = {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  rowNumber: number;
  sheetName: string;
  reservationConfirmed?: boolean;
  alimtalkSent?: boolean;
  templateCode?: string;
  requestId?: string;
  error?: string;
};

async function readOpsRow(
  sheetName: string,
  rowNumber: number,
): Promise<OpsBankConfirmRow> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error(`잘못된 rowNumber: ${rowNumber}`);
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const range = `'${sheetName}'!C${rowNumber}:T${rowNumber}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const row = (res.data.values?.[0] || []) as string[];
  // C..T → index 0 = C
  const customerName = cell(row, 0); // C
  const customerPhone = cell(row, 1); // D
  const session = normalizeSession(cell(row, 9)); // L (C=0 … L=9)
  const dateRaw = cell(row, 11); // N
  const center = cell(row, 12); // O
  const className = normalizeClassName(cell(row, 13)); // P
  const confirmedStatus = cell(row, 15); // R
  const paymentStatus = cell(row, 16); // S
  const lastNotify = cell(row, 17); // T

  const classDateLabel = formatBankConfirmClassDate(dateRaw);

  return {
    rowNumber,
    sheetName,
    customerName,
    customerPhone: customerPhone.replace(/-/g, ""),
    session,
    dateRaw,
    classDateLabel,
    center,
    className,
    confirmedStatus,
    paymentStatus,
    lastNotify,
  };
}

async function updateOpsCells(
  sheetName: string,
  rowNumber: number,
  updates: { r?: string; t?: string },
): Promise<void> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const data: { range: string; values: string[][] }[] = [];

  if (updates.r !== undefined) {
    data.push({
      range: `'${sheetName}'!R${rowNumber}`,
      values: [[updates.r]],
    });
  }
  if (updates.t !== undefined) {
    data.push({
      range: `'${sheetName}'!T${rowNumber}`,
      values: [[updates.t]],
    });
  }
  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: env.spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });
}

async function sendNhnBankConfirmAlimtalk(params: {
  templateCode: string;
  customerName: string;
  customerPhone: string;
  classDateLabel: string;
  center: string;
  className: string;
  session: string;
  idempotencyKey: string;
}): Promise<
  | { success: true; requestId?: string }
  | { success: false; error: string }
> {
  const appKey = process.env.NHN_APPKEY?.trim() || "";
  const secretKey = process.env.NHN_SECRET_KEY?.trim() || "";
  const senderKey = process.env.NHN_SENDER_KEY?.trim() || "";

  if (!appKey || !secretKey || !senderKey) {
    return {
      success: false,
      error: "NHN_APPKEY / NHN_SECRET_KEY / NHN_SENDER_KEY 필요",
    };
  }

  const requestBody = {
    senderKey,
    templateCode: params.templateCode,
    recipientList: [
      {
        recipientNo: params.customerPhone,
        templateParameter: {
          고객명: params.customerName,
          특강일: params.classDateLabel,
          장소: params.center,
          클래스명: params.className,
          타임: params.session,
        },
      },
    ],
  };

  console.log("[NHN입금확정] 발송 요청", {
    templateCode: params.templateCode,
    center: params.center,
    className: params.className,
    session: params.session,
    classDateLabel: params.classDateLabel,
    idempotencyKey: params.idempotencyKey,
    phoneTail: params.customerPhone.slice(-4),
  });

  const response = await fetch(
    `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Secret-Key": secretKey,
        "X-NC-API-IDEMPOTENCY-KEY": params.idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    },
  );

  const result = await response.json().catch(() => ({}));
  const requestId =
    result?.message?.requestId != null
      ? String(result.message.requestId)
      : result?.header?.requestId != null
        ? String(result.header.requestId)
        : undefined;

  if (result?.header?.isSuccessful) {
    console.log("[NHN입금확정] 발송 성공", {
      templateCode: params.templateCode,
      ...(requestId ? { requestId } : {}),
    });
    return { success: true, requestId };
  }

  const error =
    result?.header?.resultMessage ||
    result?.message ||
    `NHN 발송 실패 (HTTP ${response.status})`;
  console.error("[NHN입금확정] 발송 실패", {
    templateCode: params.templateCode,
    code: result?.header?.resultCode,
    message: error,
  });
  return { success: false, error: String(error) };
}

async function processBankTransferConfirmationInner(input: {
  sheetName: string;
  rowNumber: number;
}): Promise<ProcessBankTransferConfirmationResult> {
  const sheetName = String(input.sheetName || "").trim() || OPS_SHEET_DEFAULT;
  const rowNumber = Number(input.rowNumber);

  const allowedNames = new Set([
    OPS_SHEET_DEFAULT,
    env.opsSheetName,
    "스윔잇 수강자 운영",
  ]);
  if (!allowedNames.has(sheetName)) {
    return {
      success: false,
      rowNumber,
      sheetName,
      error: `허용되지 않은 sheetName: ${sheetName}`,
    };
  }

  // 1) 최신 행 재조회
  let row = await readOpsRow(sheetName, rowNumber);
  console.log("[NHN입금확정] 행 조회", {
    sheetName,
    rowNumber,
    paymentStatus: row.paymentStatus,
    lastNotify: row.lastNotify || "(빈칸)",
    confirmedStatus: row.confirmedStatus,
    center: row.center,
    className: row.className,
    session: row.session,
  });

  // 2) 조건: S=입금완료, T=빈칸
  if (row.paymentStatus !== "입금완료") {
    return {
      success: true,
      skipped: true,
      reason: `입금상태 불일치: S="${row.paymentStatus}"`,
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      alimtalkSent: false,
    };
  }

  if (row.lastNotify === BANK_CONFIRM_DONE_VALUE) {
    return {
      success: true,
      skipped: true,
      reason: "이미 예약확정 알림톡 발송됨 (T=예약확정)",
      rowNumber,
      sheetName,
      reservationConfirmed: true,
      alimtalkSent: true,
    };
  }

  if (row.lastNotify === BANK_CONFIRM_LOCK_VALUE) {
    return {
      success: true,
      skipped: true,
      reason: "다른 요청이 발송 처리 중 (T=발송중)",
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      alimtalkSent: false,
    };
  }

  if (row.lastNotify) {
    return {
      success: true,
      skipped: true,
      reason: `마지막알림이 비어 있지 않음: T="${row.lastNotify}"`,
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      alimtalkSent: false,
    };
  }

  if (!row.customerName || !row.customerPhone) {
    return {
      success: false,
      rowNumber,
      sheetName,
      error: "고객명 또는 전화번호가 비어 있습니다.",
    };
  }

  const { templateCode } = getNhnBankConfirmTemplateCode({
    center: row.center,
    className: row.className,
  });

  // 3) R=예약확정 + T=발송중 (동시성 잠금)
  await updateOpsCells(sheetName, rowNumber, {
    r: BANK_CONFIRM_DONE_VALUE,
    t: BANK_CONFIRM_LOCK_VALUE,
  });

  // 재조회로 잠금 소유 확인 (다른 요청이 먼저 끝냈을 수 있음)
  row = await readOpsRow(sheetName, rowNumber);
  if (row.lastNotify === BANK_CONFIRM_DONE_VALUE) {
    return {
      success: true,
      skipped: true,
      reason: "재조회 시 이미 T=예약확정",
      rowNumber,
      sheetName,
      reservationConfirmed: true,
      alimtalkSent: true,
    };
  }
  if (row.lastNotify !== BANK_CONFIRM_LOCK_VALUE) {
    return {
      success: true,
      skipped: true,
      reason: `잠금 확보 실패: T="${row.lastNotify}"`,
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      alimtalkSent: false,
    };
  }

  const idempotencyKey = `swimit-bank-confirm-${env.spreadsheetId}-${sheetName}-${rowNumber}`
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 128);

  const sendResult = await sendNhnBankConfirmAlimtalk({
    templateCode,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    classDateLabel: row.classDateLabel,
    center: row.center,
    className: row.className,
    session: row.session,
    idempotencyKey,
  });

  if (sendResult.success) {
    await updateOpsCells(sheetName, rowNumber, {
      t: BANK_CONFIRM_DONE_VALUE,
    });
    console.log("[NHN입금확정] T=예약확정 기록", { sheetName, rowNumber });
    return {
      success: true,
      skipped: false,
      rowNumber,
      sheetName,
      reservationConfirmed: true,
      alimtalkSent: true,
      templateCode,
      requestId: sendResult.requestId,
    };
  }

  // 실패: T 빈칸 복구, R/S 유지
  await updateOpsCells(sheetName, rowNumber, { t: "" });
  console.error("[NHN입금확정] 발송 실패 — T 빈칸 유지, R=예약확정 유지", {
    sheetName,
    rowNumber,
    error: sendResult.error,
  });

  return {
    success: false,
    rowNumber,
    sheetName,
    reservationConfirmed: true,
    alimtalkSent: false,
    templateCode,
    error: sendResult.error,
  };
}

/**
 * 계좌이체 입금완료 → 예약확정 NHN 알림톡
 * Apps Script는 rowNumber만 전달하고, 서버가 시트를 다시 읽는다.
 */
export async function processBankTransferConfirmation(input: {
  sheetName: string;
  rowNumber: number;
}): Promise<ProcessBankTransferConfirmationResult> {
  const sheetName = String(input.sheetName || "").trim() || OPS_SHEET_DEFAULT;
  const rowNumber = Number(input.rowNumber);
  const lockKey = `${sheetName}:${rowNumber}`;

  const previous = inFlightByRow.get(lockKey) || Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(() => processBankTransferConfirmationInner(input));

  inFlightByRow.set(lockKey, run);
  try {
    return await run;
  } finally {
    if (inFlightByRow.get(lockKey) === run) {
      inFlightByRow.delete(lockKey);
    }
  }
}
