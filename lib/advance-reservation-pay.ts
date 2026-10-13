/**
 * 사전예약 공용 결제 (/reservation-pay)
 * - 휴대폰 뒤 4자리 조회 → (중복 시) 전체번호 → 예약 선택 → 결제
 * - 새 신청 row 생성 없음. 기존 NR- row만 확정·입금완료로 갱신
 */
import "server-only";
import { google } from "googleapis";
import { randomUUID } from "crypto";
import {
  matchesSpecialClassOption,
  resolveClassScheduleFromEnrollmentKey,
} from "@/lib/class-schedule-data";
import { resolveClassBasePaymentAmount } from "@/lib/class-payment-amount";
import { updateCardPaymentSheetStatusByOrderNumber } from "@/lib/google-sheets";
import {
  ADVANCE_PAY_CLOSED_MESSAGE,
  getAdvancePayTargetYearMonth,
  getAdvanceReservationPayWindowStatus,
  isAdvanceReservationPayWindowOpen,
} from "@/lib/advance-reservation-window";

const ADVANCE_BENEFIT_AMOUNT = 5000;
const TOSS_ORDER_HEADER = "토스주문번호";

const env = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || "스윔잇 수강자",
};

function getAuthClient() {
  if (!env.clientEmail || !env.privateKey) {
    throw new Error(
      "GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be set.",
    );
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: env.clientEmail,
      private_key: env.privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  for (const name of candidates) {
    const idx = header.findIndex((h) => String(h || "").trim() === name);
    if (idx >= 0) return idx;
  }
  return -1;
}

function columnIndexToLetter(index0: number): string {
  let n = index0 + 1;
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function normalizePhoneDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

function compactStatus(value: string): string {
  return String(value || "").replace(/\s/g, "");
}

function isAdvanceStatus(statusRaw: string): boolean {
  const c = compactStatus(statusRaw);
  return c === "사전예약" || c === "예약대기";
}

function isPaidRow(confirmedRaw: string, paymentRaw: string, statusRaw: string): boolean {
  const confirmed = compactStatus(confirmedRaw);
  const payment = compactStatus(paymentRaw);
  const status = compactStatus(statusRaw);
  return (
    confirmed === "예약확정" ||
    payment === "입금완료" ||
    status.includes("결제완료") ||
    status.includes("입금완료")
  );
}

function isClosed(statusRaw: string, confirmedRaw: string): boolean {
  const c = compactStatus(statusRaw) + compactStatus(confirmedRaw);
  return c.includes("만료") || c.includes("취소") || c.includes("환불");
}

function maskPhone(digits: string): string {
  if (digits.length < 4) return "****";
  if (digits.length >= 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  }
  return `****-${digits.slice(-4)}`;
}

function formatReservationLabel(input: {
  date: string;
  region: string;
  className: string;
}): string {
  const date = String(input.date || "").trim();
  let dateLabel = date;
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    dateLabel = `${Number(iso[2])}/${Number(iso[3])}`;
  } else {
    const md = date.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (md) dateLabel = `${Number(md[1])}/${Number(md[2])}`;
  }

  const regionRaw = String(input.region || "").trim();
  const region =
    regionRaw.split(/[·・]/)[0]?.trim() ||
    regionRaw.replace(/\s+/g, " ") ||
    "센터";

  let classLabel = String(input.className || "").trim();
  const stroke = classLabel.match(
    /(자유형|평영|접영|배영|스타트|턴)(?:\s*장거리\s*집중반)?/,
  );
  if (stroke) {
    classLabel = classLabel.includes("장거리")
      ? `${stroke[1]} 장거리`
      : stroke[1];
  } else {
    classLabel = classLabel.replace(/^\[[^\]]+\]\s*/, "").replace(/^\d+부\s*/, "");
  }

  return `${dateLabel} ${region} ${classLabel}`.replace(/\s+/g, " ").trim();
}

/** 사전예약 결제 금액 — 시트 혜택값 우선, 없으면 정상가-5,000 */
export function resolveAdvanceReservationPayAmount(input: {
  className: string;
  expectedAmountRaw?: string | number;
  originalAmountRaw?: string | number;
  discountAmountRaw?: string | number;
}): number | null {
  const expected = Number(input.expectedAmountRaw);
  if (Number.isFinite(expected) && expected > 0) {
    return Math.round(expected);
  }

  const original = Number(input.originalAmountRaw);
  const discount = Number(input.discountAmountRaw);
  if (
    Number.isFinite(original) &&
    original > 0 &&
    Number.isFinite(discount) &&
    discount >= 0
  ) {
    return Math.round(original - discount);
  }

  const className = String(input.className || "").trim();
  if (!className) return null;

  // enrollment key가 아니면 시트「클래스」만 있는 경우 → 지역·날짜 없는 짧은 이름일 수 있음
  const base =
    resolveClassBasePaymentAmount(className) ??
    (/진단/.test(className)
      ? null
      : /장거리|3시간|집중/.test(className)
        ? 115000
        : /특강|자유형|평영|접영|스타트|제로/.test(className)
          ? 80000
          : null);

  if (base == null) return null;
  if (/진단/.test(className)) return base;

  const resolved = resolveClassScheduleFromEnrollmentKey(className);
  const intensive =
    resolved?.schedule.specialClass &&
    matchesSpecialClassOption(className, resolved.schedule.specialClass) &&
    resolved.schedule.specialClass.specialType === "intensive-3h";

  const normal = intensive
    ? resolved!.schedule.specialClass!.price
    : base;
  const amount = Math.max(0, normal - ADVANCE_BENEFIT_AMOUNT);
  console.log("[사전예약결제] 금액 계산:", {
    className,
    normal,
    discount: ADVANCE_BENEFIT_AMOUNT,
    amount,
  });
  return amount;
}

export type AdvanceReservationItem = {
  orderNumber: string;
  label: string;
  customerName: string;
  phoneMasked: string;
  className: string;
  date: string;
  region: string;
  session: string;
  amount: number;
  status: "unpaid" | "paid";
  statusLabel: string;
};

export type AdvanceLookupResult =
  | {
      ok: true;
      needFullPhone: false;
      items: AdvanceReservationItem[];
      targetYear: number;
      targetMonth: number;
    }
  | {
      ok: true;
      needFullPhone: true;
      message: string;
      items: [];
      targetYear: number;
      targetMonth: number;
    }
  | { ok: false; error: string; code?: string };

type SheetRowRef = {
  rowNumber: number;
  orderNumber: string;
  name: string;
  phoneDigits: string;
  className: string;
  date: string;
  region: string;
  session: string;
  statusRaw: string;
  confirmedRaw: string;
  paymentRaw: string;
  expectedAmountRaw: string;
  originalAmountRaw: string;
  discountAmountRaw: string;
  tossOrderId: string;
};

async function loadAdvanceRows(): Promise<{
  sheets: ReturnType<typeof google.sheets>;
  header: string[];
  rows: SheetRowRef[];
}> {
  if (!env.spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.");
  }
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId,
    range: `'${env.sheetName.replace(/'/g, "''")}'!A:AZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = res.data.values ?? [];
  if (values.length < 2) {
    return { sheets, header: [], rows: [] };
  }

  const header = (values[0] || []).map((h) => String(h || "").trim());
  const colOrder = findHeaderIndex(header, ["신청번호"]);
  const colName = findHeaderIndex(header, ["이름"]);
  const colPhone = findHeaderIndex(header, ["전화번호"]);
  const colClass = findHeaderIndex(header, ["클래스"]);
  const colDate = findHeaderIndex(header, ["날짜"]);
  const colRegion = findHeaderIndex(header, ["특강지역"]);
  const colSession = findHeaderIndex(header, ["회차"]);
  const colStatus = findHeaderIndex(header, ["예약상태"]);
  const colConfirmed = findHeaderIndex(header, ["확정예약상태"]);
  const colPayment = findHeaderIndex(header, ["입금상태"]);
  const colExpected = findHeaderIndex(header, ["할인 후 예정 금액"]);
  const colOriginal = findHeaderIndex(header, ["할인 전 금액"]);
  const colDiscount = findHeaderIndex(header, ["예약 할인액"]);
  const colToss = findHeaderIndex(header, [TOSS_ORDER_HEADER]);

  if (colOrder < 0 || colPhone < 0) {
    throw new Error("수강자 시트에 신청번호/전화번호 열이 없습니다.");
  }

  const rows: SheetRowRef[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const orderNumber = String(row[colOrder] ?? "").trim();
    if (!orderNumber.startsWith("NR-")) continue;

    const statusRaw =
      colStatus >= 0 ? String(row[colStatus] ?? "").trim() : "";
    const confirmedRaw =
      colConfirmed >= 0 ? String(row[colConfirmed] ?? "").trim() : "";
    const paymentRaw =
      colPayment >= 0 ? String(row[colPayment] ?? "").trim() : "";

    if (isClosed(statusRaw, confirmedRaw)) continue;

    const paid = isPaidRow(confirmedRaw, paymentRaw, statusRaw);
    const advance = isAdvanceStatus(statusRaw);
    if (!paid && !advance) continue;

    const phoneDigits = normalizePhoneDigits(
      String(row[colPhone] ?? ""),
    );
    if (phoneDigits.length < 4) continue;

    rows.push({
      rowNumber: i + 1,
      orderNumber,
      name: colName >= 0 ? String(row[colName] ?? "").trim() : "",
      phoneDigits,
      className: colClass >= 0 ? String(row[colClass] ?? "").trim() : "",
      date: colDate >= 0 ? String(row[colDate] ?? "").trim() : "",
      region: colRegion >= 0 ? String(row[colRegion] ?? "").trim() : "",
      session: colSession >= 0 ? String(row[colSession] ?? "").trim() : "",
      statusRaw,
      confirmedRaw,
      paymentRaw,
      expectedAmountRaw:
        colExpected >= 0 ? String(row[colExpected] ?? "").trim() : "",
      originalAmountRaw:
        colOriginal >= 0 ? String(row[colOriginal] ?? "").trim() : "",
      discountAmountRaw:
        colDiscount >= 0 ? String(row[colDiscount] ?? "").trim() : "",
      tossOrderId: colToss >= 0 ? String(row[colToss] ?? "").trim() : "",
    });
  }

  return { sheets, header, rows };
}

/** 예약 일정의 연·월 (다음 달 대상 필터용) */
function resolveRowYearMonth(
  row: Pick<SheetRowRef, "date" | "className">,
): { year: number; month: number } | null {
  const date = String(row.date || "").trim();
  const iso = date.match(/^(\d{4})-(\d{2})/);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]) };
  }
  const korean = date.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
  if (korean) {
    return { year: Number(korean[1]), month: Number(korean[2]) };
  }

  const resolved = resolveClassScheduleFromEnrollmentKey(row.className);
  if (resolved?.schedule?.year && resolved.schedule.month) {
    return {
      year: resolved.schedule.year,
      month: resolved.schedule.month,
    };
  }

  // [부산 11/8] — 연도 없음 → month만 (year=0). 필터에서 대상 연·월과 month 비교
  const label = String(row.className || "").match(
    /\[\s*[^\]]*?(?:(\d{4})\s*[./-]\s*)?(\d{1,2})\s*[./]\s*(\d{1,2})\s*\]/,
  );
  if (label) {
    const year = label[1] ? Number(label[1]) : 0;
    const month = Number(label[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  return null;
}

function isTargetScheduleRow(
  row: Pick<SheetRowRef, "date" | "className">,
  targetYear: number,
  targetMonth: number,
): boolean {
  const ym = resolveRowYearMonth(row);
  if (!ym) return false;
  if (ym.year === 0) return ym.month === targetMonth;
  return ym.year === targetYear && ym.month === targetMonth;
}

function assertPayWindowOpen():
  | { ok: true }
  | { ok: false; error: string; code: "WINDOW_CLOSED" } {
  if (isAdvanceReservationPayWindowOpen()) return { ok: true };
  const status = getAdvanceReservationPayWindowStatus();
  console.warn("[사전예약결제] 기간 외 요청 거부:", status.kst);
  return {
    ok: false,
    error: ADVANCE_PAY_CLOSED_MESSAGE,
    code: "WINDOW_CLOSED",
  };
}

function toPublicItem(row: SheetRowRef): AdvanceReservationItem | null {
  const paid = isPaidRow(row.confirmedRaw, row.paymentRaw, row.statusRaw);
  const amount = resolveAdvanceReservationPayAmount({
    className: row.className,
    expectedAmountRaw: row.expectedAmountRaw,
    originalAmountRaw: row.originalAmountRaw,
    discountAmountRaw: row.discountAmountRaw,
  });
  if (!paid && (amount == null || amount <= 0)) {
    console.warn("[사전예약결제] 금액 계산 실패 — 목록에서 제외:", {
      orderNumber: row.orderNumber,
      className: row.className,
    });
    return null;
  }

  return {
    orderNumber: row.orderNumber,
    label: formatReservationLabel({
      date: row.date,
      region: row.region,
      className: row.className,
    }),
    customerName: row.name,
    phoneMasked: maskPhone(row.phoneDigits),
    className: row.className,
    date: row.date,
    region: row.region,
    session: row.session,
    amount: amount ?? 0,
    status: paid ? "paid" : "unpaid",
    statusLabel: paid ? "결제완료 / 예약확정" : "결제 대기",
  };
}

/**
 * 뒤 4자리 또는 전체 번호로 사전예약 조회.
 * 서로 다른 전화번호가 2개 이상 매칭되면 needFullPhone.
 */
export async function lookupAdvanceReservations(input: {
  phoneLast4?: string;
  phoneFull?: string;
}): Promise<AdvanceLookupResult> {
  try {
    const windowGate = assertPayWindowOpen();
    if (!windowGate.ok) {
      return {
        ok: false,
        error: windowGate.error,
        code: windowGate.code,
      };
    }

    const target = getAdvancePayTargetYearMonth();
    const full = normalizePhoneDigits(input.phoneFull || "");
    const last4 = normalizePhoneDigits(input.phoneLast4 || "").slice(-4);

    if (full) {
      if (full.length < 10 || full.length > 11) {
        return {
          ok: false,
          error: "휴대폰 번호 형식을 확인해 주세요.",
          code: "INVALID_PHONE",
        };
      }
    } else if (!/^\d{4}$/.test(last4)) {
      return {
        ok: false,
        error: "휴대폰 번호 뒤 4자리를 입력해 주세요.",
        code: "INVALID_LAST4",
      };
    }

    const { rows } = await loadAdvanceRows();
    const phoneMatched = full
      ? rows.filter((r) => r.phoneDigits === full)
      : rows.filter((r) => r.phoneDigits.endsWith(last4));

    // 결제 대상: 다음 달 일정만 (과거·다른 달 제외)
    const matched = phoneMatched.filter((r) =>
      isTargetScheduleRow(r, target.year, target.month),
    );

    console.log("[사전예약결제] 대상 월 필터:", {
      target: `${target.year}-${target.month}`,
      phoneMatched: phoneMatched.length,
      targetMatched: matched.length,
    });

    if (matched.length === 0) {
      console.log("[사전예약결제] 조회 결과 없음:", {
        mode: full ? "full" : "last4",
        last4: full ? full.slice(-4) : last4,
        target,
      });
      return {
        ok: false,
        error: `${target.year}년 ${target.month}월 사전예약을 찾지 못했습니다. 번호를 다시 확인해 주세요.`,
        code: "NOT_FOUND",
      };
    }

    if (!full) {
      const uniquePhones = new Set(matched.map((r) => r.phoneDigits));
      if (uniquePhones.size >= 2) {
        console.log("[사전예약결제] 뒤4자리 중복 — 전체번호 요청:", {
          last4,
          uniquePhones: uniquePhones.size,
          rows: matched.length,
        });
        return {
          ok: true,
          needFullPhone: true,
          message:
            "동일한 번호가 있습니다.\n예약 시 입력한 휴대폰 전체 번호를 입력해주세요.",
          items: [],
          targetYear: target.year,
          targetMonth: target.month,
        };
      }
    }

    const items = matched
      .map(toPublicItem)
      .filter((item): item is AdvanceReservationItem => item != null)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "unpaid" ? -1 : 1;
        return a.date.localeCompare(b.date);
      });

    if (items.length === 0) {
      return {
        ok: false,
        error: "결제할 수 있는 사전예약이 없습니다.",
        code: "NO_PAYABLE",
      };
    }

    console.log("[사전예약결제] 조회 성공:", {
      mode: full ? "full" : "last4",
      target,
      count: items.length,
      unpaid: items.filter((i) => i.status === "unpaid").length,
    });

    return {
      ok: true,
      needFullPhone: false,
      items,
      targetYear: target.year,
      targetMonth: target.month,
    };
  } catch (error) {
    console.error("[사전예약결제] 조회 실패:", error);
    return {
      ok: false,
      error: "예약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      code: "LOOKUP_FAILED",
    };
  }
}

export async function createAdvanceReservationTossOrder(input: {
  orderNumber: string;
  phoneLast4?: string;
  phoneFull?: string;
}): Promise<
  | {
      success: true;
      tossOrderId: string;
      orderNumber: string;
      amount: number;
      orderName: string;
      customerName: string;
      customerPhone: string;
      clientKey: string;
      label: string;
    }
  | { success: false; error: string; code?: string }
> {
  const windowGate = assertPayWindowOpen();
  if (!windowGate.ok) {
    return {
      success: false,
      error: windowGate.error,
      code: windowGate.code,
    };
  }

  const orderNumber = String(input.orderNumber || "").trim();
  if (!orderNumber.startsWith("NR-")) {
    return { success: false, error: "신청번호가 올바르지 않습니다.", code: "BAD_ORDER" };
  }

  const full = normalizePhoneDigits(input.phoneFull || "");
  const last4 = normalizePhoneDigits(input.phoneLast4 || "").slice(-4);
  if (!full && !/^\d{4}$/.test(last4)) {
    return {
      success: false,
      error: "휴대폰 번호 확인이 필요합니다.",
      code: "PHONE_REQUIRED",
    };
  }

  try {
    const target = getAdvancePayTargetYearMonth();
    const { sheets, header, rows } = await loadAdvanceRows();
    const row = rows.find((r) => r.orderNumber === orderNumber);
    if (!row) {
      return {
        success: false,
        error: "사전예약을 찾지 못했습니다.",
        code: "NOT_FOUND",
      };
    }

    if (!isTargetScheduleRow(row, target.year, target.month)) {
      console.warn("[사전예약결제] 주문 생성 — 대상 월 아님:", {
        orderNumber,
        target,
        date: row.date,
        className: row.className,
      });
      return {
        success: false,
        error: `${target.year}년 ${target.month}월 사전예약만 결제할 수 있습니다.`,
        code: "NOT_TARGET_MONTH",
      };
    }

    const phoneOk = full
      ? row.phoneDigits === full
      : row.phoneDigits.endsWith(last4);
    if (!phoneOk) {
      console.warn("[사전예약결제] 주문 생성 — 전화번호 불일치:", {
        orderNumber,
      });
      return {
        success: false,
        error: "예약 정보와 휴대폰 번호가 일치하지 않습니다.",
        code: "PHONE_MISMATCH",
      };
    }

    // 뒤4자리만으로 생성할 때도 다른 번호와 충돌하면 거부
    if (!full) {
      const sameLast4 = rows.filter(
        (r) =>
          r.phoneDigits.endsWith(last4) &&
          isTargetScheduleRow(r, target.year, target.month),
      );
      const unique = new Set(sameLast4.map((r) => r.phoneDigits));
      if (unique.size >= 2) {
        return {
          success: false,
          error:
            "동일한 번호가 있습니다. 예약 시 입력한 휴대폰 전체 번호를 입력해주세요.",
          code: "NEED_FULL_PHONE",
        };
      }
    }

    if (isPaidRow(row.confirmedRaw, row.paymentRaw, row.statusRaw)) {
      return {
        success: false,
        error: "이미 결제가 완료된 예약입니다.",
        code: "ALREADY_PAID",
      };
    }

    const amount = resolveAdvanceReservationPayAmount({
      className: row.className,
      expectedAmountRaw: row.expectedAmountRaw,
      originalAmountRaw: row.originalAmountRaw,
      discountAmountRaw: row.discountAmountRaw,
    });
    if (amount == null || amount <= 0) {
      return {
        success: false,
        error: "결제 금액을 확인할 수 없습니다.",
        code: "AMOUNT_UNKNOWN",
      };
    }

    const clientKey = process.env.TOSS_CLIENT_KEY ?? "";
    if (!clientKey) {
      return {
        success: false,
        error: "결제 설정이 준비되지 않았습니다.",
        code: "NO_CLIENT_KEY",
      };
    }

    const tossOrderId = `NRPAY-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
    const label = formatReservationLabel({
      date: row.date,
      region: row.region,
      className: row.className,
    });

    // 시트에 토스주문번호 기록 (승인 시 조회용)
    let colToss = findHeaderIndex(header, [TOSS_ORDER_HEADER]);
    const rangeName = `'${env.sheetName.replace(/'/g, "''")}'`;
    if (colToss < 0) {
      const nextHeaders = [...header, TOSS_ORDER_HEADER];
      const end = columnIndexToLetter(nextHeaders.length - 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.spreadsheetId!,
        range: `${rangeName}!A1:${end}1`,
        valueInputOption: "RAW",
        requestBody: { values: [nextHeaders] },
      });
      colToss = nextHeaders.length - 1;
      console.log("[사전예약결제] 토스주문번호 열 추가:", colToss);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId!,
      range: `${rangeName}!${columnIndexToLetter(colToss)}${row.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[tossOrderId]] },
    });

    console.log("[사전예약결제] 주문 생성:", {
      orderNumber,
      tossOrderId,
      amount,
      label,
      phoneTail: row.phoneDigits.slice(-4),
    });

    return {
      success: true,
      tossOrderId,
      orderNumber,
      amount,
      orderName: `스윔잇 ${label}`.slice(0, 100),
      customerName: row.name,
      customerPhone: row.phoneDigits,
      clientKey,
      label,
    };
  } catch (error) {
    console.error("[사전예약결제] 주문 생성 실패:", error);
    return {
      success: false,
      error: "결제 주문을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      code: "CREATE_FAILED",
    };
  }
}

/**
 * Toss 승인 후 기존 NR- row → 예약확정 + 입금완료
 */
export async function confirmAdvanceReservationPayment(input: {
  paymentKey: string;
  tossOrderId: string;
}): Promise<
  | {
      success: true;
      orderNumber: string;
      amount: number;
      label: string;
      customerName: string;
      alreadyConfirmed?: boolean;
    }
  | { success: false; error: string; code?: string }
> {
  const paymentKey = String(input.paymentKey || "").trim();
  const tossOrderId = String(input.tossOrderId || "").trim();
  if (!paymentKey || !tossOrderId.startsWith("NRPAY-")) {
    return {
      success: false,
      error: "결제 정보가 올바르지 않습니다.",
      code: "BAD_INPUT",
    };
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return {
      success: false,
      error: "결제 서버 설정 오류입니다.",
      code: "NO_SECRET",
    };
  }

  try {
    const { rows } = await loadAdvanceRows();
    const row = rows.find((r) => r.tossOrderId === tossOrderId);
    if (!row) {
      console.error("[사전예약결제] 토스주문번호로 행을 찾지 못함:", tossOrderId);
      return {
        success: false,
        error: "주문 정보를 찾지 못했습니다. 고객센터(@스윔잇)로 문의해 주세요.",
        code: "ORDER_NOT_FOUND",
      };
    }

    if (isPaidRow(row.confirmedRaw, row.paymentRaw, row.statusRaw)) {
      console.log("[사전예약결제] 이미 확정된 예약 — 멱등 성공:", row.orderNumber);
      return {
        success: true,
        alreadyConfirmed: true,
        orderNumber: row.orderNumber,
        amount: resolveAdvanceReservationPayAmount({
          className: row.className,
          expectedAmountRaw: row.expectedAmountRaw,
          originalAmountRaw: row.originalAmountRaw,
          discountAmountRaw: row.discountAmountRaw,
        }) ?? 0,
        label: formatReservationLabel(row),
        customerName: row.name,
      };
    }

    // 신규 승인은 결제 기간(매월 13~15일 KST)에만 허용
    const windowGate = assertPayWindowOpen();
    if (!windowGate.ok) {
      return {
        success: false,
        error: windowGate.error,
        code: windowGate.code,
      };
    }

    const target = getAdvancePayTargetYearMonth();
    if (!isTargetScheduleRow(row, target.year, target.month)) {
      return {
        success: false,
        error: `${target.year}년 ${target.month}월 사전예약만 결제할 수 있습니다.`,
        code: "NOT_TARGET_MONTH",
      };
    }

    const amount = resolveAdvanceReservationPayAmount({
      className: row.className,
      expectedAmountRaw: row.expectedAmountRaw,
      originalAmountRaw: row.originalAmountRaw,
      discountAmountRaw: row.discountAmountRaw,
    });
    if (amount == null || amount <= 0) {
      return {
        success: false,
        error: "결제 금액을 확인할 수 없습니다.",
        code: "AMOUNT_UNKNOWN",
      };
    }

    const encoded = Buffer.from(`${secretKey}:`).toString("base64");
    const idempotencyKey = `advance-confirm-${tossOrderId}`;

    const tossRes = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          paymentKey,
          orderId: tossOrderId,
          amount,
        }),
      },
    );
    const tossData = await tossRes.json().catch(() => ({}));

    if (!tossRes.ok) {
      const code = String(tossData?.code || "");
      if (
        code === "ALREADY_PROCESSED_PAYMENT" ||
        String(tossData?.message || "").includes("이미 처리")
      ) {
        const lookup = await fetch(
          `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
          { headers: { Authorization: `Basic ${encoded}` } },
        );
        const looked = await lookup.json().catch(() => null);
        if (
          lookup.ok &&
          looked &&
          String(looked.status) === "DONE" &&
          Number(looked.totalAmount) === amount &&
          String(looked.orderId) === tossOrderId
        ) {
          console.log("[사전예약결제] 기존 승인 건 확인 — 시트 확정 진행");
        } else {
          console.error("[사전예약결제] 토스 승인 실패:", tossData);
          return {
            success: false,
            error: tossData?.message || "결제 승인에 실패했습니다.",
            code: code || "TOSS_FAIL",
          };
        }
      } else {
        console.error("[사전예약결제] 토스 승인 실패:", tossData);
        return {
          success: false,
          error: tossData?.message || "결제 승인에 실패했습니다.",
          code: code || "TOSS_FAIL",
        };
      }
    } else if (
      String(tossData.status) !== "DONE" ||
      Number(tossData.totalAmount) !== amount
    ) {
      console.error("[사전예약결제] 승인 응답 검증 실패:", tossData);
      return {
        success: false,
        error: "결제 승인 결과를 확인할 수 없습니다.",
        code: "CONFIRM_INVALID",
      };
    }

    // 기존 NR- row 업데이트 (새 row 생성 금지)
    const sheetUpdate = await updateCardPaymentSheetStatusByOrderNumber({
      orderNumber: row.orderNumber,
      confirmedStatus: "예약확정",
      paymentStatus: "입금완료",
    });

    // 수강자 시트 예약상태도 결제완료로 (정원·운영 동기화에 유리)
    await markRawReservationPaid(row.orderNumber);

    if (!sheetUpdate.success) {
      console.error("[사전예약결제] 결제는 됐지만 시트 확정 실패:", {
        orderNumber: row.orderNumber,
        error: sheetUpdate.error,
      });
      return {
        success: false,
        error:
          "결제는 완료됐지만 예약 확정 저장에 실패했습니다. 주문번호를 캡처해 고객센터(@스윔잇)로 알려 주세요.",
        code: "SHEET_UPDATE_FAILED",
      };
    }

    console.log("[사전예약결제] 확정 완료:", {
      orderNumber: row.orderNumber,
      tossOrderId,
      amount,
      updated: sheetUpdate.updated,
    });

    return {
      success: true,
      orderNumber: row.orderNumber,
      amount,
      label: formatReservationLabel(row),
      customerName: row.name,
    };
  } catch (error) {
    console.error("[사전예약결제] 승인 처리 예외:", error);
    return {
      success: false,
      error: "결제 처리 중 오류가 발생했습니다.",
      code: "CONFIRM_EXCEPTION",
    };
  }
}

async function markRawReservationPaid(orderNumber: string): Promise<void> {
  try {
    if (!env.spreadsheetId) return;
    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const rangeName = `'${env.sheetName.replace(/'/g, "''")}'`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: `${rangeName}!1:1`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    let header = (res.data.values?.[0] || []).map((h) => String(h || "").trim());
    const needed = ["확정예약상태", "입금상태"];
    let headerChanged = false;
    for (const name of needed) {
      if (!header.includes(name)) {
        header.push(name);
        headerChanged = true;
      }
    }
    if (headerChanged) {
      const end = columnIndexToLetter(header.length - 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.spreadsheetId,
        range: `${rangeName}!A1:${end}1`,
        valueInputOption: "RAW",
        requestBody: { values: [header] },
      });
      console.log("[사전예약결제] 수강자 시트 확정/입금 열 확보");
    }

    const colOrder = findHeaderIndex(header, ["신청번호"]);
    const colStatus = findHeaderIndex(header, ["예약상태"]);
    const colConfirmed = findHeaderIndex(header, ["확정예약상태"]);
    const colPayment = findHeaderIndex(header, ["입금상태"]);
    if (colOrder < 0) return;

    const all = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: `${rangeName}!A:B`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const values = all.data.values ?? [];
    for (let i = 1; i < values.length; i++) {
      const cell = String(values[i]?.[colOrder] ?? "").trim();
      if (cell !== orderNumber) continue;
      const rowNumber = i + 1;
      const data: { range: string; values: string[][] }[] = [];
      if (colStatus >= 0) {
        data.push({
          range: `${rangeName}!${columnIndexToLetter(colStatus)}${rowNumber}`,
          values: [["결제완료"]],
        });
      }
      if (colConfirmed >= 0) {
        data.push({
          range: `${rangeName}!${columnIndexToLetter(colConfirmed)}${rowNumber}`,
          values: [["예약확정"]],
        });
      }
      if (colPayment >= 0) {
        data.push({
          range: `${rangeName}!${columnIndexToLetter(colPayment)}${rowNumber}`,
          values: [["입금완료"]],
        });
      }
      if (data.length === 0) return;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: env.spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data },
      });
      console.log("[사전예약결제] 수강자 row 확정 기록:", {
        orderNumber,
        row: rowNumber,
        fields: data.length,
      });
      return;
    }
  } catch (error) {
    console.error("[사전예약결제] 예약상태 갱신 실패(확정은 별도):", error);
  }
}
