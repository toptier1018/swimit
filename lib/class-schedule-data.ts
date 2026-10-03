/**
 * 스윔잇 특강/진단 일정 정본 (single source of truth)
 * - 홈페이지 (app/page.tsx)
 * - GET /api/schedules
 * - GET /api/fishtank-form-programs
 *
 * 새 일정은 이 파일에만 추가한다.
 */

export const DEFAULT_WAITLIST_THRESHOLD = 7;
/** 저항 진단 프로그램 기본 정원 */
export const DIAGNOSIS_WAITLIST_THRESHOLD = 20;

export type SpecialClassOption = {
  /** enrollment key에 쓰는 짧은 이름 (예: 턴, 배영, 자유형) */
  key: string;
  name: string;
  flow: string;
  short: string;
  icon?: string;
};

/** 일반 2시간 특강과 다른 한정/스페셜 클래스 */
export type SpecialClassInfo = {
  specialType: "intensive-3h" | "launch-2h" | "start-turn-2h";
  duration: string;
  timeLabel: string;
  price: number;
  originalPrice?: number;
  promotionType?: "launch";
  /** true면 동반/예약대기 등 추가 5,000원 할인 없음 */
  noExtraDiscount?: boolean;
  summary: string;
  detail: string;
  classes: SpecialClassOption[];
  /** 영문 배지 (예: START & TURN SPECIAL) */
  badgeEn?: string;
  /** 정원(전체 클래스 기준). UI 안내용 */
  capacity?: number;
};

/** enrollment key 끝부분 / 시트 구분용 */
export const START_TURN_CLASS_KEY = "스타트·턴 연결";
export const START_TURN_SHEET_LABEL = "스타트·턴 연결 특강";
export const START_TURN_SESSION = "2부 특강";
export const START_TURN_CAPACITY = 14;

/** 10/18·11/8·11/22 기존 일정에 덧붙이는 스타트·턴 연결 특강 */
export const START_TURN_SPECIAL: SpecialClassInfo = {
  specialType: "start-turn-2h",
  duration: "2시간",
  timeLabel: "15:50~17:50",
  /** 런칭 특가: 정상가 80,000원에서 5,000원 할인 */
  price: 75000,
  originalPrice: 80000,
  promotionType: "launch",
  noExtraDiscount: true,
  capacity: START_TURN_CAPACITY,
  badgeEn: "START & TURN SPECIAL",
  summary: "일반 영법 교정 특강과 구분되는 SPECIAL CLASS입니다. 런칭 특가 적용 · 다른 할인 중복 불가",
  detail:
    "출발과 턴에서 끊기는 구간을 2시간 동안 집중적으로 연결합니다.",
  classes: [
    {
      key: START_TURN_CLASS_KEY,
      name: "스윔잇 스타트·턴 연결 특강",
      icon: "🚀",
      flow: "데크 스타트 → 사이드턴 / 플립턴",
      short: "출발 → 수영 → 턴 → 다시 수영",
    },
  ],
};

export const DONGTAN_NOV29_INTENSIVE: SpecialClassInfo = {
  specialType: "intensive-3h",
  duration: "3시간",
  timeLabel: "14:00~17:00",
  price: 115000,
  summary:
    "11월 29일 동탄은 일반 2시간 특강이 아닌 3시간 집중 스페셜 클래스입니다.",
  detail:
    "출발부터 턴, 다시 속도를 붙이는 것까지 한 가지 영법을 3시간 동안 연결합니다.",
  classes: [
    {
      key: "자유형",
      name: "자유형 3시간 집중반",
      icon: "🏊",
      flow: "물속 출발 → 돌핀킥 → 한손/두손 사이드턴",
      short: "물속 출발 → 돌핀킥 → 한손/두손 사이드턴",
    },
    {
      key: "평영",
      name: "평영 3시간 집중반",
      icon: "🐸",
      flow: "물속 출발 → 돌핀킥 → 한손/두손 사이드턴",
      short: "물속 출발 → 돌핀킥 → 한손/두손 사이드턴",
    },
    {
      key: "접영",
      name: "접영 3시간 집중반",
      icon: "🦋",
      flow: "물속 출발 → 돌핀킥 → 사이드턴/플립턴",
      short: "물속 출발 → 돌핀킥 → 사이드턴/플립턴",
    },
  ],
};

/** enrollment key가 해당 일정의 specialClass 옵션인지 (예: 동탄 3시간 집중반) */
export function matchesSpecialClassOption(
  className: string,
  special: SpecialClassInfo | undefined,
): boolean {
  if (!special) return false;
  const name = String(className || "");
  return special.classes.some(
    (option) =>
      name.includes(`특강 ${option.key}`) ||
      name.includes(option.name) ||
      name === option.key ||
      name === option.name,
  );
}

export type ClassScheduleItem = {
  id: number;
  year: number;
  location: string;
  locationCode: string;
  date: string;
  dateNum: number;
  month: number;
  venue: string;
  address: string;
  spots: string;
  scheduleSummaryLines: string[];
  badge?: string;
  parking?: string;
  specialClass?: SpecialClassInfo;
  /**
   * 기존 1부 특강/진단을 유지한 채 추가로 붙는 SPECIAL CLASS
   * (예: 스타트·턴 연결 특강 15:50~17:50)
   */
  addonSpecialClass?: SpecialClassInfo;
};

export const CLASS_SCHEDULES: ClassScheduleItem[] = [
  {
    id: 3,
    year: 2026,
    location: "서울 서초 인근",
    locationCode: "서초",
    date: "5월 31일 (일)",
    dateNum: 31,
    month: 5,
    venue: "특강 신청 후 제공됩니다.",
    address: "특강 신청 후 제공됩니다.",
    spots: "3명 모집 중",
    scheduleSummaryLines: ["1부 14:00~16:00"],
  },
  {
    id: 4,
    year: 2026,
    location: "경기 김포 · 아스타스포츠센터",
    locationCode: "김포",
    date: "6월 14일 (일)",
    dateNum: 14,
    month: 6,
    venue: "아스타스포츠센터",
    address: "김포한강9로76번길 63 4층 407호, 408호, 409호",
    spots: "3명 모집 중",
    scheduleSummaryLines: ["1부 15:00~17:00"],
  },
  {
    id: 6,
    year: 2026,
    location: "경기 화성 · 와이풀앤와이에스씨",
    locationCode: "화성",
    date: "6월 21일 (일)",
    dateNum: 21,
    month: 6,
    venue: "와이풀앤와이에스씨",
    address: "경기도 화성시 반정동 153번길 9-10",
    spots: "한 레인에 7명 모집",
    scheduleSummaryLines: ["1부 14:00~16:00"],
  },
  {
    id: 5,
    year: 2026,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
    date: "6월 28일 (일)",
    dateNum: 28,
    month: 6,
    venue: "목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    spots: "3명 모집 중",
    scheduleSummaryLines: ["1부 14:00~16:00"],
  },
  {
    id: 7,
    year: 2026,
    location: "서울 은평구 · 삼정스포츠 수영장",
    locationCode: "은평",
    date: "7월 5일 (일)",
    dateNum: 5,
    month: 7,
    venue: "삼정스포츠 수영장",
    address: "서울 은평구 서오릉로 94 삼성타운아파트 지하2층",
    spots: "레인별 7명 모집",
    scheduleSummaryLines: ["1부 09:00~11:00"],
  },
  {
    id: 8,
    year: 2026,
    location: "인천 청라 · 청라스카이스위밍",
    locationCode: "인천",
    date: "7월 12일 (일)",
    dateNum: 12,
    month: 7,
    venue: "청라스카이스위밍",
    address: "인천 서구 청라한내로 90 MK뷰 8층",
    spots: "레인당 7명 모집",
    scheduleSummaryLines: ["1부 10:00~12:00"],
  },
  {
    id: 10,
    year: 2026,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
    date: "7월 19일 (일)",
    dateNum: 19,
    month: 7,
    venue: "스윔스튜디오제이",
    address:
      "경기도 화성시 동탄구 동탄신리천로 414 경서타워 4층 스윔스튜디오제이",
    spots: "레인당 7명 모집",
    scheduleSummaryLines: ["1부 10:00~12:00"],
  },
  {
    id: 9,
    year: 2026,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
    date: "7월 26일 (일)",
    dateNum: 26,
    month: 7,
    venue: "목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    spots: "레인당 7명 모집",
    scheduleSummaryLines: ["1부 10:00~12:00"],
  },
  {
    id: 13,
    year: 2026,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
    date: "8월 23일 (일)",
    dateNum: 23,
    month: 8,
    venue: "스윔스튜디오제이",
    address:
      "경기도 화성시 동탄구 동탄신리천로 414 경서타워 4층 스윔스튜디오제이",
    spots: "첫 저항 진단 프로그램 · 제로 특강",
    scheduleSummaryLines: [
      "1부 제로 특강 · 14:00~16:00 (2시간)",
      "2부 진단 프로그램 · 16:00~18:00 (2시간)",
    ],
    badge: "첫 진단 프로그램",
  },
  {
    id: 14,
    year: 2026,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
    date: "8월 30일 (일)",
    dateNum: 30,
    month: 8,
    venue: "목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    spots: "접영 14명 · 자유형·평영 7명 · 진단 20명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00 (5·6레인)",
    ],
    badge: "특강 + 진단 동시 운영",
  },
  {
    id: 15,
    year: 2026,
    location: "부산 · 조이풀스윔",
    locationCode: "부산",
    date: "9월 6일 (일)",
    dateNum: 6,
    month: 9,
    venue: "조이풀스윔",
    address: "부산광역시 부산진구 백양관문로 20 현대빌딩 지하 1, 2층",
    spots: "영법 각 7명 · 진단 20명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00 (4·5레인)",
    ],
    badge: "특강 + 진단 동시 운영",
  },
  {
    id: 16,
    year: 2026,
    location: "서울 은평구 · 삼정스포츠 수영장",
    locationCode: "은평",
    date: "9월 13일 (일)",
    dateNum: 13,
    month: 9,
    venue: "삼정스포츠 수영장",
    address: "서울 은평구 서오릉로 94 삼성타운아파트 지하2층",
    spots: "영법 각 7명 · 진단 20명",
    scheduleSummaryLines: [
      "1부 특강 · 11:00~13:00 (2시간)",
      "1부 진단 프로그램 · 11:00~13:00",
    ],
    badge: "특강 + 진단 동시 운영",
  },
  {
    id: 18,
    year: 2026,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
    date: "9월 20일 (일)",
    dateNum: 20,
    month: 9,
    venue: "목동스포츠센터",
    address: "서울특별시 양천구 목동서로 130 목동스포츠센터",
    spots: "영법 각 7명 · 진단 20명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
    ],
    badge: "특강 + 진단 동시 운영",
  },
  {
    id: 19,
    year: 2026,
    location: "인천 청라 · 청라스카이스위밍",
    locationCode: "청라",
    date: "9월 27일 (일)",
    dateNum: 27,
    month: 9,
    venue: "청라스카이스위밍",
    address: "인천 서구 청라한내로 90 MK뷰 8층",
    spots: "영법 각 7명 · 진단 20명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
    ],
    badge: "특강 + 진단 동시 운영",
  },
  {
    id: 20,
    year: 2026,
    location: "부산 · 조이풀스윔",
    locationCode: "부산",
    date: "10월 4일 (일)",
    dateNum: 4,
    month: 10,
    venue: "조이풀스윔",
    address: "부산광역시 부산진구 백양관문로 20 현대빌딩 지하 1, 2층",
    spots: "평영·접영 각 7명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
    ],
    badge: "특강 운영",
  },
  {
    id: 22,
    year: 2026,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
    date: "10월 18일 (일)",
    dateNum: 18,
    month: 10,
    venue: "목동스포츠센터",
    address: "서울특별시 양천구 목동서로 130 목동스포츠센터",
    spots: "자유형 14명 · 평영·접영 각 7명 · 진단 14명 · 스타트·턴 14명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
      "스타트·턴 연결 특강 · 15:50~17:50 (2시간)",
    ],
    badge: "특강 + 진단 + SPECIAL",
    addonSpecialClass: START_TURN_SPECIAL,
  },
  {
    id: 23,
    year: 2026,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
    date: "10월 25일 (일)",
    dateNum: 25,
    month: 10,
    venue: "스윔스튜디오제이",
    address:
      "경기도 화성시 동탄구 동탄신리천로 414 경서타워 4층 스윔스튜디오제이",
    spots: "자유형 14명 · 평영·접영 각 7명 · 진단 14명",
    scheduleSummaryLines: [
      "1부 제로 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00 (2시간)",
    ],
    badge: "특강 + 진단 운영",
  },
  {
    id: 24,
    year: 2026,
    location: "부산 · 조이풀스윔",
    locationCode: "부산",
    date: "11월 8일 (일)",
    dateNum: 8,
    month: 11,
    venue: "조이풀스윔",
    address: "부산광역시 부산진구 백양관문로 20 현대빌딩 지하 1, 2층",
    spots: "자유형 14명 · 평영·접영 각 7명 · 진단 14명 · 스타트·턴 14명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
      "스타트·턴 연결 특강 · 15:50~17:50 (2시간)",
    ],
    badge: "특강 + 진단 + SPECIAL",
    addonSpecialClass: START_TURN_SPECIAL,
  },
  {
    id: 25,
    year: 2026,
    location: "강남 · 와이키키 링크&스윔",
    locationCode: "강남",
    date: "11월 15일 (일)",
    dateNum: 15,
    month: 11,
    venue: "와이키키 링크&스윔",
    address: "서울 강남구 압구정로 104 보암빌딩",
    spots: "영법 각 7명",
    scheduleSummaryLines: ["1부 특강 · 16:00~18:00 (2시간)"],
    badge: "특강 운영",
  },
  {
    id: 26,
    year: 2026,
    location: "서울 목동 · 목동스포츠센터",
    locationCode: "목동",
    date: "11월 22일 (일)",
    dateNum: 22,
    month: 11,
    venue: "목동스포츠센터",
    address: "서울특별시 양천구 목동서로 130 목동스포츠센터",
    spots: "자유형 14명 · 평영·접영 각 7명 · 진단 14명 · 스타트·턴 14명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
      "스타트·턴 연결 특강 · 15:50~17:50 (2시간)",
    ],
    badge: "특강 + 진단 + SPECIAL",
    addonSpecialClass: START_TURN_SPECIAL,
  },
  {
    id: 27,
    year: 2026,
    location: "경기 동탄 · 스윔스튜디오제이",
    locationCode: "동탄",
    date: "11월 29일 (일)",
    dateNum: 29,
    month: 11,
    venue: "스윔스튜디오제이",
    address:
      "경기도 화성시 동탄구 동탄신리천로 414 경서타워 4층 스윔스튜디오제이",
    spots: "자유형 14명 · 평영·접영 각 7명",
    scheduleSummaryLines: ["3시간 집중 특강 · 14:00~17:00"],
    badge: "SPECIAL",
    specialClass: DONGTAN_NOV29_INTENSIVE,
  },
];

export const DEFAULT_CAPACITY_BY_CLASS: Record<string, number> = {
  "[동탄 8/23] 1부 특강 자유형": 7,
  "[동탄 8/23] 1부 특강 평영": 7,
  "[동탄 8/23] 1부 특강 접영": 7,
  "[동탄 8/23] 2부 진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 구 키 호환 (마이그레이션 전 설정)
  "[동탄 8/23] 1부 저항제로 자유형": 7,
  "[동탄 8/23] 1부 저항제로 평영": 7,
  "[동탄 8/23] 1부 저항제로 접영": 7,
  "[동탄 8/23] 2부 저항진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 목동 8/30: 평영 1레인 · 접영 2·3레인 · 자유형 4레인 · 진단 5·6레인
  "[목동 8/30] 1부 특강 자유형": 7,
  "[목동 8/30] 1부 특강 평영": 7,
  "[목동 8/30] 1부 특강 접영": 14,
  "[목동 8/30] 1부 진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 부산 9/6: 자유형 1 · 접영 2 · 평영 3 · 진단 4·5레인
  "[부산 9/6] 1부 특강 자유형": 7,
  "[부산 9/6] 1부 특강 평영": 7,
  "[부산 9/6] 1부 특강 접영": 7,
  "[부산 9/6] 1부 진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 은평 9/13
  "[은평 9/13] 1부 특강 자유형": 7,
  "[은평 9/13] 1부 특강 평영": 7,
  "[은평 9/13] 1부 특강 접영": 7,
  "[은평 9/13] 1부 진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 목동 9/20
  "[목동 9/20] 1부 특강 자유형": 7,
  "[목동 9/20] 1부 특강 평영": 7,
  "[목동 9/20] 1부 특강 접영": 7,
  "[목동 9/20] 1부 진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 청라 9/27
  "[청라 9/27] 1부 특강 자유형": 7,
  "[청라 9/27] 1부 특강 평영": 7,
  "[청라 9/27] 1부 특강 접영": 7,
  "[청라 9/27] 1부 진단": DIAGNOSIS_WAITLIST_THRESHOLD,
  // 부산 10/4 (자유형·진단 미모집)
  "[부산 10/4] 1부 특강 평영": 7,
  "[부산 10/4] 1부 특강 접영": 7,
  // 목동 10/18
  "[목동 10/18] 1부 특강 자유형": 14,
  "[목동 10/18] 1부 특강 평영": 7,
  "[목동 10/18] 1부 특강 접영": 7,
  "[목동 10/18] 1부 진단": 14,
  "[목동 10/18] 2부 특강 스타트·턴 연결": START_TURN_CAPACITY,
  // 동탄 10/25 스윔스튜디오제이
  "[동탄 10/25] 1부 특강 자유형": 14,
  "[동탄 10/25] 1부 특강 평영": 7,
  "[동탄 10/25] 1부 특강 접영": 7,
  "[동탄 10/25] 1부 진단": 14,
  // 구 키 호환 (2부에서 1부로 옮기기 전)
  "[동탄 10/25] 2부 진단": 14,
  // 부산 11/8
  "[부산 11/8] 1부 특강 자유형": 14,
  "[부산 11/8] 1부 특강 평영": 7,
  "[부산 11/8] 1부 특강 접영": 7,
  "[부산 11/8] 1부 진단": 14,
  "[부산 11/8] 2부 특강 스타트·턴 연결": START_TURN_CAPACITY,
  // 강남 11/15 와이키키 링크&스윔 (진단 없음)
  "[강남 11/15] 1부 특강 자유형": 7,
  "[강남 11/15] 1부 특강 평영": 7,
  "[강남 11/15] 1부 특강 접영": 7,
  // 목동 11/22
  "[목동 11/22] 1부 특강 자유형": 14,
  "[목동 11/22] 1부 특강 평영": 7,
  "[목동 11/22] 1부 특강 접영": 7,
  "[목동 11/22] 1부 진단": 14,
  "[목동 11/22] 2부 특강 스타트·턴 연결": START_TURN_CAPACITY,
  // 동탄 11/29
  "[동탄 11/29] 1부 특강 자유형": 14,
  "[동탄 11/29] 1부 특강 평영": 7,
  "[동탄 11/29] 1부 특강 접영": 7,
  // 구 키 호환 (부산 8/30)
  "[부산 8/30] 1부 특강 자유형": 14,
  "[부산 8/30] 1부 특강 평영": 7,
  "[부산 8/30] 1부 특강 접영": 14,
};

/** page.tsx 호환 별칭 */
export const DEFAULT_WAITLIST_THRESHOLDS_BY_CLASS = DEFAULT_CAPACITY_BY_CLASS;

export function isDiagnosisEnrollmentKey(className: string): boolean {
  return /^\[[^\]]+\]\s+\d+부\s*진단$/.test(className);
}

export function getClassScheduleLabel(event: {
  locationCode: string;
  month: number;
  dateNum: number;
}): string {
  return `${event.locationCode} ${event.month}/${event.dateNum}`;
}

/** `[목동 10/18] 2부 특강 스타트·턴 연결` */
export function getStartTurnEnrollmentKey(event: {
  locationCode: string;
  month: number;
  dateNum: number;
}): string {
  return `[${getClassScheduleLabel(event)}] ${START_TURN_SESSION} ${START_TURN_CLASS_KEY}`;
}

export function isStartTurnEnrollmentKey(className: string): boolean {
  return (
    String(className || "").includes(`특강 ${START_TURN_CLASS_KEY}`) ||
    String(className || "").includes(START_TURN_SHEET_LABEL) ||
    String(className || "").includes("스타트·턴 연결")
  );
}

export function toClassScheduleIsoDate(event: {
  year: number;
  month: number;
  dateNum: number;
}): string {
  const mm = String(event.month).padStart(2, "0");
  const dd = String(event.dateNum).padStart(2, "0");
  return `${event.year}-${mm}-${dd}`;
}

/** `[동탄 10/25] 1부 특강 자유형` → 지역/월/일 */
export function parseEnrollmentKeyLabel(classKey: string): {
  locationCode: string;
  month: number;
  dateNum: number;
} | null {
  const matched = String(classKey || "")
    .trim()
    .match(/^\[([^\]]+?)\s+(\d{1,2})\/(\d{1,2})\]/);
  if (!matched) return null;
  return {
    locationCode: matched[1].trim(),
    month: Number(matched[2]),
    dateNum: Number(matched[3]),
  };
}

/**
 * 신청 키(classKey) 하나로 일정 정본을 찾습니다.
 * 날짜·장소·링크는 이 결과를 기준으로만 저장해야 합니다.
 */
export function resolveClassScheduleFromEnrollmentKey(classKey: string) {
  const parsed = parseEnrollmentKeyLabel(classKey);
  if (!parsed) {
    console.warn("[일정매핑] enrollment key에서 날짜를 읽지 못함:", classKey);
    return null;
  }
  const schedule = CLASS_SCHEDULES.find(
    (item) =>
      item.locationCode === parsed.locationCode &&
      item.month === parsed.month &&
      item.dateNum === parsed.dateNum,
  );
  if (!schedule) {
    console.warn("[일정매핑] CLASS_SCHEDULES에서 일정을 찾지 못함:", {
      classKey,
      parsed,
    });
    return null;
  }
  const isoDate = toClassScheduleIsoDate(schedule);
  console.log("[일정매핑] enrollment key → 일정 확정:", {
    classKey,
    classId: schedule.id,
    isoDate,
    location: schedule.location,
  });
  return {
    schedule,
    isoDate,
    location: schedule.location,
  };
}

/** 시트 Q열 링크: 1부-미배정-2026-10-25 */
export function buildSheetScheduleLink(params: {
  session: string;
  lane?: string;
  isoDate: string;
}): string {
  const session =
    String(params.session || "").match(/\d+부/)?.[0] ||
    String(params.session || "").trim() ||
    "1부";
  const lane = String(params.lane || "미배정").trim() || "미배정";
  const isoDate = String(params.isoDate || "").trim();
  if (!isoDate) return `${session}-${lane}`;
  return `${session}-${lane}-${isoDate}`;
}
