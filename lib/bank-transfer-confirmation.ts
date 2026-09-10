import "server-only";

import { randomUUID } from "crypto";
import { google } from "googleapis";
import { formatAlimtalkClassDateLabel } from "@/lib/reservation-confirm-alimtalk";
import {
  getNhnBankConfirmTemplateCode,
  NhnBankConfirmTemplateError,
} from "@/lib/nhn-bank-confirm-templates";

const OPS_SHEET_DEFAULT = "스윔잇 수강자 운영";
/**
 * 동시 요청 잠금용 (성공 전 임시값, 실패 시 빈칸으로 복구)
 * 예전 값 "발송중"도 잠금으로 인식한다.
 */
export const BANK_CONFIRM_LOCK_VALUE = "예약확정 발송중";
const BANK_CONFIRM_LOCK_VALUE_LEGACY = "발송중";
export const BANK_CONFIRM_DONE_VALUE = "예약확정";
export const BANK_CONFIRM_PAYMENT_DONE = "입금완료";
/** T열 = 20번째 컬럼 (A=1 … T=20) → 0-based index 19 */
const COL_T_INDEX0 = 19;

function isBankConfirmLockValue(raw: string): boolean {
  const t = String(raw || "").trim();
  return t === BANK_CONFIRM_LOCK_VALUE || t === BANK_CONFIRM_LOCK_VALUE_LEGACY;
}

/** NHN X-NC-API-IDEMPOTENCY-KEY: 시도마다 고유 (실패 즉시 재시도 가능) */
export function buildBankConfirmIdempotencyKey(reservationId: string): string {
  const id = String(reservationId || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 64);
  const key = `BANK-CONFIRM-${id || "UNKNOWN"}-${randomUUID()}`;
  return key.slice(0, 128);
}

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
  /** B열 신청번호 (예: WC-1788602742588-7587) */
  reservationId: string;
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
  /** T셀 note — 잠금 소유권 확인용 */
  lastNotifyNote: string;
};

export type ProcessBankTransferConfirmationResult = {
  /** Apps Script 성공 판정용: ok === true && sent === true */
  ok: boolean;
  /** 실제 발송 완료(또는 이미 발송됨 멱등) */
  sent: boolean;
  /** @deprecated ok와 동일 — 하위 호환 */
  success: boolean;
  skipped?: boolean;
  alreadySent?: boolean;
  reason?: string;
  rowNumber: number;
  sheetName: string;
  reservationId?: string;
  reservationConfirmed?: boolean;
  /** @deprecated sent와 동일 — 하위 호환 */
  alimtalkSent?: boolean;
  templateCode?: string;
  requestId?: string;
  idempotencyKey?: string;
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
  // B신청번호 … T마지막알림
  const range = `'${sheetName}'!B${rowNumber}:T${rowNumber}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const row = (res.data.values?.[0] || []) as string[];
  // B=0 … T=18
  // B신청번호 C고객명 D전화 … K신청클래스(9) L회차(10) … N날짜(12) O장소(13) P실제(14) … R(16) S(17) T(18)
  const reservationId = cell(row, 0); // B
  const customerName = cell(row, 1); // C
  const customerPhone = cell(row, 2); // D
  const appliedClass = cell(row, 9); // K
  const session = normalizeSession(cell(row, 10)); // L
  const dateRaw = cell(row, 12); // N
  const center = cell(row, 13); // O
  const actualClass = cell(row, 14); // P
  const className = normalizeClassName(actualClass || appliedClass);
  const confirmedStatus = cell(row, 16); // R
  const paymentStatus = cell(row, 17); // S
  const lastNotify = cell(row, 18); // T

  let lastNotifyNote = "";
  try {
    lastNotifyNote = await readOpsTCellNote(sheetName, rowNumber);
  } catch (noteErr) {
    console.warn("[NHN입금확정] T셀 메모 조회 실패", noteErr);
  }

  const classDateLabel = formatBankConfirmClassDate(dateRaw);

  console.log("[NHN입금확정] 클래스명 선택", {
    sheetName,
    rowNumber,
    reservationId: reservationId || "(빈칸)",
    actualClass: actualClass || "(빈칸)",
    appliedClass: appliedClass || "(빈칸)",
    className,
  });

  return {
    rowNumber,
    sheetName,
    reservationId,
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
    lastNotifyNote,
  };
}

async function readOpsTCellNote(
  sheetName: string,
  rowNumber: number,
): Promise<string> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: env.spreadsheetId,
    ranges: [`'${sheetName}'!T${rowNumber}`],
    fields: "sheets.data.rowData.values.note",
  });
  const note =
    meta.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]?.note ?? "";
  return String(note || "").trim();
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

/**
 * R/S 갱신 + T="예약확정 발송중" + note(소유권 토큰)을 한 번에 기록
 */
async function acquireBankConfirmSendLock(params: {
  sheetName: string;
  rowNumber: number;
  lockToken: string;
}): Promise<void> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  const { sheetName, rowNumber, lockToken } = params;
  const sheetId = await resolveSheetId(sheetName);
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: env.spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `'${sheetName}'!R${rowNumber}`,
          values: [[BANK_CONFIRM_DONE_VALUE]],
        },
        {
          range: `'${sheetName}'!S${rowNumber}`,
          values: [[BANK_CONFIRM_PAYMENT_DONE]],
        },
      ],
    },
  });

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
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: BANK_CONFIRM_LOCK_VALUE },
                    note: lockToken,
                  },
                ],
              },
            ],
            fields: "userEnteredValue,note",
          },
        },
      ],
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
    return resultOkSent({
      ok: false,
      sent: false,
      rowNumber,
      sheetName,
      error: `허용되지 않은 sheetName: ${sheetName}`,
    });
  }

  // 1) 최신 행 재조회 (발송 직전 T 재확인)
  let row = await readOpsRow(sheetName, rowNumber);
  console.log("[NHN입금확정] 행 조회", {
    sheetName,
    rowNumber,
    reservationId: row.reservationId || "(빈칸)",
    paymentStatus: row.paymentStatus,
    lastNotify: row.lastNotify || "(빈칸)",
    confirmedStatus: row.confirmedStatus,
    center: row.center,
    className: row.className,
    session: row.session,
  });

  // 2) 조건: S=입금완료
  if (row.paymentStatus !== BANK_CONFIRM_PAYMENT_DONE) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `입금상태 불일치: S="${row.paymentStatus}"`,
      rowNumber,
      sheetName,
      reservationId: row.reservationId || undefined,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `입금상태 불일치: S="${row.paymentStatus}"`,
    });
  }

  // T === 예약확정 → 이미 발송 완료 (NHN 재호출 금지)
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
      alreadySent: true,
      skipped: true,
      reason: "이미 예약확정 알림톡 발송됨 (T=예약확정)",
      rowNumber,
      sheetName,
      reservationId: row.reservationId || undefined,
      reservationConfirmed: true,
    });
  }

  // T === 예약확정 발송중 → 다른 요청 처리 중
  if (isBankConfirmLockValue(row.lastNotify)) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `다른 요청이 발송 처리 중 (T=${row.lastNotify})`,
      rowNumber,
      sheetName,
      reservationId: row.reservationId || undefined,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `다른 요청이 발송 처리 중 (T=${row.lastNotify})`,
    });
  }

  // T가 그 외 값 → 처리 불가 (빈칸만 진행)
  if (row.lastNotify) {
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `마지막알림이 비어 있지 않음: T="${row.lastNotify}"`,
      rowNumber,
      sheetName,
      reservationId: row.reservationId || undefined,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `마지막알림이 비어 있지 않음: T="${row.lastNotify}"`,
    });
  }

  if (!row.reservationId) {
    await updateOpsCells(sheetName, rowNumber, {
      r: BANK_CONFIRM_DONE_VALUE,
      s: BANK_CONFIRM_PAYMENT_DONE,
      t: "",
    });
    const err = "신청번호(B열)가 비어 있습니다.";
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
      reservationId: row.reservationId,
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
      reservationId: row.reservationId,
      reservationConfirmed: true,
      error: err,
      nhnSendFailed: true,
    });
  }

  // 3) 처리 시작: T = 예약확정 발송중 (+ note에 소유권 토큰, 값·메모 동시 기록)
  const lockToken = `LOCK:${randomUUID()}`;
  await acquireBankConfirmSendLock({
    sheetName,
    rowNumber,
    lockToken,
  });

  console.log("[NHN입금확정] T=예약확정 발송중 잠금", {
    sheetName,
    rowNumber,
    reservationId: row.reservationId,
  });

  // 재조회로 잠금 소유 확인 (동시 요청 시 두 번째가 NHN으로 가지 않게)
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
      alreadySent: true,
      skipped: true,
      reason: "재조회 시 이미 T=예약확정",
      rowNumber,
      sheetName,
      reservationId: row.reservationId || undefined,
      reservationConfirmed: true,
    });
  }

  const ownsLock =
    row.lastNotify === BANK_CONFIRM_LOCK_VALUE &&
    row.lastNotifyNote === lockToken;

  if (!ownsLock) {
    // 다른 요청이 잠금을 가져감 — T를 지우지 않음
    return resultOkSent({
      ok: false,
      sent: false,
      skipped: true,
      reason: `잠금 확보 실패: T="${row.lastNotify}"`,
      rowNumber,
      sheetName,
      reservationId: row.reservationId || undefined,
      reservationConfirmed: row.confirmedStatus === BANK_CONFIRM_DONE_VALUE,
      error: `잠금 확보 실패: T="${row.lastNotify}"`,
    });
  }

  // 시도마다 고유 키 (동일 예약이라도 실패 후 즉시 재시도 가능)
  const idempotencyKey = buildBankConfirmIdempotencyKey(row.reservationId);
  console.log("[NHN입금확정] idempotency key", {
    reservationId: row.reservationId,
    idempotencyKey,
  });

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
      reservationId: row.reservationId,
    });
    return resultOkSent({
      ok: true,
      sent: true,
      skipped: false,
      rowNumber,
      sheetName,
      reservationId: row.reservationId,
      reservationConfirmed: true,
      templateCode,
      requestId: sendResult.requestId,
      idempotencyKey,
    });
  }

  // 실패: 반드시 T 빈칸 복구 (예약확정 발송중 잔류 금지) → 즉시 재시도 가능
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
  console.error("[NHN입금확정] 발송 실패 — T 빈칸 복구 (재시도 가능)", {
    sheetName,
    rowNumber,
    reservationId: row.reservationId,
    error: sendResult.error,
    idempotencyKey,
  });

  return resultOkSent({
    ok: false,
    sent: false,
    rowNumber,
    sheetName,
    reservationId: row.reservationId,
    reservationConfirmed: true,
    templateCode,
    idempotencyKey,
    error: sendResult.error,
    nhnSendFailed: true,
  });
}

/**
 * 계좌이체 입금완료 → 예약확정 NHN 알림톡
 * Apps Script는 rowNumber만 전달하고, 서버가 시트를 다시 읽는다.
 * 동시성: 인스턴스 내 직렬화 + 시트 T="예약확정 발송중"(소유권 note)
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
