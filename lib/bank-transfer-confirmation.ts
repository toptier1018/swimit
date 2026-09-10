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
export const BANK_CONFIRM_PAYMENT_DONE = "입금완료";
/** T열 = 20번째 컬럼 (A=1 … T=20) → 0-based index 19 */
const COL_T_INDEX0 = 19;

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
  /** Apps Script 성공 판정용: ok === true && sent === true */
  ok: boolean;
  /** 실제 발송 완료(또는 이미 발송됨 멱등) */
  sent: boolean;
  /** @deprecated ok와 동일 — 하위 호환 */
  success: boolean;
  skipped?: boolean;
  reason?: string;
  rowNumber: number;
  sheetName: string;
  reservationConfirmed?: boolean;
  /** @deprecated sent와 동일 — 하위 호환 */
  alimtalkSent?: boolean;
  templateCode?: string;
  requestId?: string;
  error?: string;
  /** NHN 발송 시도 후 실패 → API는 HTTP 502 */
  nhnSendFailed?: boolean;
};

function resultOkSent(
  partial: Omit<ProcessBankTransferConfirmationResult, "ok" | "sent" | "success" | "alimtalkSent"> & {
    ok: boolean;
    sent: boolean;
  },
): ProcessBankTransferConfirmationResult {
  return {
    ...partial,
    success: partial.ok,
    alimtalkSent: partial.sent,
  };
}

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
  // C고객명 D전화 E… K신청클래스(8) L회차(9) … N날짜(11) O장소(12) P실제클래스(13) … R(15) S(16) T(17)
  const customerName = cell(row, 0); // C
  const customerPhone = cell(row, 1); // D
  const appliedClass = cell(row, 8); // K 신청 클래스
  const session = normalizeSession(cell(row, 9)); // L
  const dateRaw = cell(row, 11); // N
  const center = cell(row, 12); // O
  const actualClass = cell(row, 13); // P 실제 클래스
  // 클래스명: 실제 클래스(P) 우선, 없으면 신청 클래스(K)
  const className = normalizeClassName(actualClass || appliedClass);
  const confirmedStatus = cell(row, 15); // R
  const paymentStatus = cell(row, 16); // S
  const lastNotify = cell(row, 17); // T

  const classDateLabel = formatBankConfirmClassDate(dateRaw);

  console.log("[NHN입금확정] 클래스명 선택", {
    sheetName,
    rowNumber,
    actualClass: actualClass || "(빈칸)",
    appliedClass: appliedClass || "(빈칸)",
    className,
  });

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
  updates: { r?: string; s?: string; t?: string },
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
  if (updates.s !== undefined) {
    data.push({
      range: `'${sheetName}'!S${rowNumber}`,
      values: [[updates.s]],
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

const sheetIdCache = new Map<string, number>();

async function resolveSheetId(sheetName: string): Promise<number> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  const cached = sheetIdCache.get(sheetName);
  if (cached != null) return cached;

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: env.spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const found = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName,
  );
  const sheetId = found?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`시트 ID를 찾을 수 없습니다: ${sheetName}`);
  }
  sheetIdCache.set(sheetName, sheetId);
  return sheetId;
}

/** T셀 메모 설정. note가 빈 문자열이면 clearNote와 동일 */
async function setOpsTCellNote(
  sheetName: string,
  rowNumber: number,
  note: string,
): Promise<void> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  const sheetId = await resolveSheetId(sheetName);
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.spreadsheetId,
    requestBody: {
      requests: [
        {
          updateCells: {
            range: {
              sheetId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: COL_T_INDEX0,
              endColumnIndex: COL_T_INDEX0 + 1,
            },
            rows: [{ values: [{ note }] }],
            fields: "note",
          },
        },
      ],
    },
  });

  console.log("[NHN입금확정] T셀 메모", {
    sheetName,
    rowNumber,
    cleared: !note,
    notePreview: note ? note.slice(0, 80) : "(clear)",
  });
}

async function clearOpsTCellNote(
  sheetName: string,
  rowNumber: number,
): Promise<void> {
  await setOpsTCellNote(sheetName, rowNumber, "");
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
    return resultOkSent({
      ok: false,
      sent: false,
      rowNumber,
      sheetName,
      error: `허용되지 않은 sheetName: ${sheetName}`,
    });
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
  if (row.paymentStatus !== BANK_CONFIRM_PAYMENT_DONE) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `입금상태 불일치: S="${row.paymentStatus}"`,
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `입금상태 불일치: S="${row.paymentStatus}"`,
    });
  }

  // 이미 발송됨 → 멱등 성공 (중복 발송 방지) + 실패 메모 제거
  if (row.lastNotify === BANK_CONFIRM_DONE_VALUE) {
    await updateOpsCells(sheetName, rowNumber, {
      r: BANK_CONFIRM_DONE_VALUE,
      s: BANK_CONFIRM_PAYMENT_DONE,
      t: BANK_CONFIRM_DONE_VALUE,
    });
    try {
      await clearOpsTCellNote(sheetName, rowNumber);
    } catch (noteErr) {
      console.warn("[NHN입금확정] 기존 발송건 메모 제거 실패", noteErr);
    }
    return resultOkSent({
      ok: true,
      sent: true,
      skipped: true,
      reason: "이미 예약확정 알림톡 발송됨 (T=예약확정)",
      rowNumber,
      sheetName,
      reservationConfirmed: true,
    });
  }

  if (row.lastNotify === BANK_CONFIRM_LOCK_VALUE) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: "다른 요청이 발송 처리 중 (T=발송중)",
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: "다른 요청이 발송 처리 중 (T=발송중)",
    });
  }

  if (row.lastNotify) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `마지막알림이 비어 있지 않음: T="${row.lastNotify}"`,
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `마지막알림이 비어 있지 않음: T="${row.lastNotify}"`,
    });
  }

  if (!row.customerName || !row.customerPhone) {
    await updateOpsCells(sheetName, rowNumber, {
      r: BANK_CONFIRM_DONE_VALUE,
      s: BANK_CONFIRM_PAYMENT_DONE,
      t: "",
    });
    const err = "고객명 또는 전화번호가 비어 있습니다.";
    try {
      await setOpsTCellNote(sheetName, rowNumber, err);
    } catch (noteErr) {
      console.warn("[NHN입금확정] 실패 메모 기록 실패", noteErr);
    }
    return resultOkSent({
      ok: false,
      sent: false,
      rowNumber,
      sheetName,
      reservationConfirmed: true,
      error: err,
      nhnSendFailed: false,
    });
  }

  let templateCode: string;
  try {
    ({ templateCode } = getNhnBankConfirmTemplateCode({
      center: row.center,
      className: row.className,
    }));
  } catch (tplErr) {
    const err =
      tplErr instanceof Error ? tplErr.message : "템플릿 매핑 실패";
    await updateOpsCells(sheetName, rowNumber, {
      r: BANK_CONFIRM_DONE_VALUE,
      s: BANK_CONFIRM_PAYMENT_DONE,
      t: "",
    });
    try {
      await setOpsTCellNote(sheetName, rowNumber, err);
    } catch (noteErr) {
      console.warn("[NHN입금확정] 실패 메모 기록 실패", noteErr);
    }
    return resultOkSent({
      ok: false,
      sent: false,
      rowNumber,
      sheetName,
      reservationConfirmed: true,
      error: err,
      nhnSendFailed: true,
    });
  }

  // 3) R=예약확정 + S=입금완료 + T=발송중 (동시성 잠금)
  await updateOpsCells(sheetName, rowNumber, {
    r: BANK_CONFIRM_DONE_VALUE,
    s: BANK_CONFIRM_PAYMENT_DONE,
    t: BANK_CONFIRM_LOCK_VALUE,
  });

  // 재조회로 잠금 소유 확인 (다른 요청이 먼저 끝냈을 수 있음)
  row = await readOpsRow(sheetName, rowNumber);
  if (row.lastNotify === BANK_CONFIRM_DONE_VALUE) {
    try {
      await clearOpsTCellNote(sheetName, rowNumber);
    } catch (noteErr) {
      console.warn("[NHN입금확정] 메모 제거 실패", noteErr);
    }
    return resultOkSent({
      ok: true,
      sent: true,
      skipped: true,
      reason: "재조회 시 이미 T=예약확정",
      rowNumber,
      sheetName,
      reservationConfirmed: true,
    });
  }
  if (row.lastNotify !== BANK_CONFIRM_LOCK_VALUE) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `잠금 확보 실패: T="${row.lastNotify}"`,
      rowNumber,
      sheetName,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `잠금 확보 실패: T="${row.lastNotify}"`,
    });
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
      r: BANK_CONFIRM_DONE_VALUE,
      s: BANK_CONFIRM_PAYMENT_DONE,
      t: BANK_CONFIRM_DONE_VALUE,
    });
    try {
      await clearOpsTCellNote(sheetName, rowNumber);
    } catch (noteErr) {
      console.warn("[NHN입금확정] 성공 후 메모 제거 실패", noteErr);
    }
    console.log("[NHN입금확정] 성공 R/S/T 확정 + 메모 clear", {
      sheetName,
      rowNumber,
    });
    return resultOkSent({
      ok: true,
      sent: true,
      skipped: false,
      rowNumber,
      sheetName,
      reservationConfirmed: true,
      templateCode,
      requestId: sendResult.requestId,
    });
  }

  // 실패: T 빈칸 복구, R=예약확정 / S=입금완료 유지, T셀에 오류 메모
  await updateOpsCells(sheetName, rowNumber, {
    r: BANK_CONFIRM_DONE_VALUE,
    s: BANK_CONFIRM_PAYMENT_DONE,
    t: "",
  });
  try {
    await setOpsTCellNote(sheetName, rowNumber, sendResult.error);
  } catch (noteErr) {
    console.warn("[NHN입금확정] 실패 메모 기록 실패", noteErr);
  }
  console.error("[NHN입금확정] 발송 실패 — T 빈칸 + 오류 메모", {
    sheetName,
    rowNumber,
    error: sendResult.error,
  });

  return resultOkSent({
    ok: false,
    sent: false,
    rowNumber,
    sheetName,
    reservationConfirmed: true,
    templateCode,
    error: sendResult.error,
    nhnSendFailed: true,
  });
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
