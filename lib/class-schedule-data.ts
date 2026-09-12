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
    spots: "자유형·평영·접영 각 7명 · 진단 14명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
    ],
    badge: "특강 + 진단 동시 운영",
  },
  {
    id: 21,
    year: 2026,
    location: "서울 중구 · 스포빌키즈쿠아",
    locationCode: "중구",
    date: "10월 11일 (일)",
    dateNum: 11,
    month: 10,
    venue: "스포빌키즈쿠아",
    address: "서울 중구 청계천로 400 메가몰동 B-1109호",
    spots: "자유형 14명 · 평영·접영 각 7명",
    scheduleSummaryLines: ["1부 특강 · 14:00~16:00 (2시간)"],
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
    spots: "자유형 14명 · 평영·접영 각 7명 · 진단 14명",
    scheduleSummaryLines: [
      "1부 특강 · 14:00~16:00 (2시간)",
      "1부 진단 프로그램 · 14:00~16:00",
    ],
    badge: "특강 + 진단 동시 운영",
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
      "2부 진단 프로그램 · 16:00~18:00 (2시간)",
    ],
    badge: "특강 + 진단 운영",
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
  // 부산 10/4
  "[부산 10/4] 1부 특강 자유형": 7,
  "[부산 10/4] 1부 특강 평영": 7,
  "[부산 10/4] 1부 특강 접영": 7,
  "[부산 10/4] 1부 진단": 14,
  // 중구 10/11
  "[중구 10/11] 1부 특강 자유형": 14,
  "[중구 10/11] 1부 특강 평영": 7,
  "[중구 10/11] 1부 특강 접영": 7,
  // 목동 10/18
  "[목동 10/18] 1부 특강 자유형": 14,
  "[목동 10/18] 1부 특강 평영": 7,
  "[목동 10/18] 1부 특강 접영": 7,
  "[목동 10/18] 1부 진단": 14,
  // 동탄 10/25 스윔스튜디오제이
  "[동탄 10/25] 1부 특강 자유형": 14,
  "[동탄 10/25] 1부 특강 평영": 7,
  "[동탄 10/25] 1부 특강 접영": 7,
  "[동탄 10/25] 2부 진단": 14,
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

export function toClassScheduleIsoDate(event: {
  year: number;
  month: number;
  dateNum: number;
}): string {
  const mm = String(event.month).padStart(2, "0");
  const dd = String(event.dateNum).padStart(2, "0");
  return `${event.year}-${mm}-${dd}`;
}
