import "server-only";

import { getClassEnrollmentCounts } from "@/app/actions/notion";
import {
  CLASS_SCHEDULES,
  DEFAULT_CAPACITY_BY_CLASS,
  DEFAULT_WAITLIST_THRESHOLD,
  DIAGNOSIS_WAITLIST_THRESHOLD,
  getClassScheduleLabel,
  isDiagnosisEnrollmentKey,
  toClassScheduleIsoDate,
  type ClassScheduleItem,
} from "@/lib/class-schedule-data";

/**
 * debug=true 관리자 패널과 동일한 일정 행 구조
 * (SWIMIT_CONTEXT.md /api/schedules 권장 응답)
 */
export type ScheduleItem = {
  date: string;
  center: string;
  session: string;
  program: "특강" | "진단";
  className: string;
  applied: number;
  capacity: number;
  remaining: number;
  status: "결제 가능" | "예약대기" | "강제 예약대기";
};

/** 홈페이지 CLASS_SCHEDULES 와 동일 정본 */
type ClassEvent = Pick<
  ClassScheduleItem,
  "year" | "month" | "dateNum" | "location" | "locationCode"
>;

const CLASS_EVENTS: ClassEvent[] = CLASS_SCHEDULES.map((event) => ({
  year: event.year,
  month: event.month,
  dateNum: event.dateNum,
  location: event.location,
  locationCode: event.locationCode,
}));

function getKoreanTodayParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
  };
}

function getKoreanHour() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstNow.getUTCHours();
}

/** page.tsx getActiveClasses 와 동일: 당일 오전 8시(KST) 이후 지난 일정 제외 */
function isActiveClassEvent(event: ClassEvent): boolean {
  const { year, month, day } = getKoreanTodayParts();
  const kstHour = getKoreanHour();

  if (event.year > year) return true;
  if (event.year === year && event.month > month) return true;
  if (event.year === year && event.month === month && event.dateNum > day) {
    return true;
  }
  if (
    event.year === year &&
    event.month === month &&
    event.dateNum === day
  ) {
    return kstHour < 8;
  }
  return false;
}

function classLabelKey(event: ClassEvent): string {
  return getClassScheduleLabel(event);
}

function toIsoDate(event: ClassEvent): string {
  return toClassScheduleIsoDate(event);
}

function findClassEventByLabel(label: string): ClassEvent | null {
  return (
    CLASS_EVENTS.find((event) => classLabelKey(event) === label) ?? null
  );
}

function isDiagnosisClassKey(className: string) {
  return isDiagnosisEnrollmentKey(className);
}

function parseEnrollmentKey(enrollmentKey: string): {
  label: string;
  session: string;
  program: "특강" | "진단";
  className: string;
} | null {
  const diagnosis = enrollmentKey.match(
    /^\[([^\]]+)\]\s+(\d+부)\s*진단$/,
  );
  if (diagnosis) {
    return {
      label: diagnosis[1].trim(),
      session: diagnosis[2],
      program: "진단",
      className: "진단",
    };
  }

  const special = enrollmentKey.match(
    /^\[([^\]]+)\]\s+(\d+부)\s*특강\s+(자유형|평영|접영)$/,
  );
  if (special) {
    return {
      label: special[1].trim(),
      session: special[2],
      program: "특강",
      className: special[3],
    };
  }

  return null;
}

function getEffectiveEnrollmentCount(
  className: string,
  counts: Record<string, number>,
): number {
  let total = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (key === className) total += count || 0;
  }
  // 운영 시트가 동일 키로만 집계하므로 키 일치 합산이면 충분
  if (total > 0) return total;
  return Number(counts[className] || 0);
}

function resolveCapacity(
  className: string,
  thresholds: Record<string, number>,
): number {
  const fromNotion = thresholds[className];
  if (Number.isFinite(fromNotion) && fromNotion >= 0) {
    return Math.floor(fromNotion);
  }
  return (
    DEFAULT_CAPACITY_BY_CLASS[className] ??
    (isDiagnosisClassKey(className)
      ? DIAGNOSIS_WAITLIST_THRESHOLD
      : DEFAULT_WAITLIST_THRESHOLD)
  );
}

function extractPlainTextFromNotionTextArray(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((t) => String((t as { plain_text?: string })?.plain_text || ""))
    .join("")
    .trim();
}

/** set-waitlist GET 과 동일하게 Notion 클래스 설정에서 정원·강제대기 조회 */
async function getClassSettingsFromNotion(): Promise<{
  waitlistClasses: string[];
  thresholds: Record<string, number>;
}> {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CLASS_SETTINGS_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    console.warn("[일정API] Notion 클래스 설정 환경변수 없음 → 기본 정원 사용");
    return { waitlistClasses: [], thresholds: {} };
  }

  const waitlistClasses: string[] = [];
  const thresholds: Record<string, number> = {};
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          page_size: 100,
          start_cursor: startCursor,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[일정API] Notion 설정 조회 실패:", response.status, text);
      throw new Error("Notion 클래스 설정 조회 실패");
    }

    const result = await response.json();
    for (const page of result.results || []) {
      const prop = page?.properties?.["클래스명"];
      const className =
        extractPlainTextFromNotionTextArray(prop?.title) ||
        extractPlainTextFromNotionTextArray(prop?.rich_text);
      if (!className) continue;

      const manual =
        page?.properties?.["수동 예약대기"]?.checkbox === true ||
        page?.properties?.["수동예약대기"]?.checkbox === true;
      if (manual) waitlistClasses.push(className);

      const thresholdVal =
        page?.properties?.["예약대기 기준"]?.number ??
        page?.properties?.["예약대기 기준 인원"]?.number ??
        page?.properties?.["기준 인원"]?.number;
      if (typeof thresholdVal === "number") {
        thresholds[className] = thresholdVal;
      }
    }

    hasMore = result.has_more === true;
    startCursor = result.next_cursor || undefined;
  }

  return { waitlistClasses, thresholds };
}

function getActiveEnrollmentKeys(): string[] {
  const activeLabels = new Set(
    CLASS_EVENTS.filter(isActiveClassEvent).map(classLabelKey),
  );

  return Object.keys(DEFAULT_CAPACITY_BY_CLASS)
    .filter((key) => {
      const parsed = parseEnrollmentKey(key);
      return parsed ? activeLabels.has(parsed.label) : false;
    })
    .sort((a, b) => {
      const pa = parseEnrollmentKey(a);
      const pb = parseEnrollmentKey(b);
      if (!pa || !pb) return a.localeCompare(b, "ko");
      const ea = findClassEventByLabel(pa.label);
      const eb = findClassEventByLabel(pb.label);
      if (ea && eb) {
        if (ea.year !== eb.year) return ea.year - eb.year;
        if (ea.month !== eb.month) return ea.month - eb.month;
        if (ea.dateNum !== eb.dateNum) return ea.dateNum - eb.dateNum;
      }
      if (pa.session !== pb.session) {
        return pa.session.localeCompare(pb.session, "ko");
      }
      if (pa.program !== pb.program) {
        return pa.program === "특강" ? -1 : 1;
      }
      return pa.className.localeCompare(pb.className, "ko");
    });
}

/**
 * debug 패널의 신청/모집/남은/상태 계산과 동일한 일정 목록
 */
export async function getSchedules(): Promise<ScheduleItem[]> {
  const activeKeys = getActiveEnrollmentKeys();
  console.log("[일정API] 활성 클래스 키 수:", activeKeys.length);

  const [enrollmentResult, settings] = await Promise.all([
    getClassEnrollmentCounts(activeKeys),
    getClassSettingsFromNotion().catch((error) => {
      console.warn("[일정API] 정원 설정 조회 실패 → 기본값 사용:", error);
      return { waitlistClasses: [] as string[], thresholds: {} };
    }),
  ]);

  const counts =
    enrollmentResult.success && enrollmentResult.counts
      ? enrollmentResult.counts
      : Object.fromEntries(activeKeys.map((key) => [key, 0]));

  const manualWaitlist = new Set(settings.waitlistClasses || []);
  const schedules: ScheduleItem[] = [];

  for (const enrollmentKey of activeKeys) {
    const parsed = parseEnrollmentKey(enrollmentKey);
    if (!parsed) {
      console.warn("[일정API] 키 파싱 실패:", enrollmentKey);
      continue;
    }

    const event = findClassEventByLabel(parsed.label);
    if (!event) {
      console.warn("[일정API] 센터 메타 없음:", parsed.label);
      continue;
    }

    const applied = getEffectiveEnrollmentCount(enrollmentKey, counts);
    const capacity = resolveCapacity(enrollmentKey, settings.thresholds);
    const remaining = Math.max(0, capacity - applied);
    const forced = manualWaitlist.has(enrollmentKey);
    const isWaitlist = forced || applied >= capacity;
    const status: ScheduleItem["status"] = forced
      ? "강제 예약대기"
      : isWaitlist
        ? "예약대기"
        : "결제 가능";

    schedules.push({
      date: toIsoDate(event),
      center: event.location,
      session: parsed.session,
      program: parsed.program,
      className: parsed.className,
      applied,
      capacity,
      remaining,
      status,
    });
  }

  console.log("[일정API] 일정 행 생성 완료:", {
    rows: schedules.length,
    enrollmentSource:
      (enrollmentResult as { source?: string }).source ?? "unknown",
  });

  return schedules;
}

export type DiagnosisFishtankFormOption = {
  label: string;
  date: string;
  locationCode: string;
  enrollmentKey: string;
};

/**
 * 어항샷 영상 수령 Google Form 선택지용 진단 일정
 * - 라벨 예: "2026.08.23 동탄"
 * - 미래 전부 + 과거 keepPastDays일(기본 90일)
 */
export function getDiagnosisFishtankFormProgramOptions(
  keepPastDays = 90,
): DiagnosisFishtankFormOption[] {
  const today = getKoreanTodayParts();
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const cutoffUtc = todayUtc - Math.max(0, keepPastDays) * 86400000;

  const byLabel = new Map<string, DiagnosisFishtankFormOption>();

  for (const enrollmentKey of Object.keys(DEFAULT_CAPACITY_BY_CLASS)) {
    if (!isDiagnosisClassKey(enrollmentKey)) continue;
    const parsed = parseEnrollmentKey(enrollmentKey);
    if (!parsed || parsed.program !== "진단") continue;

    const event = findClassEventByLabel(parsed.label);
    if (!event) {
      console.warn("[어항샷폼] 센터 메타 없음:", parsed.label, enrollmentKey);
      continue;
    }

    const eventUtc = Date.UTC(event.year, event.month - 1, event.dateNum);
    if (eventUtc < cutoffUtc) continue;

    const mm = String(event.month).padStart(2, "0");
    const dd = String(event.dateNum).padStart(2, "0");
    const label = `${event.year}.${mm}.${dd} ${event.locationCode}`;

    if (!byLabel.has(label)) {
      byLabel.set(label, {
        label,
        date: toIsoDate(event),
        locationCode: event.locationCode,
        enrollmentKey,
      });
    }
  }

  const options = Array.from(byLabel.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  console.log("[어항샷폼] 진단 선택지 생성", {
    keepPastDays,
    count: options.length,
    first: options[0]?.label ?? null,
    last: options[options.length - 1]?.label ?? null,
  });

  return options;
}
