import "server-only";

import { getClassEnrollmentCounts } from "@/app/actions/notion";

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

/** page.tsx 의 ClassItem 과 동일 기준 (센터·날짜 메타) */
type ClassEvent = {
  year: number;
  month: number;
  dateNum: number;
  location: string;
  locationCode: string;
};

/**
 * app/page.tsx `classes` 배열과 같은 일정 메타
 * — 센터명·날짜는 여기서만 읽고, 임의 추측하지 않는다.
 */
const CLASS_EVENTS: ClassEvent[] = [
  {
    year: 2026,
    month: 5,
    dateNum: 31,
    location: "서울 서초 인근",
    locationCode: "서초",
  },
  {
    year: 2026,
    month: 6,
    dateNum: 14,
    location: "경기 김포 · 아스타스포츠센터",
    locationCode: "김포",
  },
  {
    year: 2026,
    month: 6,
    dateNum: 21,
    location: "경기 화성 · 와이풀앤와이에스씨",
    locationCode: "화성",
  },
  {
    year: 2026,
    month: 6,
    dateNum: 28,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
  },
  {
    year: 2026,
    month: 7,
    dateNum: 5,
    location: "서울 은평구 · 삼정스포츠 수영장",
    locationCode: "은평",
  },
  {
    year: 2026,
    month: 7,
    dateNum: 12,
    location: "인천 청라 · 청라스카이스위밍",
    locationCode: "인천",
  },
  {
    year: 2026,
    month: 7,
    dateNum: 19,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
  },
  {
    year: 2026,
    month: 7,
    dateNum: 26,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
  },
  {
    year: 2026,
    month: 8,
    dateNum: 23,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
  },
  {
    year: 2026,
    month: 8,
    dateNum: 30,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
  },
  {
    year: 2026,
    month: 9,
    dateNum: 6,
    location: "부산 · 조이풀스윔",
    locationCode: "부산",
  },
  {
    year: 2026,
    month: 9,
    dateNum: 13,
    location: "서울 은평구 · 삼정스포츠 수영장",
    locationCode: "은평",
  },
  {
    year: 2026,
    month: 9,
    dateNum: 20,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
  },
  {
    year: 2026,
    month: 9,
    dateNum: 27,
    location: "인천 청라 · 청라스카이스위밍",
    locationCode: "청라",
  },
  {
    year: 2026,
    month: 10,
    dateNum: 4,
    location: "부산 · 조이풀스윔",
    locationCode: "부산",
  },
  {
    year: 2026,
    month: 10,
    dateNum: 11,
    location: "서울 중구 · 스포빌키즈쿠아",
    locationCode: "중구",
  },
  {
    year: 2026,
    month: 10,
    dateNum: 18,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
  },
  {
    year: 2026,
    month: 10,
    dateNum: 25,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
  },
];

/**
 * page.tsx / set-waitlist 의 DEFAULT_WAITLIST_THRESHOLDS_BY_CLASS 정본 키
 * (구 키·레거시 표기는 제외)
 */
const DEFAULT_CAPACITY_BY_CLASS: Record<string, number> = {
  "[동탄 8/23] 1부 특강 자유형": 7,
  "[동탄 8/23] 1부 특강 평영": 7,
  "[동탄 8/23] 1부 특강 접영": 7,
  "[동탄 8/23] 2부 진단": 20,
  "[목동 8/30] 1부 특강 자유형": 7,
  "[목동 8/30] 1부 특강 평영": 7,
  "[목동 8/30] 1부 특강 접영": 14,
  "[목동 8/30] 1부 진단": 20,
  "[부산 9/6] 1부 특강 자유형": 7,
  "[부산 9/6] 1부 특강 평영": 7,
  "[부산 9/6] 1부 특강 접영": 7,
  "[부산 9/6] 1부 진단": 20,
  "[은평 9/13] 1부 특강 자유형": 7,
  "[은평 9/13] 1부 특강 평영": 7,
  "[은평 9/13] 1부 특강 접영": 7,
  "[은평 9/13] 1부 진단": 20,
  "[목동 9/20] 1부 특강 자유형": 7,
  "[목동 9/20] 1부 특강 평영": 7,
  "[목동 9/20] 1부 특강 접영": 7,
  "[목동 9/20] 1부 진단": 20,
  "[청라 9/27] 1부 특강 자유형": 7,
  "[청라 9/27] 1부 특강 평영": 7,
  "[청라 9/27] 1부 특강 접영": 7,
  "[청라 9/27] 1부 진단": 20,
  "[부산 10/4] 1부 특강 자유형": 7,
  "[부산 10/4] 1부 특강 평영": 7,
  "[부산 10/4] 1부 특강 접영": 7,
  "[부산 10/4] 1부 진단": 14,
  "[중구 10/11] 1부 특강 자유형": 14,
  "[중구 10/11] 1부 특강 평영": 7,
  "[중구 10/11] 1부 특강 접영": 7,
  "[목동 10/18] 1부 특강 자유형": 14,
  "[목동 10/18] 1부 특강 평영": 7,
  "[목동 10/18] 1부 특강 접영": 7,
  "[목동 10/18] 1부 진단": 14,
  "[동탄 10/25] 1부 특강 자유형": 14,
  "[동탄 10/25] 1부 특강 평영": 7,
  "[동탄 10/25] 1부 특강 접영": 7,
  "[동탄 10/25] 2부 진단": 14,
};

const DEFAULT_WAITLIST_THRESHOLD = 7;
const DIAGNOSIS_WAITLIST_THRESHOLD = 20;

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
  return `${event.locationCode} ${event.month}/${event.dateNum}`;
}

function toIsoDate(event: ClassEvent): string {
  const mm = String(event.month).padStart(2, "0");
  const dd = String(event.dateNum).padStart(2, "0");
  return `${event.year}-${mm}-${dd}`;
}

function findClassEventByLabel(label: string): ClassEvent | null {
  return (
    CLASS_EVENTS.find((event) => classLabelKey(event) === label) ?? null
  );
}

function isDiagnosisClassKey(className: string) {
  return /^\[[^\]]+\]\s+\d+부\s*진단$/.test(className);
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
