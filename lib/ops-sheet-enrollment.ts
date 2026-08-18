import "server-only";
import { google } from "googleapis";
import {
  getBankTransferDeadlineKst,
  formatOpsSheetDateTime,
} from "@/lib/deposit-deadline";

export { getBankTransferDeadlineKst, formatOpsSheetDateTime };

const env = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  /** 운영 정본 시트 */
  opsSheetName:
    process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || "스윔잇 수강자 운영",
  /** 사이트 자동 적재 시트 (무통장 결제대기 즉시 홀드용) */
  rawSheetName: process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || "스윔잇 수강자",
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  for (const name of candidates) {
    const idx = header.findIndex((h) => String(h || "").trim() === name);
    if (idx >= 0) return idx;
  }
  return -1;
}

function compactStatus(value: string): string {
  return String(value || "").replace(/\s/g, "");
}

function isReservationConfirmed(value: string): boolean {
  return compactStatus(value) === "예약확정";
}

function isClosedOpsStatus(value: string): boolean {
  const c = compactStatus(value);
  return c === "만료" || c === "취소" || c === "환불";
}

function isPendingPaymentStatus(value: string): boolean {
  const v = String(value || "").trim();
  return v === "결제대기" || v === "입금대기";
}

function isInvalidGardenKey(value: string): boolean {
  const v = String(value || "").trim();
  if (!v) return true;
  if (v.startsWith("#")) return true;
  return false;
}

/**
 * 운영 시트 정원키 예:
 * 2026-08-23-1부-접영-경기 동탄 · 스윔스튜디오제이
 */
function parseGardenKey(gardenKey: string): {
  month: number;
  day: number;
  sessionNum: string;
  classPart: string;
  regionText: string;
} | null {
  const m = String(gardenKey || "")
    .trim()
    .match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})-(\d+부)-(진단|(?:자유형|평영|접영)(?:\s*[AB]\s*\([^)]+\))?)-(.+)$/,
    );
  if (!m) return null;
  return {
    month: Number(m[2]),
    day: Number(m[3]),
    sessionNum: m[4],
    classPart: m[5].trim(),
    regionText: m[6].trim(),
  };
}

function parseSheetDate(raw: string): { month: number; day: number } | null {
  const s = String(raw || "").trim();
  const a = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (a) return { month: Number(a[2]), day: Number(a[3]) };
  const b = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (b) return { month: Number(b[1]), day: Number(b[2]) };
  return null;
}

function resolveRegionCode(
  regionText: string,
  month: number,
  day: number,
): string | null {
  const t = String(regionText || "");
  if (!t) return null;

  if (t.includes("청라")) {
    if (month === 7 && day === 12) return "인천";
    return "청라";
  }

  const ordered = [
    "동탄",
    "목동",
    "중구",
    "은평",
    "김포",
    "화성",
    "서초",
    "부산",
    "수원",
    "인천",
  ] as const;
  for (const code of ordered) {
    if (t.includes(code)) return code;
  }
  return null;
}

function classPartToEnrollmentSuffix(classPart: string): {
  kind: "diagnosis" | "stroke";
  stroke?: string;
} | null {
  const c = String(classPart || "").trim();
  if (!c) return null;
  if (c === "진단" || c.includes("진단")) {
    return { kind: "diagnosis" };
  }
  for (const stroke of ["자유형", "평영", "접영"] as const) {
    if (c.includes(stroke)) return { kind: "stroke", stroke };
  }
  return null;
}

/** 사이트 enrollment 키: [동탄 8/23] 1부 특강 접영 */
export function opsRowToEnrollmentKey(input: {
  gardenKey?: string;
  date?: string;
  region?: string;
  session?: string;
  className?: string;
  actualClass?: string;
}): string | null {
  let month = 0;
  let day = 0;
  let sessionNum = "";
  let classPart = "";
  let regionText = "";

  if (input.gardenKey && !isInvalidGardenKey(input.gardenKey)) {
    const parsed = parseGardenKey(input.gardenKey);
    if (parsed) {
      month = parsed.month;
      day = parsed.day;
      sessionNum = parsed.sessionNum;
      classPart = parsed.classPart;
      regionText = parsed.regionText;
    }
  }

  if (!month || !day) {
    const d = parseSheetDate(input.date || "");
    if (!d) return null;
    month = d.month;
    day = d.day;
  }

  if (!sessionNum) {
    const sessionRaw = String(input.session || "").trim();
    sessionNum = sessionRaw.match(/^(\d+부)/)?.[1] || "1부";
  }

  if (!classPart) {
    classPart = String(input.actualClass || input.className || "").trim();
  }

  if (!regionText) {
    regionText = String(input.region || "").trim();
  }

  const regionCode = resolveRegionCode(regionText, month, day);
  if (!regionCode) {
    console.warn("[운영시트카운트] 지역 코드 해석 실패:", {
      regionText,
      gardenKey: input.gardenKey,
    });
    return null;
  }

  const suffix = classPartToEnrollmentSuffix(classPart);
  if (!suffix) {
    console.warn("[운영시트카운트] 클래스 해석 실패:", {
      classPart,
      gardenKey: input.gardenKey,
    });
    return null;
  }

  const dateLabel = `${month}/${day}`;
  if (suffix.kind === "diagnosis") {
    return `[${regionCode} ${dateLabel}] ${sessionNum} 진단`;
  }
  return `[${regionCode} ${dateLabel}] ${sessionNum} 특강 ${suffix.stroke}`;
}

/** 입금기한 문자열 → epoch ms (시각 포함, KST 해석) */
export function parseSheetDeadlineMs(raw: string): number | null {
  const s = String(raw || "").trim();
  if (!s || s === "main" || s.length < 8) return null;

  // 반드시 오전/오후 시각이 있어야 입금기한으로 인정
  const ko = s.match(
    /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (ko) {
    let hour = Number(ko[5]);
    const min = Number(ko[6]);
    const sec = ko[7] != null ? Number(ko[7]) : 0;
    if (ko[4] === "오후" && hour < 12) hour += 12;
    if (ko[4] === "오전" && hour === 12) hour = 0;
    return Date.UTC(
      Number(ko[1]),
      Number(ko[2]) - 1,
      Number(ko[3]),
      hour - 9,
      min,
      sec,
    );
  }

  // 2026-08-16 14:00:00 형태
  const western = s.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (western) {
    return Date.UTC(
      Number(western[1]),
      Number(western[2]) - 1,
      Number(western[3]),
      Number(western[4]) - 9,
      Number(western[5]),
      western[6] != null ? Number(western[6]) : 0,
    );
  }

  return null;
}

function defaultDeadlineFromReceivedMs(receivedRaw: string): number | null {
  const s = String(receivedRaw || "").trim();
  const withTime = s.match(
    /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (withTime) {
    let hour = Number(withTime[5]);
    const min = Number(withTime[6]);
    const sec = withTime[7] != null ? Number(withTime[7]) : 0;
    if (withTime[4] === "오후" && hour < 12) hour += 12;
    if (withTime[4] === "오전" && hour === 12) hour = 0;
    const receivedMs = Date.UTC(
      Number(withTime[1]),
      Number(withTime[2]) - 1,
      Number(withTime[3]),
      hour - 9,
      min,
      sec,
    );
    return getBankTransferDeadlineKst(new Date(receivedMs)).getTime();
  }

  const d = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (!d) return null;
  const approx = new Date(
    Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), 12, 0, 0),
  );
  return getBankTransferDeadlineKst(approx).getTime();
}

function resolveHoldDeadlineMs(input: {
  deadlineRaw?: string;
  receivedRaw?: string;
}): number | null {
  const fromZ = parseSheetDeadlineMs(input.deadlineRaw || "");
  if (fromZ != null) return fromZ;
  return defaultDeadlineFromReceivedMs(input.receivedRaw || "");
}

function isHoldStillValid(deadlineMs: number | null, nowMs: number): boolean {
  if (deadlineMs == null) return false;
  return deadlineMs >= nowMs;
}

type CountableKind = "confirmed" | "hold";

/**
 * 자리 카운트:
 * - R(확정예약상태)=예약확정 → 확정
 * - Q(예약상태)=결제대기|입금대기 이고 R이 만료/취소가 아니며 입금기한 전 → 홀드
 * - T(마지막알림)는 안내톡용이므로 카운트에 사용하지 않음
 * - 수강자 시트의 결제대기도 홀드(운영에 아직 없는 신청번호만)
 */
export async function getOpsSheetEnrollmentCounts(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  confirmedRows: number;
  holdRows: number;
  error?: string;
}> {
  try {
    if (!env.spreadsheetId) {
      return {
        success: false,
        counts: {},
        confirmedRows: 0,
        holdRows: 0,
        error: "GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.",
      };
    }

    const nowMs = Date.now();
    console.log("[운영시트카운트] 조회 시작:", {
      opsSheet: env.opsSheetName,
      rawSheet: env.rawSheetName,
      now: new Date(nowMs).toISOString(),
    });

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const [opsRes, rawRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: env.spreadsheetId,
        range: `'${env.opsSheetName}'!A:Z`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: env.spreadsheetId,
        range: `'${env.rawSheetName}'!A:R`,
      }),
    ]);

    const counts: Record<string, number> = {};
    const countedOrders = new Set<string>();
    let confirmedRows = 0;
    let holdRows = 0;
    let skipped = 0;

    const bump = (key: string, kind: CountableKind, order: string) => {
      counts[key] = (counts[key] || 0) + 1;
      if (order) countedOrders.add(order);
      if (kind === "confirmed") confirmedRows += 1;
      else holdRows += 1;
    };

    const opsRows = opsRes.data.values ?? [];
    if (opsRows.length >= 2) {
      const header = (opsRows[0] || []).map((h) => String(h || "").trim());
      const colOrder = findHeaderIndex(header, ["신청번호"]);
      const colGarden = findHeaderIndex(header, ["정원키"]);
      const colConfirmed = findHeaderIndex(header, ["확정예약상태"]);
      const colStatus = findHeaderIndex(header, ["예약상태"]);
      const colDeadline = findHeaderIndex(header, ["입금기한"]);
      const colReceived = findHeaderIndex(header, ["접수일시"]);
      const colDate = findHeaderIndex(header, ["날짜"]);
      const colRegion = findHeaderIndex(header, ["특강지역"]);
      const colSession = findHeaderIndex(header, ["회차"]);
      const colClass = findHeaderIndex(header, ["클래스"]);
      const colActual = findHeaderIndex(header, ["실제 클래스"]);
      const colName = findHeaderIndex(header, ["이름"]);

      if (colConfirmed < 0 || colStatus < 0) {
        return {
          success: false,
          counts: {},
          confirmedRows: 0,
          holdRows: 0,
          error: "운영 시트에「예약상태/확정예약상태」열이 없습니다.",
        };
      }

      for (let i = 1; i < opsRows.length; i++) {
        const row = opsRows[i] || [];
        const order =
          colOrder >= 0 ? String(row[colOrder] ?? "").trim() : "";
        const confirmedRaw = String(row[colConfirmed] ?? "");
        const statusRaw = String(row[colStatus] ?? "");

        let kind: CountableKind | null = null;
        if (isReservationConfirmed(confirmedRaw)) {
          kind = "confirmed";
        } else if (
          isPendingPaymentStatus(statusRaw) &&
          !isClosedOpsStatus(confirmedRaw)
        ) {
          const deadlineMs = resolveHoldDeadlineMs({
            deadlineRaw:
              colDeadline >= 0 ? String(row[colDeadline] ?? "") : "",
            receivedRaw:
              colReceived >= 0 ? String(row[colReceived] ?? "") : "",
          });
          if (isHoldStillValid(deadlineMs, nowMs)) {
            kind = "hold";
          }
        }

        if (!kind) continue;

        const enrollmentKey = opsRowToEnrollmentKey({
          gardenKey: colGarden >= 0 ? String(row[colGarden] ?? "") : "",
          date: colDate >= 0 ? String(row[colDate] ?? "") : "",
          region: colRegion >= 0 ? String(row[colRegion] ?? "") : "",
          session: colSession >= 0 ? String(row[colSession] ?? "") : "",
          className: colClass >= 0 ? String(row[colClass] ?? "") : "",
          actualClass: colActual >= 0 ? String(row[colActual] ?? "") : "",
        });

        if (!enrollmentKey) {
          skipped += 1;
          console.warn("[운영시트카운트] 키 변환 스킵:", {
            row: i + 1,
            name: colName >= 0 ? row[colName] : "",
            kind,
          });
          continue;
        }

        bump(enrollmentKey, kind, order);
      }
    }

    // 수강자 시트: 아직 운영에 없는 결제대기 → 즉시 자리 홀드
    const rawRows = rawRes.data.values ?? [];
    if (rawRows.length >= 2) {
      const header = (rawRows[0] || []).map((h) => String(h || "").trim());
      const colOrder = findHeaderIndex(header, ["신청번호"]);
      const colStatus = findHeaderIndex(header, ["예약상태"]);
      const colDeadline = findHeaderIndex(header, ["입금기한"]);
      const colReceived = findHeaderIndex(header, ["접수일시"]);
      const colDate = findHeaderIndex(header, ["날짜"]);
      const colRegion = findHeaderIndex(header, ["특강지역"]);
      const colSession = findHeaderIndex(header, ["회차"]);
      const colClass = findHeaderIndex(header, ["클래스"]);
      const colName = findHeaderIndex(header, ["이름"]);

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i] || [];
        const order =
          colOrder >= 0 ? String(row[colOrder] ?? "").trim() : "";
        if (order && countedOrders.has(order)) continue;

        const statusRaw =
          colStatus >= 0 ? String(row[colStatus] ?? "") : "";
        if (!isPendingPaymentStatus(statusRaw)) continue;

        const deadlineMs = resolveHoldDeadlineMs({
          deadlineRaw:
            colDeadline >= 0 ? String(row[colDeadline] ?? "") : "",
          receivedRaw:
            colReceived >= 0 ? String(row[colReceived] ?? "") : "",
        });
        if (!isHoldStillValid(deadlineMs, nowMs)) continue;

        const enrollmentKey = opsRowToEnrollmentKey({
          date: colDate >= 0 ? String(row[colDate] ?? "") : "",
          region: colRegion >= 0 ? String(row[colRegion] ?? "") : "",
          session: colSession >= 0 ? String(row[colSession] ?? "") : "",
          className: colClass >= 0 ? String(row[colClass] ?? "") : "",
        });
        if (!enrollmentKey) {
          skipped += 1;
          console.warn("[운영시트카운트] 수강자 홀드 키 스킵:", {
            row: i + 1,
            name: colName >= 0 ? row[colName] : "",
            order,
          });
          continue;
        }

        bump(enrollmentKey, "hold", order);
      }
    }

    console.log("[운영시트카운트] 집계 완료:", {
      confirmedRows,
      holdRows,
      skipped,
      classKeys: Object.keys(counts).length,
      sample: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    });

    return { success: true, counts, confirmedRows, holdRows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "운영 시트 조회 실패";
    console.error("[운영시트카운트] 예외:", message);
    return {
      success: false,
      counts: {},
      confirmedRows: 0,
      holdRows: 0,
      error: message,
    };
  }
}
