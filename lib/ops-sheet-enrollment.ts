import "server-only";
import { google } from "googleapis";

const env = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  /** 운영 정본 시트 (R열 확정예약상태 = 예약확정 기준 카운트) */
  opsSheetName:
    process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || "스윔잇 수강자 운영",
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

function normalizeConfirmedStatus(value: string): boolean {
  const compact = String(value || "").replace(/\s/g, "");
  return compact === "예약확정";
}

function isInvalidGardenKey(value: string): boolean {
  const v = String(value || "").trim();
  if (!v) return true;
  if (v.startsWith("#")) return true; // #REF! 등
  return false;
}

/**
 * 운영 시트 정원키 예:
 * 2026-08-23-1부-접영-경기 동탄 · 스윔스튜디오제이
 * 2026-08-23-2부-진단-경기 동탄 · 스윔스튜디오제이
 * 2026-05-31-1부-자유형 A (초급)-서울 서초 인근
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

/** 시트 날짜 "2026. 8. 23" / "2026-08-23" → month/day */
function parseSheetDate(raw: string): { month: number; day: number } | null {
  const s = String(raw || "").trim();
  const a = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (a) return { month: Number(a[2]), day: Number(a[3]) };
  const b = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (b) return { month: Number(b[1]), day: Number(b[2]) };
  return null;
}

function resolveRegionCode(regionText: string, month: number, day: number): string | null {
  const t = String(regionText || "");
  if (!t) return null;

  // 7/12 청라는 사이트 키가 [인천 7/12]
  if (t.includes("청라")) {
    if (month === 7 && day === 12) return "인천";
    return "청라";
  }

  const ordered = [
    "동탄",
    "목동",
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

/** 사이트 enrollment 키로 변환: [동탄 8/23] 1부 특강 접영 */
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

/**
 * 「스윔잇 수강자 운영」시트에서 R(확정예약상태)=예약확정인 행만 집계
 */
export async function getOpsSheetEnrollmentCounts(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  confirmedRows: number;
  error?: string;
}> {
  try {
    if (!env.spreadsheetId) {
      return {
        success: false,
        counts: {},
        confirmedRows: 0,
        error: "GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.",
      };
    }

    console.log("[운영시트카운트] 조회 시작:", {
      sheet: env.opsSheetName,
      spreadsheetId: env.spreadsheetId.slice(0, 8) + "…",
    });

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.opsSheetName}'!A:Z`,
    });

    const rows = res.data.values ?? [];
    if (rows.length < 2) {
      console.warn("[운영시트카운트] 데이터 행 없음");
      return { success: true, counts: {}, confirmedRows: 0 };
    }

    const header = (rows[0] || []).map((h) => String(h || "").trim());
    const colGarden = findHeaderIndex(header, ["정원키"]);
    const colConfirmed = findHeaderIndex(header, ["확정예약상태"]);
    const colDate = findHeaderIndex(header, ["날짜"]);
    const colRegion = findHeaderIndex(header, ["특강지역"]);
    const colSession = findHeaderIndex(header, ["회차"]);
    const colClass = findHeaderIndex(header, ["클래스"]);
    const colActual = findHeaderIndex(header, ["실제 클래스"]);
    const colName = findHeaderIndex(header, ["이름"]);

    if (colConfirmed < 0) {
      return {
        success: false,
        counts: {},
        confirmedRows: 0,
        error: "운영 시트에「확정예약상태」열이 없습니다.",
      };
    }

    const counts: Record<string, number> = {};
    let confirmedRows = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const confirmedRaw = String(row[colConfirmed] ?? "");
      if (!normalizeConfirmedStatus(confirmedRaw)) continue;

      confirmedRows += 1;
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
        const name = colName >= 0 ? String(row[colName] ?? "") : "";
        console.warn("[운영시트카운트] 키 변환 스킵:", {
          row: i + 1,
          name,
          gardenKey: colGarden >= 0 ? row[colGarden] : "",
        });
        continue;
      }

      counts[enrollmentKey] = (counts[enrollmentKey] || 0) + 1;
    }

    console.log("[운영시트카운트] 집계 완료:", {
      confirmedRows,
      skipped,
      classKeys: Object.keys(counts).length,
      sample: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    });

    return { success: true, counts, confirmedRows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "운영 시트 조회 실패";
    console.error("[운영시트카운트] 예외:", message);
    return { success: false, counts: {}, confirmedRows: 0, error: message };
  }
}
