"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  User,
  Phone,
  MapPinned,
  MessageSquare,
  Mail,
  X,
  Calendar,
  CreditCard,
  Users,
  Check,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  submitToNotion,
  submitPaidToNotion,
  updatePaymentInNotion,
  checkPaymentStatus,
  checkDuplicateForSameClass,
  getClassEnrollmentCounts,
  findOrCreateApplicant,
} from "@/app/actions/notion";

type ClassItem = {
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
};

const classes: ClassItem[] = [
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
];

const DEPOSIT_BANK_NAME = "농협";
const DEPOSIT_ACCOUNT_NUMBER = "302-1710-5277-51";
const DEPOSIT_ACCOUNT_HOLDER = "장연성";
const DEPOSIT_ACCOUNT_LABEL = `${DEPOSIT_BANK_NAME} ${DEPOSIT_ACCOUNT_NUMBER}`;

// 오픈 전 임시 설정: 전체 클래스를 '예약대기'로 강제 표시
// 개발자 모드에서 대기 해제/기준 변경이 필요하므로 기본은 false로 둡니다.
const FORCE_ALL_WAITLIST = false;
/** 모든 클래스 예약대기 기준 (레인당 7명) */
const DEFAULT_WAITLIST_THRESHOLD = 7;

const resolveWaitlistThreshold = (
  className: string,
  thresholds: Record<string, number>,
) => thresholds[className] ?? DEFAULT_WAITLIST_THRESHOLD;

const normalizeWaitlistThresholds = (
  thresholds: Record<string, number>,
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(thresholds).map(([key, value]) => [
      key,
      Number.isFinite(value) && value >= 0
        ? value
        : DEFAULT_WAITLIST_THRESHOLD,
    ]),
  );

const CLASS_DISPLAY_TITLES: Record<string, string> = {
  "자유형 A (초급)": "자유형 A｜숨참·가라앉음 교정반",
  "자유형 B (중급)": "자유형 B｜장거리·효율 완성반",
  "평영 A (초급)": "평영 A｜제자리 탈출반",
  "평영 B (중급)": "평영 B｜추진력·타이밍 완성반",
  "접영 A (초급)": "접영 A｜첫 25m 완주반",
  "접영 B (중급)": "접영 B｜50m 리듬 완성반",
};

const getClassDisplayTitle = (title: string) =>
  CLASS_DISPLAY_TITLES[title] ?? title;

const getClassDisplayParts = (title: string) => {
  const displayTitle = getClassDisplayTitle(title);
  const [label, description] = displayTitle.split("｜");
  return { label, description };
};

const getClassDisplayName = (className: string) =>
  Object.entries(CLASS_DISPLAY_TITLES).reduce(
    (displayName, [internalTitle, displayTitle]) =>
      displayName.replace(internalTitle, displayTitle),
    className,
  );

type TimetableRow = {
  session: string;
  time: string;
  lanes: Array<{
    lane: string;
    title: string;
    price: number;
    /** 2부 등 일부 레인만 운영할 때 빈 칸 */
    closed?: boolean;
    /** 프리미엄반 (지상+수중, 2레인 단독) */
    premium?: boolean;
  }>;
};

/** 서울 서초 5/31 특강 */
const TIMETABLE_SEOCHO: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "14:00 ~ 16:00",
    lanes: [
      { lane: "1레인", title: "평영 A (초급)", price: 70000 },
      { lane: "2레인", title: "접영 A (초급)", price: 70000 },
      { lane: "3레인", title: "자유형 A (초급)", price: 70000 },
      { lane: "4레인", title: "접영 B (중급)", price: 70000 },
      { lane: "5레인", title: "자유형 B (중급)", price: 70000 },
    ],
  },
];

/** 서울 목동스포츠센터 6/28 특강 */
const TIMETABLE_MOKDONG: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "14:00 ~ 16:00",
    lanes: [
      { lane: "1레인", title: "평영 A (초급)", price: 80000 },
      { lane: "2레인", title: "평영 B (중급)", price: 80000 },
      { lane: "3레인", title: "접영 A (초급)", price: 80000 },
      { lane: "4레인", title: "접영 B (중급)", price: 80000 },
      { lane: "5레인", title: "자유형 A (초급)", price: 80000 },
      { lane: "6레인", title: "자유형 B (중급)", price: 80000 },
    ],
  },
];

/** 서울 목동스포츠센터 7/26 특강 */
const TIMETABLE_MOKDONG_JULY: TimetableRow[] = [
  {
    ...TIMETABLE_MOKDONG[0],
    time: "10:00 ~ 12:00",
  },
];

/** 김포 아스타 6/14 특강 */
const TIMETABLE_KIMPO: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "15:00 ~ 17:00",
    lanes: [
      { lane: "1레인", title: "평영 A (초급)", price: 80000 },
      { lane: "2레인", title: "접영 A (초급)", price: 80000 },
      { lane: "3레인", title: "접영 B (중급)", price: 80000 },
      { lane: "4레인", title: "자유형 A (초급)", price: 80000 },
      { lane: "5레인", title: "", price: 0, closed: true },
    ],
  },
];

/** 수원 화성 와이풀앤와이에스씨 6/21 특강 */
const TIMETABLE_HWASEONG: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "14:00 ~ 16:00",
    lanes: [
      { lane: "1레인", title: "", price: 0, closed: true },
      { lane: "2레인", title: "자유형 A (초급)", price: 80000 },
      { lane: "3레인", title: "평영 A (초급)", price: 80000 },
      { lane: "4레인", title: "접영 A (초급)", price: 80000 },
      { lane: "5레인", title: "", price: 0, closed: true },
      { lane: "6레인", title: "", price: 0, closed: true },
    ],
  },
];

/** 삼정스포츠 수영장 7/5 특강 (서울 은평) */
const TIMETABLE_SAMJEONG: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "09:00 ~ 11:00",
    lanes: [
      { lane: "1레인", title: "", price: 0, closed: true },
      { lane: "2레인", title: "", price: 0, closed: true },
      { lane: "3레인", title: "접영 A (초급)", price: 80000 },
      { lane: "4레인", title: "", price: 0, closed: true },
      { lane: "5레인", title: "자유형 A (초급)", price: 80000 },
      { lane: "6레인", title: "자유형 B (중급)", price: 80000 },
    ],
  },
];

/** 청라스카이스위밍 7/12 특강 (인천) */
const TIMETABLE_CHEONGNA: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "10:00 ~ 12:00",
    lanes: [
      { lane: "1레인", title: "자유형 A (초급)", price: 80000 },
      { lane: "2레인", title: "평영 A (초급)", price: 80000 },
      { lane: "3레인", title: "접영 A (초급)", price: 80000 },
      { lane: "4레인", title: "자유형 B (중급)", price: 80000 },
      { lane: "5레인", title: "접영 B (중급)", price: 80000 },
    ],
  },
];

/** 스윔스튜디오제이 7/19 특강 (동탄) */
const TIMETABLE_DONGTAN: TimetableRow[] = [
  {
    session: "1부 특강",
    time: "10:00 ~ 12:00",
    lanes: [
      { lane: "1레인", title: "평영 A (초급)", price: 80000 },
      { lane: "2레인", title: "접영 A (초급)", price: 80000 },
      { lane: "3레인", title: "자유형 A (초급)", price: 80000 },
      { lane: "4레인", title: "접영 B (중급)", price: 80000 },
    ],
  },
];

const TIMETABLE_BY_CLASS_ID: Record<number, TimetableRow[]> = {
  3: TIMETABLE_SEOCHO,   // 5/31 서초
  4: TIMETABLE_KIMPO,    // 6/14 김포
  6: TIMETABLE_HWASEONG, // 6/21 화성
  5: TIMETABLE_MOKDONG,  // 6/28 목동
  7: TIMETABLE_SAMJEONG, // 7/5 은평
  8: TIMETABLE_CHEONGNA, // 7/12 인천
  10: TIMETABLE_DONGTAN, // 7/19 동탄
  9: TIMETABLE_MOKDONG_JULY, // 7/26 목동
};

const getKoreanTodayParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);

  return { year, month, day };
};

const getClassById = (classId: number) => classes.find((c) => c.id === classId);

const getClassRegionLabel = (classId: number) =>
  getClassById(classId)?.locationCode || String(classId);

const getClassDateLabel = (classId: number) => {
  const classItem = getClassById(classId);
  if (!classItem) return "";
  return `${classItem.month}/${classItem.dateNum}`;
};

const getClassKeyLabel = (classId: number) => {
  const dateLabel = getClassDateLabel(classId);
  const regionLabel = getClassRegionLabel(classId);
  return dateLabel ? `${regionLabel} ${dateLabel}` : regionLabel;
};

const getPrimaryClassIdForLegacyRegion = (regionLabel: string) =>
  [...classes]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      if (a.dateNum !== b.dateNum) return a.dateNum - b.dateNum;
      return a.id - b.id;
    })
    .find((c) => c.locationCode === regionLabel)?.id;

/** 당일 오전 8시(한국 시간) 이후 지난 특강은 목록에서 제외 */
const getActiveClasses = (): ClassItem[] => {
  const { year, month, day } = getKoreanTodayParts();
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9
  const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
  const kstHour = kstNow.getUTCHours();

  return classes.filter((c) => {
    // 특강일이 오늘보다 미래면 표시
    if (c.year > year) return true;
    if (c.year === year && c.month > month) return true;
    if (c.year === year && c.month === month && c.dateNum > day) return true;
    // 특강일이 오늘이면 오전 8시 이전에만 표시
    if (c.year === year && c.month === month && c.dateNum === day) {
      return kstHour < 8;
    }
    // 특강일이 지났으면 숨김
    return false;
  });
};

const makeClassKey = (
  classId: number,
  session: string,
  lane: string,
  title: string,
) => `[${getClassKeyLabel(classId)}] ${session} ${lane} ${title}`;

const migrateLegacyClassKey = (key: string) => {
  const cidMigrated = key.replace(/^\[cid:(\d+)\]/, (_, idText) => {
    const classId = Number(idText);
    return `[${getClassKeyLabel(classId)}]`;
  });

  return cidMigrated.replace(/^\[([^\]]+)\]/, (match, regionLabel) => {
    if (/\d+\/\d+/.test(regionLabel)) return match;
    const classId = getPrimaryClassIdForLegacyRegion(regionLabel);
    return classId ? `[${getClassKeyLabel(classId)}]` : match;
  });
};

/** 통합 폐강 레인: 구 키 신청 건수를 대상 레인 카운트에 합산 */
const ENROLLMENT_MERGE_TO: Record<string, string> = {
  "[화성 6/21] 1부 특강 5레인 접영 B (중급)":
    "[화성 6/21] 1부 특강 4레인 접영 A (초급)",
};

const resolveEnrollmentTargetKey = (classKey: string) =>
  ENROLLMENT_MERGE_TO[classKey] ?? classKey;

const normalizeManualWaitlistClasses = (classNames: string[] = []) =>
  new Set(
    classNames.map((className) =>
      resolveEnrollmentTargetKey(migrateLegacyClassKey(className)),
    ),
  );

const getEffectiveEnrollmentCount = (
  className: string,
  counts: Record<string, number>,
): number => {
  let total = counts[className] || 0;
  for (const [fromKey, toKey] of Object.entries(ENROLLMENT_MERGE_TO)) {
    if (toKey === className) total += counts[fromKey] || 0;
  }
  return total;
};

const normalizeEnrollmentCounts = (
  counts: Record<string, number>,
): Record<string, number> => {
  const normalized: Record<string, number> = { ...INITIAL_ENROLLMENT };
  const validKeys = new Set(Object.keys(INITIAL_ENROLLMENT));

  for (const [rawKey, rawCount] of Object.entries(counts)) {
    const mappedKey = migrateLegacyClassKey(rawKey);
    const targetKey = resolveEnrollmentTargetKey(mappedKey);
    if (!validKeys.has(targetKey)) continue;
    normalized[targetKey] =
      (normalized[targetKey] || 0) + (Number(rawCount) || 0);
  }

  const merged = Object.entries(ENROLLMENT_MERGE_TO);
  if (merged.length > 0) {
    console.log("[카운터] 레인 통합 반영:", {
      rules: merged,
      sample: merged.map(([from, to]) => ({
        from,
        to,
        combined: normalized[to],
      })),
    });
  }

  return normalized;
};

const INITIAL_ENROLLMENT: Record<string, number> = Object.fromEntries(
  Object.entries(TIMETABLE_BY_CLASS_ID).flatMap(([idStr, rows]) => {
    const classId = Number(idStr);
    return rows.flatMap((row) =>
      row.lanes
        .filter((l) => !l.closed && l.title)
        .map((l) => [
          makeClassKey(classId, row.session, l.lane, l.title),
          0,
        ]),
    );
  }),
) as Record<string, number>;

/** 특강 날짜 → 부 → 레인 순 (개발자 모드 등 시간 흐름 정렬용) */
const buildClassKeySortIndex = (): Record<string, number> => {
  const index: Record<string, number> = {};
  let order = 0;

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (a.dateNum !== b.dateNum) return a.dateNum - b.dateNum;
    return a.id - b.id;
  });

  for (const classItem of sortedClasses) {
    const rows = TIMETABLE_BY_CLASS_ID[classItem.id] ?? [];
    for (const row of rows) {
      for (const lane of row.lanes) {
        if (lane.closed || !lane.title) continue;
        const key = makeClassKey(
          classItem.id,
          row.session,
          lane.lane,
          lane.title,
        );
        if (!(key in index)) index[key] = order++;
      }
    }
  }

  return index;
};

const CLASS_KEY_SORT_INDEX = buildClassKeySortIndex();

const compareClassKeysBySchedule = (a: string, b: string): number => {
  const ia = CLASS_KEY_SORT_INDEX[a] ?? Number.MAX_SAFE_INTEGER;
  const ib = CLASS_KEY_SORT_INDEX[b] ?? Number.MAX_SAFE_INTEGER;
  if (ia !== ib) return ia - ib;
  return a.localeCompare(b, "ko");
};

export default function SwimmingClassPage() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [regionError, setRegionError] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    name: string;
    session: string;
    lane: string;
    title: string;
    time: string;
    price: number;
    isWaitlist: boolean;
    available?: boolean; // Added for consistency with updates
  } | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [debugCollapsed, setDebugCollapsed] = useState(false);
  const [debugFilter, setDebugFilter] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "male",
    location: "", // Changed from 'residence' to 'location' for clarity
    email: "",
    painAreas: ["없음"] as string[],
    swimmingExperience: "",
    message: "",
  });
  const [agreeAll, setAgreeAll] = useState(false);
  const [agree1, setAgree1] = useState(false); // 개인정보 수집
  const [agree2, setAgree2] = useState(false); // 서비스 이용약관
  const [agree4, setAgree4] = useState(false); // 취소
  const [agree5, setAgree5] = useState(false); // 환불
  const [agree6, setAgree6] = useState(false); // 수영 활동 안전 및 면책
  const [agree7, setAgree7] = useState(false); // 영상촬영
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false); // Added cancellation notice modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistClass, setWaitlistClass] = useState<{
    name: string;
    time: string;
    type: string;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [finalAgree, setFinalAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [applicantPageId, setApplicantPageId] = useState<string | null>(null);
  const [paidPageId, setPaidPageId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<
    "입금대기" | "입금완료" | "결제대기" | "결제완료" | "예약대기"
  >("결제대기");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [videoCode, setVideoCode] = useState("");
  const [funnelCounts, setFunnelCounts] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  // 각 클래스별 신청 인원 추적 (클래스 이름을 키로 사용)
  // 모든 클래스는 0부터 시작하여 신청가능 일반 모드로 시작
  // 1~6번째: 일반 결제 / 7번째부터: 예약대기
  const [classEnrollment, setClassEnrollment] =
    useState<Record<string, number>>(INITIAL_ENROLLMENT);
  const [manualWaitlistClasses, setManualWaitlistClasses] = useState<
    Set<string>
  >(new Set<string>());
  const [waitlistThresholds, setWaitlistThresholds] = useState<
    Record<string, number>
  >({});
  const { toast } = useToast();
  const submittedApplicantsRef = useRef<Set<string>>(new Set());
  const applicationSectionRef = useRef<HTMLDivElement | null>(null);
  const lastFunnelActionRef = useRef<{ action: string; ts: number } | null>(
    null,
  );

  // 개발자 모드 (URL 파라미터로 활성화)
  const [showDebug, setShowDebug] = useState(false);
  // PG 심사용 토스 테스트 결제창 (NEXT_PUBLIC_PG_REVIEW=true 또는 ?pgtest=1)
  const pgReviewFromEnv = process.env.NEXT_PUBLIC_PG_REVIEW === "true";
  const [showPgTest, setShowPgTest] = useState(pgReviewFromEnv);
  const [isClassPgTestLoading, setIsClassPgTestLoading] = useState(false);

  // 현재 활성 특강의 클래스 키 목록 (지난 특강 제거용)
  const activeClassKeys = new Set(
    getActiveClasses().flatMap((c) =>
      (TIMETABLE_BY_CLASS_ID[c.id] ?? []).flatMap((row) =>
        row.lanes
          .filter((l) => !l.closed && l.title)
          .map((l) => makeClassKey(c.id, row.session, l.lane, l.title)),
      ),
    ),
  );

  const activeDeveloperClassEntries = Object.entries(classEnrollment)
    .filter(([className]) => {
      // 지난 특강 클래스는 개발자 모드에서도 제외
      if (!activeClassKeys.has(className)) return false;
      const q = debugFilter.trim();
      if (!q) return true;
      return className.toLowerCase().includes(q.toLowerCase());
    })
    .sort(([a], [b]) => compareClassKeysBySchedule(a, b));

  const activeDeveloperClassNames = activeDeveloperClassEntries.map(
    ([className]) => className,
  );

  // URL 파라미터 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowDebug(params.get("debug") === "true");
    const pgTestOn = params.get("pgtest") === "1";
    setShowPgTest(pgReviewFromEnv || pgTestOn);
    const nextVideoCode = params.get("video")?.trim() || "";
    setVideoCode(nextVideoCode);
    console.log("[퍼널] URL 파라미터 확인:", {
      debug: params.get("debug") === "true",
      pgReview: pgReviewFromEnv,
      pgtest: pgTestOn,
      showPgTest: pgReviewFromEnv || pgTestOn,
      video: nextVideoCode,
    });
  }, [pgReviewFromEnv]);

  useEffect(() => {
    if (pgReviewFromEnv) {
      console.log("[PG테스트] 심사 모드 ON — 메인 URL에서 테스트 결제창 표시");
    }
  }, [pgReviewFromEnv]);

  useEffect(() => {
    console.log("[특강일정] 활성 특강 목록", {
      classIds: getActiveClasses().map((c) => ({
        id: c.id,
        location: c.locationCode,
        date: `${c.month}/${c.dateNum}`,
      })),
      enrollmentKeys: Object.keys(INITIAL_ENROLLMENT).length,
    });
  }, []);

  const resetClassEnrollment = () => {
    const resetCounts = { ...INITIAL_ENROLLMENT };
    setClassEnrollment(resetCounts);
    // 예약대기는 서버에서 관리하므로 여기서는 초기화하지 않음
    try {
      localStorage.setItem(
        "class_enrollment_counts",
        JSON.stringify(resetCounts),
      );
    } catch (error) {
      console.log("[카운터] 로컬 저장 실패:", error);
    }
    submittedApplicantsRef.current.clear();
    console.log("[카운터] 수영 클래스 선택 카운터 초기화:", resetCounts);
    console.log("[중복방지] 신청자 중복 방지 데이터 초기화 완료");
  };

  const loadClassEnrollment = () => {
    try {
      const stored = localStorage.getItem("class_enrollment_counts");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, number>;
        const merged = normalizeEnrollmentCounts(parsed);
        setClassEnrollment(merged);
        console.log("[카운터] 로컬 카운터 불러오기:", merged);
      }
      // 예약대기 클래스는 서버에서만 가져옴 (syncManualWaitlistFromServer)
    } catch (error) {
      console.log("[카운터] 로컬 불러오기 실패:", error);
    }
    console.log("[카운터] 로컬 카운터 불러오기 완료");
  };

  // 기본 예약대기 기준은 7명이며, 개발자 모드에서 클래스별 변경 가능

  const syncClassEnrollmentFromNotion = async () => {
    try {
      console.log("[카운터] Notion 카운터 동기화 시작");
      const result = await getClassEnrollmentCounts(
        Object.keys(INITIAL_ENROLLMENT),
      );
      if (result.success && result.counts) {
        const merged = normalizeEnrollmentCounts(result.counts);
        setClassEnrollment(merged);
        try {
          localStorage.setItem(
            "class_enrollment_counts",
            JSON.stringify(merged),
          );
        } catch (error) {
          console.log("[카운터] 로컬 저장 실패:", error);
        }
        console.log("[카운터] Notion 카운터 동기화 완료:", merged);
      } else {
        console.warn("[카운터] Notion 카운터 조회 실패:", result.error);
      }
    } catch (error) {
      console.error("[카운터] Notion 카운터 동기화 오류:", error);
    }
  };

  const resetFunnelCounts = async () => {
    const storageKey = `funnel_totals_${videoCode || "default"}`;
    try {
      const response = await fetch("/api/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", video: videoCode }),
      });
      const data = await response.json();
      if (data?.totals) {
        setFunnelCounts(data.totals);
        try {
          localStorage.setItem(storageKey, JSON.stringify(data.totals));
        } catch (error) {
          console.log("[퍼널] 로컬 저장 실패:", error);
        }
      }
      console.log("[퍼널] 단계 카운트 초기화 완료:", data?.totals);
    } catch (error) {
      console.log("[퍼널] 카운터 초기화 실패:", error);
    }
  };

  const incrementFunnelCount = (
    stepNumber: 0 | 1 | 2 | 3 | 4,
    reason: string,
    explicitVideo?: string,
  ) => {
    const guardKey = "step_view_guard";
    const now = Date.now();
    const currentVideoCode = explicitVideo ?? videoCode;
    let guard: { step: number; ts: number } | null = null;
    try {
      const guardRaw = sessionStorage.getItem(guardKey);
      guard = guardRaw ? JSON.parse(guardRaw) : null;
    } catch {
      guard = null;
    }
    if (guard && guard.step === stepNumber && now - guard.ts < 2000) {
      console.log(
        `[퍼널] 중복 카운트 차단: step=${stepNumber}, reason=${reason}, last=${guard.ts}, now=${now}`,
      );
      return;
    }
    if (
      stepNumber === 2 &&
      lastFunnelActionRef.current &&
      lastFunnelActionRef.current.action === "step1_click" &&
      now - lastFunnelActionRef.current.ts < 3000
    ) {
      console.log(
        `[퍼널] 2단계 카운트 차단: step1 클릭 직후, reason=${reason}, last=${lastFunnelActionRef.current.ts}, now=${now}`,
      );
      return;
    }
    sessionStorage.setItem(
      guardKey,
      JSON.stringify({ step: stepNumber, ts: now }),
    );
    void (async () => {
      try {
        const response = await fetch("/api/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: stepNumber,
            reason,
            video: currentVideoCode,
            debug: showDebug,
          }),
        });
        const data = await response.json();
        if (data?.totals) {
          setFunnelCounts(data.totals);
          try {
            localStorage.setItem(
              `funnel_totals_${currentVideoCode || "default"}`,
              JSON.stringify(data.totals),
            );
          } catch (error) {
            console.log("[퍼널] 로컬 저장 실패:", error);
          }
        } else if (
          data?.counted &&
          typeof data?.step === "number" &&
          typeof data?.count === "number"
        ) {
          setFunnelCounts((curr) => ({
            ...curr,
            [data.step]: data.count,
          }));
        }
        console.log(
          `[퍼널] 카운트 ${data?.counted ? "증가" : "차단"}: step=${stepNumber}, video=${currentVideoCode || "default"}, reason=${reason}`,
        );
      } catch (error) {
        console.log("[퍼널] 카운트 요청 실패:", error);
      }
    })();
  };

  const markFunnelStep = (stepNumber: 1 | 2 | 3 | 4) => {
    try {
      sessionStorage.setItem(`funnel_step_${stepNumber}`, "1");
    } catch (error) {
      console.log("[퍼널] 세션 저장 실패:", error);
    }
  };

  const hasFunnelStep = (stepNumber: 1 | 2 | 3 | 4) => {
    try {
      return sessionStorage.getItem(`funnel_step_${stepNumber}`) === "1";
    } catch (error) {
      console.log("[퍼널] 세션 조회 실패:", error);
      return false;
    }
  };

  // 서버에서 수동 예약대기 클래스 목록 가져오기
  const syncManualWaitlistFromServer = async () => {
    try {
      const response = await fetch("/api/admin/set-waitlist");
      const data = await response.json();
      if (data.success && data.manualWaitlistClasses) {
        setManualWaitlistClasses(
          normalizeManualWaitlistClasses(data.manualWaitlistClasses),
        );
        console.log(
          "[서버 동기화] 수동 예약대기 클래스:",
          data.manualWaitlistClasses,
        );
      }
      if (data.success && data.thresholds) {
        const normalized = normalizeWaitlistThresholds(data.thresholds);
        setWaitlistThresholds(normalized);
        console.log(
          "[서버 동기화] 예약대기 기준(thresholds):",
          normalized,
        );
      }
    } catch (error) {
      console.error("[서버 동기화] 예약대기 클래스 조회 실패:", error);
    }
  };

  // 컴포넌트 마운트 시 클래스별 신청 인원 로드 + Notion 동기화 + 서버 예약대기 설정 동기화
  useEffect(() => {
    loadClassEnrollment();
    void syncClassEnrollmentFromNotion();
    void syncManualWaitlistFromServer();
  }, []);

  // 개발자 모드(?debug=true): 서초·김포 포함 전 레인 키가 동일 규칙으로 표시·Notion 동기화됨
  useEffect(() => {
    if (!showDebug) return;
    const intervalId = window.setInterval(() => {
      void syncClassEnrollmentFromNotion();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [showDebug]);

  // 컴포넌트 마운트 시 퍼널 카운트 로드 (서버 기준)
  useEffect(() => {
    const storageKey = `funnel_totals_${videoCode || "default"}`;
    try {
      const localTotals = localStorage.getItem(storageKey);
      if (localTotals) {
        const parsed = JSON.parse(localTotals) as Record<number, number>;
        setFunnelCounts(parsed as Record<number, number>);
        console.log("[퍼널] 로컬 카운트 불러오기:", parsed);
      }
    } catch (error) {
      console.log("[퍼널] 로컬 카운트 불러오기 실패:", error);
    }
    void (async () => {
      try {
        const response = await fetch(
          videoCode
            ? `/api/funnel?video=${encodeURIComponent(videoCode)}`
            : "/api/funnel",
          { cache: "no-store" },
        );
        const data = await response.json();
        if (data?.totals) {
          setFunnelCounts(data.totals);
          try {
            localStorage.setItem(storageKey, JSON.stringify(data.totals));
          } catch (error) {
            console.log("[퍼널] 로컬 저장 실패:", error);
          }
          console.log("[퍼널] 서버 카운트 불러오기:", {
            video: videoCode,
            totals: data.totals,
          });
        }
      } catch (error) {
        console.log("[퍼널] 서버 카운트 불러오기 실패:", error);
      }
    })();
  }, [videoCode]);

  useEffect(() => {
    if (!videoCode) return;

    const landingKey = `funnel_landing_${videoCode}`;
    try {
      if (sessionStorage.getItem(landingKey) === "1") {
        console.log("[퍼널] 랜딩 유입 중복 차단:", { video: videoCode });
        return;
      }
      sessionStorage.setItem(landingKey, "1");
    } catch (error) {
      console.log("[퍼널] 랜딩 유입 세션 저장 실패:", error);
    }

    incrementFunnelCount(0, "랜딩 유입", videoCode);
  }, [videoCode]);

  // 단계 변경 시 항상 상단으로 스크롤
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[스크롤] 단계 변경 상단 이동:", step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const getApplicantKey = (className?: string) => {
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    if (!name || !phone) return "";
    if (className) {
      return `${name}|${phone}|${className}`;
    }
    return `${name}|${phone}`;
  };

  const todayKst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
  }).format(new Date());

  const togglePainArea = (area: string) => {
    setFormData((prev) => {
      const hasArea = prev.painAreas.includes(area);
      let nextAreas: string[];

      if (area === "없음") {
        nextAreas = ["없음"];
      } else {
        const withoutNone = prev.painAreas.filter((item) => item !== "없음");
        nextAreas = hasArea
          ? withoutNone.filter((item) => item !== area)
          : [...withoutNone, area];
        if (nextAreas.length === 0) nextAreas = ["없음"];
      }

      console.log("[설문] 통증 부위 선택:", nextAreas);
      return { ...prev, painAreas: nextAreas };
    });
  };

  // 전체 예약대기 강제 모드 로그 (한 번만)
  useEffect(() => {
    if (FORCE_ALL_WAITLIST) {
      console.log("[예약대기] 전체 예약대기 강제 모드 활성화");
    }
  }, []);

  // 클래스별 신청 가능 여부 확인 (7명 이상이면 예약대기)
  const isClassFull = useCallback(
    (className: string) => {
      if (FORCE_ALL_WAITLIST) return true;
      if (manualWaitlistClasses.has(className)) return true;
      const threshold = resolveWaitlistThreshold(
        className,
        waitlistThresholds,
      );
      const count = getEffectiveEnrollmentCount(className, classEnrollment);
      return count >= threshold;
    },
    [manualWaitlistClasses, classEnrollment, waitlistThresholds],
  );

  // 클래스별 결제 여부 확인 (7명 이상이면 예약대기)
  const hasEnrollment = useCallback(
    (className: string) => {
      if (FORCE_ALL_WAITLIST) return true;
      if (manualWaitlistClasses.has(className)) return true;
      const threshold = resolveWaitlistThreshold(
        className,
        waitlistThresholds,
      );
      const count = getEffectiveEnrollmentCount(className, classEnrollment);
      return count >= threshold;
    },
    [manualWaitlistClasses, classEnrollment, waitlistThresholds],
  );

  // 주문번호 생성 함수 (겹치지 않도록)
  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `WC-${timestamp}-${random}`;
  };

  // 주문일시 포맷 함수
  const formatOrderDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const ampm = hours < 12 ? "오전" : "오후";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    const displaySeconds = seconds.toString().padStart(2, "0");

    return `${year}.${month}.${day} ${ampm} ${displayHours}:${displayMinutes}:${displaySeconds}`;
  };

  const formatSheetTimestamp = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatSheetClassDate = (year: number, month: number, day: number) => {
    const safeMonth = String(month).padStart(2, "0");
    const safeDay = String(day).padStart(2, "0");
    return `${year}-${safeMonth}-${safeDay}`;
  };

  const formatSheetSession = (session: string) => {
    const matched = session.match(/\d+부/);
    return matched?.[0] ?? session;
  };

  // 입금기한 계산 함수 (결제 시점 + 2일)
  const getDepositDeadline = () => {
    if (!paymentDate) return "";
    const deadline = new Date(paymentDate);
    deadline.setDate(deadline.getDate() + 2);

    const year = deadline.getFullYear();
    const month = deadline.getMonth() + 1;
    const day = deadline.getDate();
    const hours = deadline.getHours();
    const minutes = deadline.getMinutes();

    const ampm = hours < 12 ? "오전" : "오후";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");

    return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHours}시 ${displayMinutes}분`;
  };

  // 달력: 한국 시간(KST) 기준 현재 연·월로 초기화
  const kstTodayInit = getKoreanTodayParts();
  const [calendarMonth, setCalendarMonth] = useState(kstTodayInit.month);
  const [calendarYear, setCalendarYear] = useState(kstTodayInit.year);
  const [today, setToday] = useState(kstTodayInit);
  const selectedClassRef = useRef<string | null>(null);
  selectedClassRef.current = selectedClass;

  const selectedClassIdNum = selectedClass ? Number(selectedClass) : NaN;
  const activeTimetable =
    Number.isFinite(selectedClassIdNum) &&
    TIMETABLE_BY_CLASS_ID[selectedClassIdNum]
      ? TIMETABLE_BY_CLASS_ID[selectedClassIdNum]
      : [];

  // selectedClass 변경 시 해당 특강 월로 이동, 미선택 시 KST 현재 월
  useEffect(() => {
    const kst = getKoreanTodayParts();
    if (selectedClass) {
      const selectedClassData = classes.find(
        (c) => c.id === Number(selectedClass),
      );
      if (selectedClassData) {
        setCalendarMonth(selectedClassData.month);
        setCalendarYear(selectedClassData.year ?? kst.year);
        console.log(
          `[달력] 선택 지역 연/월: ${selectedClassData.year ?? kst.year}-${selectedClassData.month}`,
        );
      }
    } else {
      setCalendarMonth(kst.month);
      setCalendarYear(kst.year);
      console.log(`[달력] KST 현재 월로 복귀: ${kst.year}-${kst.month}`);
    }
  }, [selectedClass]);

  useEffect(() => {
    const syncToday = () => {
      const nextToday = getKoreanTodayParts();
      setToday(nextToday);
      console.log("[달력] KST 오늘 날짜 동기화:", nextToday);
    };

    syncToday();

    const intervalId = window.setInterval(syncToday, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");

    // 최대 11자리까지만 허용
    const limitedNumbers = numbers.slice(0, 11);

    // 길이에 따라 하이픈 추가
    if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 6) {
      // 4~6자리: 010-123 형식
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
    } else if (limitedNumbers.length <= 10) {
      // 7~10자리: 010-123-4567 형식 (3-3-4)
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(
        3,
        6,
      )}-${limitedNumbers.slice(6)}`;
    } else {
      // 11자리: 010-1234-5678 형식 (3-4-4)
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(
        3,
        7,
      )}-${limitedNumbers.slice(7)}`;
    }
  };

  // Create calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // 선택 전에는 보고 있는 월의 모든 특강, 선택 후에는 선택한 특강 날짜만 표시
  const highlightedDates = selectedClass
    ? getActiveClasses()
        .filter(
          (c) =>
            String(c.id) === selectedClass &&
            c.year === calendarYear &&
            c.month === calendarMonth,
        )
        .map((c) => c.dateNum)
    : getActiveClasses()
        .filter((c) => c.year === calendarYear && c.month === calendarMonth)
        .map((c) => c.dateNum);

  const selectedScheduleClass = selectedClass
    ? classes.find((c) => String(c.id) === selectedClass) || null
    : null;

  const getScheduleShortLabel = (classItem: ClassItem) =>
    `${classItem.locationCode} ${classItem.month}/${classItem.dateNum}`;

  const scheduleApplyButtonText = selectedScheduleClass
    ? `${getScheduleShortLabel(selectedScheduleClass)} 특강 신청하기`
    : "먼저 일정을 선택해 주세요";

  const handleRegistration = () => {
    incrementFunnelCount(1, "지금 바로 신청하기 클릭");
    markFunnelStep(1);
    lastFunnelActionRef.current = { action: "step1_click", ts: Date.now() };
    setShowRegistrationForm(true);
    setStep(3); // 신청/결제 통합 화면으로 이동
  };

  useEffect(() => {
    if (!showRegistrationForm || !selectedScheduleClass || step !== 3) return;

    const timeoutId = window.setTimeout(() => {
      applicationSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [showRegistrationForm, selectedScheduleClass, step]);

  const handleScheduleRegistration = () => {
    if (!selectedScheduleClass) {
      setRegionError(true);
      toast({
        title: "일정을 선택해주세요",
        description: "신청할 특강 일정을 먼저 선택한 뒤 진행해주세요.",
        variant: "destructive",
      });
      console.log("[CTA] 일정 미선택 상태에서 신청 버튼 클릭");
      return;
    }

    console.log("[CTA] 선택 일정으로 신청 모달 열기:", {
      id: selectedScheduleClass.id,
      location: selectedScheduleClass.location,
      date: selectedScheduleClass.date,
    });
    handleRegistration();
  };

  const validateApplicationForPayment = () => {
    if (!selectedTimeSlot) {
      toast({
        title: "클래스를 선택해주세요",
        description: "신청할 반을 먼저 선택한 뒤 결제를 진행해주세요.",
        variant: "destructive",
      });
      console.log("[신청/결제] 클래스 미선택 - 결제 차단");
      return false;
    }

    if (!agreeAll) {
      toast({
        title: "약관 동의 필요",
        description: "모든 약관에 동의해야 결제를 진행할 수 있습니다.",
        variant: "destructive",
      });
      console.log("[신청/결제] 약관 전체 동의 미체크 - 결제 차단");
      return false;
    }

    const isKorean = /^[가-힣]+$/.test(formData.name);
    const isPhone010 = formData.phone.startsWith("010");

    if (!isKorean) {
      toast({
        title: "입력 오류",
        description: "이름은 한글로만 입력해주세요.",
        variant: "destructive",
      });
      console.log("[신청/결제] 이름 유효성 실패:", formData.name);
      return false;
    }

    if (!isPhone010) {
      toast({
        title: "입력 오류",
        description: "전화번호는 010으로 시작해야 합니다.",
        variant: "destructive",
      });
      console.log("[신청/결제] 전화번호 유효성 실패:", formData.phone);
      return false;
    }

    if (!formData.location) {
      toast({
        title: "거주지역 입력 필요",
        description: "수업 안내를 위해 거주지역을 입력해주세요.",
        variant: "destructive",
      });
      console.log("[신청/결제] 거주지역 미입력 - 결제 차단");
      return false;
    }

    if (!formData.swimmingExperience) {
      toast({
        title: "수영 경력 선택 필요",
        description: "수업 준비를 위해 수영 경력을 선택해주세요.",
        variant: "destructive",
      });
      console.log("[신청/결제] 수영 경력 미선택 - 결제 차단");
      return false;
    }

    return true;
  };

  const handleBackToSchedule = () => {
    setShowRegistrationForm(false);
    setShowDepositModal(false);
    setStep(1); // Go back to step 1
  };

  const copyDepositAccount = async () => {
    try {
      await navigator.clipboard.writeText(DEPOSIT_ACCOUNT_LABEL);
      toast({
        title: "계좌번호가 복사되었습니다.",
      });
      console.log("[입금안내] 계좌번호 복사 완료:", DEPOSIT_ACCOUNT_LABEL);
    } catch (error) {
      console.error("[입금안내] 계좌번호 복사 실패:", error);
      toast({
        title: "복사 실패",
        description: "계좌번호를 직접 선택해서 복사해주세요.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const allChecked = agree1 && agree2 && agree4 && agree5 && agree6 && agree7;
    setAgreeAll(allChecked);
  }, [agree1, agree2, agree4, agree5, agree6, agree7]);

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgree1(checked);
    setAgree2(checked);
    setAgree4(checked);
    setAgree5(checked);
    setAgree6(checked);
    setAgree7(checked);
  };

  const handleSubmit = () => {
    setStep(3);
  };

  const handleClassPgTestPayment = async () => {
    if (isClassPgTestLoading || !selectedTimeSlot) return;
    const amount = selectedTimeSlot.price;
    if (!amount || amount <= 0) {
      toast({
        title: "테스트 결제 불가",
        description: "선택한 클래스에 결제 금액이 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsClassPgTestLoading(true);
    console.log("[PG테스트] 특강 테스트 결제 시작:", {
      className: selectedTimeSlot.name,
      amount,
    });

    try {
      const orderRes = await fetch("/api/toss/create-class-test-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          orderName: selectedTimeSlot.name,
        }),
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        console.error("[PG테스트] 주문 생성 실패:", orderData.error);
        toast({
          title: "테스트 주문 실패",
          description: orderData.error,
          variant: "destructive",
        });
        return;
      }

      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(orderData.clientKey);
      const payment = tossPayments.payment({ customerKey: "ANONYMOUS" });

      console.log("[PG테스트] 토스 결제창 호출:", orderData.orderId);

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: orderData.amount },
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        successUrl: `${window.location.origin}/class-pg-test/success`,
        failUrl: `${window.location.origin}/class-pg-test/fail`,
      });
    } catch (error) {
      console.error("[PG테스트] 결제 오류:", error);
      toast({
        title: "테스트 결제 오류",
        description: "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsClassPgTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <main className="container mx-auto py-8 px-4 max-w-4xl flex flex-col">
        {/* 개발자 모드: 카운터 표시 (모든 단계에서 표시) */}
        {showDebug && (
          <div className="fixed top-4 right-4 bg-black/90 text-white rounded-lg text-xs z-50 shadow-2xl border-2 border-yellow-500 w-[340px] sm:w-[420px] lg:w-[560px] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-yellow-500/40 bg-black/95 sticky top-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-yellow-400 text-sm">
                  🔧 개발자 모드
                </div>
                <button
                  type="button"
                  className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/10"
                  onClick={() => {
                    setDebugCollapsed((v) => !v);
                    console.log(
                      "[개발자] 패널 토글:",
                      !debugCollapsed ? "접기" : "펼치기",
                    );
                  }}
                >
                  {debugCollapsed ? "펼치기" : "접기"}
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-[11px] text-gray-300">
                  기준 날짜: <span className="font-mono">{todayKst}</span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  classes: {activeDeveloperClassNames.length}
                </div>
              </div>
              {!debugCollapsed && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={debugFilter}
                    onChange={(e) => setDebugFilter(e.target.value)}
                    placeholder="클래스 검색 (예: 1부, 3레인, 접영)"
                    className="w-full rounded bg-black/60 border border-gray-700 px-2 py-1 text-white text-[12px] placeholder:text-gray-500"
                  />
                </div>
              )}
            </div>

            {!debugCollapsed && (
              <div className="p-3 overflow-auto">
                <div className="space-y-1">
                  {activeDeveloperClassEntries.map(([className, count]) => {
                      const effectiveCount = getEffectiveEnrollmentCount(
                        className,
                        classEnrollment,
                      );
                      const threshold = manualWaitlistClasses.has(className)
                        ? "강제예약"
                        : resolveWaitlistThreshold(
                            className,
                            waitlistThresholds,
                          );
                      const isWaitlist = isClassFull(className);
                      const effectiveThreshold =
                        typeof threshold === "number"
                          ? threshold
                          : DEFAULT_WAITLIST_THRESHOLD;
                      return (
                        <div key={className} className="flex flex-col gap-1">
                          <div className="flex justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-gray-300 font-mono break-words">
                                {className}
                              </div>
                              <div className="font-bold text-sm">
                                {effectiveCount}명 / 다음: {effectiveCount + 1}
                                번째
                              </div>
                              <div className="text-[11px] text-gray-400">
                                예약대기 기준:{" "}
                                {threshold === "강제예약"
                                  ? "강제예약"
                                  : String(effectiveThreshold)}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="text-[11px] text-gray-400">
                                  기준 변경:
                                </div>
                                <input
                                  key={`${className}-${effectiveThreshold}`}
                                  type="number"
                                  min={0}
                                  max={999}
                                  defaultValue={effectiveThreshold}
                                  className="w-16 rounded bg-black/60 border border-gray-600 px-2 py-1 text-white text-[11px]"
                                  onBlur={async (e) => {
                                    const next = Number(e.currentTarget.value);
                                    if (!Number.isFinite(next) || next < 0) {
                                      e.currentTarget.value =
                                        String(effectiveThreshold);
                                      return;
                                    }
                                    console.log("[개발자] 기준 변경 요청:", {
                                      className,
                                      threshold: next,
                                    });
                                    try {
                                      const response = await fetch(
                                        "/api/admin/set-waitlist",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            action: "setThreshold",
                                            className,
                                            threshold: next,
                                          }),
                                        },
                                      );
                                      const data = await response.json();
                                      if (
                                        response.ok &&
                                        data.success &&
                                        data.thresholds
                                      ) {
                                        setWaitlistThresholds((prev) => ({
                                          ...prev,
                                          ...normalizeWaitlistThresholds(
                                            data.thresholds,
                                          ),
                                          [className]: next,
                                        }));
                                        console.log("[개발자] 기준 변경 완료:", {
                                          className,
                                          threshold: next,
                                        });
                                      } else {
                                        console.error(
                                          "[개발자] 기준 변경 실패:",
                                          data?.error || response.status,
                                        );
                                        toast({
                                          title: "기준 변경 실패",
                                          description:
                                            data?.error ||
                                            "서버에서 기준 인원을 저장하지 못했습니다.",
                                          variant: "destructive",
                                        });
                                        e.currentTarget.value =
                                          String(effectiveThreshold);
                                      }
                                    } catch (error) {
                                      console.error(
                                        "[개발자] 기준 변경 API 호출 실패:",
                                        error,
                                      );
                                      toast({
                                        title: "기준 변경 오류",
                                        description:
                                          "네트워크 오류가 발생했습니다.",
                                        variant: "destructive",
                                      });
                                      e.currentTarget.value =
                                        String(effectiveThreshold);
                                    }
                                  }}
                                />
                                <span className="text-[10px] text-gray-500">
                                  기본 7명, 클래스별 변경 가능
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className={`text-[10px] px-2 py-1 h-auto ${
                                isWaitlist
                                  ? "bg-gray-600 hover:bg-gray-500"
                                  : "bg-orange-600 hover:bg-orange-500"
                              }`}
                              onClick={async () => {
                                if (isWaitlist) {
                                  // 예약대기 해제
                                  const nextThreshold = Math.max(
                                    effectiveThreshold,
                                    effectiveCount + 1,
                                  );
                                  console.log(
                                    "[개발자] 예약대기 해제 요청:",
                                    {
                                      className,
                                      effectiveCount,
                                      effectiveThreshold,
                                      nextThreshold,
                                    },
                                  );

                                  // 수동 예약대기를 해제하고, 인원 기준으로 막힌 경우 기준을 올립니다.
                                  try {
                                    const response = await fetch(
                                      "/api/admin/set-waitlist",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          className,
                                          action: "remove",
                                        }),
                                      },
                                    );
                                    const data = await response.json();
                                    if (response.ok && data.success) {
                                      setManualWaitlistClasses(
                                        normalizeManualWaitlistClasses(
                                          data.manualWaitlistClasses,
                                        ),
                                      );
                                      if (data.thresholds) {
                                        setWaitlistThresholds(normalizeWaitlistThresholds(data.thresholds));
                                      }
                                      if (effectiveCount >= effectiveThreshold) {
                                        const thresholdResponse = await fetch(
                                          "/api/admin/set-waitlist",
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              action: "setThreshold",
                                              className,
                                              threshold: nextThreshold,
                                            }),
                                          },
                                        );
                                        const thresholdData =
                                          await thresholdResponse.json();
                                        if (
                                          thresholdResponse.ok &&
                                          thresholdData.success &&
                                          thresholdData.thresholds
                                        ) {
                                          setWaitlistThresholds((prev) => ({
                                            ...prev,
                                            ...normalizeWaitlistThresholds(
                                              thresholdData.thresholds,
                                            ),
                                            [className]: nextThreshold,
                                          }));
                                        } else {
                                          console.error(
                                            "[개발자] 대기 해제 기준 변경 실패:",
                                            thresholdData?.error ||
                                              thresholdResponse.status,
                                          );
                                          toast({
                                            title: "기준 변경 실패",
                                            description:
                                              thresholdData?.error ||
                                              "기준 인원을 저장하지 못했습니다.",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    } else {
                                      console.error(
                                        "[개발자] 대기 해제 실패:",
                                        data?.error,
                                      );
                                      toast({
                                        title: "대기 해제 실패",
                                        description:
                                          data?.error ||
                                          "서버에서 예약대기 해제를 처리하지 못했습니다.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    console.error(
                                      "[개발자] 서버 API 호출 실패:",
                                      error,
                                    );
                                    toast({
                                      title: "대기 해제 오류",
                                      description:
                                        "네트워크 오류가 발생했습니다.",
                                      variant: "destructive",
                                    });
                                  }
                                  console.log(
                                    "[개발자] 예약대기 해제 완료:",
                                    className,
                                  );
                                } else {
                                  // 예약대기 전환
                                  console.log(
                                    "[개발자] 예약대기 전환 요청:",
                                    className,
                                  );

                                  // 서버 API 호출 (모든 사용자에게 적용)
                                  try {
                                    const response = await fetch(
                                      "/api/admin/set-waitlist",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          className,
                                          action: "add",
                                        }),
                                      },
                                    );
                                    const data = await response.json();
                                    if (response.ok && data.success) {
                                      setManualWaitlistClasses(
                                        normalizeManualWaitlistClasses(
                                          data.manualWaitlistClasses,
                                        ),
                                      );
                                      if (data.thresholds) {
                                        setWaitlistThresholds(normalizeWaitlistThresholds(data.thresholds));
                                      }
                                    } else {
                                      console.error(
                                        "[개발자] 예약대기 설정 실패:",
                                        data?.error,
                                      );
                                      toast({
                                        title: "예약대기 설정 실패",
                                        description:
                                          data?.error ||
                                          "서버에서 예약대기 설정을 처리하지 못했습니다.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    console.error(
                                      "[개발자] 서버 API 호출 실패:",
                                      error,
                                    );
                                    toast({
                                      title: "예약대기 설정 오류",
                                      description:
                                        "네트워크 오류가 발생했습니다.",
                                      variant: "destructive",
                                    });
                                  }

                                  console.log(
                                    "[개발자] 예약대기 전환 완료:",
                                    className,
                                  );
                                }
                              }}
                            >
                              {isWaitlist ? "대기해제" : "예약대기"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Button
                    size="sm"
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-black text-xs"
                    onClick={async () => {
                      const classNames = activeDeveloperClassNames;
                      console.log("[개발자] Notion 설정 행 자동 생성 요청:", {
                        count: classNames.length,
                      });
                      try {
                        const response = await fetch(
                          "/api/admin/set-waitlist",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "ensure",
                              classNames,
                            }),
                          },
                        );
                        const data = await response.json();
                        if (response.ok && data.success) {
                          setManualWaitlistClasses(
                            normalizeManualWaitlistClasses(
                              data.manualWaitlistClasses || [],
                            ),
                          );
                          if (data.thresholds) {
                            setWaitlistThresholds(normalizeWaitlistThresholds(data.thresholds));
                          }
                          console.log("[개발자] Notion 설정 행 자동 생성 완료");
                          toast({
                            title: "Notion 설정행 생성 완료",
                            description:
                              "모든 클래스의 설정행이 Notion에 정상 저장·동기화되었습니다.",
                          });
                        } else {
                          console.error(
                            "[개발자] Notion 설정 행 자동 생성 실패:",
                            data.error,
                          );
                          toast({
                            title: "Notion 설정행 생성 실패",
                            description: data?.error || "서버 처리 실패",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("[개발자] ensure API 호출 실패:", error);
                        toast({
                          title: "Notion 설정행 생성 오류",
                          description: "네트워크 오류가 발생했습니다.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Notion 설정행 자동 생성
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs"
                      onClick={async () => {
                        const classNames = activeDeveloperClassNames;
                        console.log("[개발자] 전체 예약대기 ON:", {
                          count: classNames.length,
                        });
                        try {
                          const response = await fetch(
                            "/api/admin/set-waitlist",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "bulkAdd",
                                classNames,
                              }),
                            },
                          );
                          const data = await response.json();
                          if (response.ok && data.success) {
                            setManualWaitlistClasses(
                              normalizeManualWaitlistClasses(
                                data.manualWaitlistClasses || [],
                              ),
                            );
                            if (data.thresholds)
                              setWaitlistThresholds(normalizeWaitlistThresholds(data.thresholds));
                          } else {
                            console.error(
                              "[개발자] 전체 예약대기 ON 실패:",
                              data.error,
                            );
                            toast({
                              title: "전체 예약대기 실패",
                              description: data?.error || "서버 처리 실패",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error(
                            "[개발자] bulkAdd API 호출 실패:",
                            error,
                          );
                          toast({
                            title: "전체 예약대기 오류",
                            description: "네트워크 오류가 발생했습니다.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      전체 예약대기
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-gray-500 hover:bg-gray-400 text-white text-xs"
                      onClick={async () => {
                        const classNames = activeDeveloperClassNames;
                        console.log("[개발자] 전체 예약대기 OFF:", {
                          count: classNames.length,
                        });
                        try {
                          const response = await fetch(
                            "/api/admin/set-waitlist",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "bulkRemove",
                                classNames,
                              }),
                            },
                          );
                          const data = await response.json();
                          if (response.ok && data.success) {
                            setManualWaitlistClasses(
                              normalizeManualWaitlistClasses(
                                data.manualWaitlistClasses || [],
                              ),
                            );
                            if (data.thresholds)
                              setWaitlistThresholds(normalizeWaitlistThresholds(data.thresholds));
                          } else {
                            console.error(
                              "[개발자] 전체 예약대기 OFF 실패:",
                              data.error,
                            );
                            toast({
                              title: "전체 해제 실패",
                              description: data?.error || "서버 처리 실패",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error(
                            "[개발자] bulkRemove API 호출 실패:",
                            error,
                          );
                          toast({
                            title: "전체 해제 오류",
                            description: "네트워크 오류가 발생했습니다.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      전체 해제
                    </Button>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-2 w-full bg-gray-800 hover:bg-gray-700 text-white text-xs"
                  onClick={() => {
                    void syncClassEnrollmentFromNotion();
                  }}
                >
                  카운터 새로고침
                </Button>
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <div className="text-yellow-400 font-semibold mb-1">
                    퍼널 카운트
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-white/5 border border-white/10 rounded-md p-2">
                      <div className="text-[11px] text-gray-300">1. 일정 선택</div>
                      <div className="text-base font-bold">
                        {funnelCounts[1] || 0}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        일정 선택
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-md p-2">
                      <div className="text-[11px] text-gray-300">
                        2. 신청/결제
                      </div>
                      <div className="text-base font-bold">
                        {funnelCounts[2] || 0}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        신청/결제 화면
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-md p-2">
                      <div className="text-[11px] text-gray-300">3. 결제 진행</div>
                      <div className="text-base font-bold">
                        {funnelCounts[3] || 0}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">결제</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-md p-2">
                      <div className="text-[11px] text-gray-300">4. 완료</div>
                      <div className="text-base font-bold">
                        {funnelCounts[4] || 0}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">완료</div>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white text-xs"
                  onClick={() => {
                    resetClassEnrollment();
                  }}
                >
                  카운터 초기화
                </Button>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <Button
                    size="sm"
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs"
                    onClick={() => {
                      resetFunnelCounts();
                    }}
                  >
                    퍼널 카운터 초기화
                  </Button>
                </div>
                {selectedTimeSlot && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="text-yellow-400 font-semibold">
                      선택된 클래스:
                    </div>
                    <div className="text-white">
                      {selectedTimeSlot.name} - 현재:{" "}
                      {getEffectiveEnrollmentCount(
                        selectedTimeSlot.name,
                        classEnrollment,
                      )}
                      명
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(
          <>
            <div className="contents">
              {/* Class Information Section */}
              <Card className="order-1 w-full mb-6 border-slate-200 bg-slate-50 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-6 text-sm sm:text-[15px] text-gray-700 leading-6 sm:leading-7">
                    {/* Main Title */}
                    <div className="space-y-3">
                      <h3 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-tight text-gray-900">
                        수영, 왜 나는 항상 제자리걸음일까요?
                      </h3>
                      <p className="text-base sm:text-[17px] font-medium text-gray-800 leading-6 sm:leading-7">
                        매일 숨이 차고,
                        <br />
                        어깨가 아픈{" "}
                        <span className="font-bold text-red-600">
                          진짜 이유
                        </span>
                        를 알고 싶으신가요?
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-red-600 leading-tight">
                        단 하루, 당신의 수영 인생이 바뀝니다.
                      </p>

                      {/* 비포/애프터 영상 */}
                      <div className="w-full rounded-xl overflow-hidden shadow-md relative" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          src="https://www.youtube.com/embed/WwNq2mqwM_U?autoplay=1&mute=1&loop=1&playlist=WwNq2mqwM_U&playsinline=1&rel=0"
                          title="스윔잇 특강 전후 비교 영상"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>

                      <p className="text-sm sm:text-[15px] text-gray-700 leading-6 sm:leading-7">
                        믿기 힘드시겠지만,
                        <br />
                        <span className="font-bold text-gray-900">
                          "물과 싸우지 않는 법"
                        </span>
                        을 알면 수영은 놀랍도록 편해집니다.
                      </p>
                    </div>

                    {/* Problem Section */}
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        혹시 이런 경험 있으신가요?
                      </p>
                      <ul className="space-y-2 text-sm sm:text-[15px] list-disc pl-5 marker:text-gray-400 leading-6">
                        <li>
                          남들은 편하게 몇 바퀴씩 도는데
                          <br />
                          나만 25m 가기가 벅차다
                        </li>
                        <li>
                          건강하려고 시작했는데 오히려 어깨와 허리가 쑤신다
                        </li>
                        <li>
                          유튜브를 아무리 봐도
                          <br />
                          내 자세가 뭐가 문제인지 모르겠다
                        </li>
                      </ul>
                      <p className="text-sm sm:text-[15px] font-semibold text-gray-900">
                        문제는 운동신경이 아닙니다.
                      </p>
                      <p className="text-sm sm:text-[15px] text-gray-700 leading-6">
                        물은 공기보다 훨씬 무겁기 때문에{" "}
                        <span className="font-bold text-red-600">
                          힘으로 버티면 더 가라앉을 수 밖에 없습니다.
                        </span>
                      </p>
                      <p className="text-sm sm:text-[15px] font-semibold text-gray-900 leading-6">
                        그래서 수영이 막히는 분들이 가장 빠르게 실력을 올리는 유일한 길은{" "}
                        <span className="font-bold text-red-600">
                          "힘을 빼고 저항을 줄이는 것"
                        </span>
                        입니다.
                      </p>
                    </div>

                    {/* Solution Section */}
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm sm:text-[15px] text-gray-700 leading-6">
                        <span className="font-bold text-gray-900">
                          스윔잇(Swim-It)
                        </span>
                        은 단순한 강습 아닙니다.
                        <br />
                        <span className="font-bold text-red-600">
                          내 수영이 안 되는 이유를
                        </span>
                        <br />
                        <span className="font-bold text-red-600">
                          그 자리 직접 확인 하고
                          <br />
                          교정하고 피드백하는 수업
                        </span>
                        입니다.
                      </p>
                      <p className="text-sm sm:text-[15px] text-gray-700 leading-6">
                        국가대표급 선수와{" "}
                        <span className="font-bold text-gray-900">
                          15년 차 이상 베테랑 강사
                        </span>
                        들이 여러분의 영법을 정밀 진단합니다.
                      </p>
                      <p className="text-sm sm:text-[15px] font-semibold text-gray-900 leading-6">
                        <span className="font-bold text-red-600">
                          "저항을 줄이는 수영"
                        </span>
                        의 메커니즘을 몸에 심어드립니다.
                      </p>
                    </div>

                    {/* Benefits Section */}
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        지금 신청하시면 받는{" "}
                        <span className="text-red-600">스윔잇 올케어 시스템</span>
                      </p>
                      <ol className="space-y-3 text-sm sm:text-[15px] list-decimal pl-5 marker:font-semibold">
                        <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 pr-2">
                          <span className="font-bold text-gray-900">
                            <span className="text-red-600">수업 전</span>｜문제 사전 체크
                          </span>
                          <br />
                          수영 경력, 고민, 불편한 부위를 미리 확인합니다.
                        </li>
                        <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 pr-2">
                          <span className="font-bold text-gray-900">
                            <span className="text-red-600">수업 중</span>｜저항 원인 교정
                          </span>
                          <br />
                          앞으로 안 나가고 힘든 이유를 찾아 바로 교정합니다.
                        </li>
                        <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 pr-2">
                          <span className="font-bold text-gray-900">
                            <span className="text-red-600">수업 후</span>｜수중 영상 1:1 피드백
                          </span>
                          <br />
                          촬영 영상을 바탕으로 이후 연습 방법까지 안내드립니다.
                        </li>
                      </ol>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* CTA Copy Section */}
              <div className="order-4 w-full mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5 shadow-sm">
                <p className="text-base sm:text-lg font-bold text-orange-800 mb-2.5">
                  마감 주의
                </p>
                <p className="text-sm sm:text-[15px] text-gray-900 leading-6">
                  제대로 된 코칭을 위해{" "}
                  <span className="font-bold text-red-600">소수 정예</span>로만
                  진행합니다.
                </p>
                <p className="mt-2 text-sm sm:text-[15px] text-gray-700 leading-6">
                  현재 유튜브 홍보 직후라 실시간으로 자리가 차고 있습니다.
                </p>
                <p className="mt-2.5 text-sm sm:text-[15px] font-bold text-red-600 leading-6">
                  "다음에 해야지"라고 생각하는 순간,
                  <br />
                  가격은 오르고 자리는 없습니다.
                </p>
                <p className="mt-2 text-sm sm:text-[15px] text-gray-900 leading-6">
                  가장 저렴한 가격으로 최고의 코칭을 받을 기회,
                </p>
                <p className="text-sm sm:text-[15px] text-gray-900 leading-6">
                  <span className="font-bold text-red-600">
                    지금 바로 선점하세요.
                  </span>
                </p>
              </div>

              {/* Student Review Section */}
              <section className="order-5 w-full mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="mx-auto max-w-2xl">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    실제 수강생 후기
                  </h3>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div className="overflow-hidden rounded-xl bg-white">
                      <img
                        src={encodeURI("/써먹을 수 있는 후기.gif")}
                        alt="실제 수강생 후기 GIF"
                        className="w-full h-auto object-contain"
                        loading="lazy"
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      <p className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                        단 하루 만에 이렇게 바뀝니다.
                      </p>

                      <div className="space-y-2 text-sm sm:text-[15px] text-gray-800 leading-6">
                        <p className="rounded-lg bg-white px-3 py-2 shadow-sm">“25m도 힘들었는데 50m가 편해졌어요”</p>
                        <p className="rounded-lg bg-white px-3 py-2 shadow-sm">“가라앉는 이유를 처음 알았습니다”</p>
                        <p className="rounded-lg bg-white px-3 py-2 shadow-sm">“힘 빼는 법을 알고 나니까 쭉~ 나아갑니다”</p>
                      </div>

                      <p className="text-sm sm:text-[15px] leading-6 text-gray-700">
                        이건 물과 싸우던 분들이
                        <br />
                        <span className="font-bold text-red-600">
                          ‘저항을 줄이는 방법’
                        </span>
                        을 알았기 때문입니다.
                      </p>

                    </div>
                  </div>
                </div>
              </section>

              {/* Schedule & Region Notice (Step 1) */}
              <section className="order-2 w-full mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    📌 수강 일정 · 지역 안내
                  </h3>
                </div>
                <div className="grid md:grid-cols-[300px_1fr] gap-4 md:gap-6">
                  {/* Left: Calendar */}
                  <div>
                    <Card>
                      <CardContent className="p-4 sm:p-5">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm sm:text-base font-semibold text-primary">
                              📅 수강 일정 달력
                            </h3>
                          </div>
                        </div>

                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (calendarMonth > 1) {
                                setCalendarMonth(calendarMonth - 1);
                              } else {
                                setCalendarMonth(12);
                                setCalendarYear(calendarYear - 1);
                              }
                              console.log(`[달력] 이전 월`);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold">
                            {calendarYear}년 {monthNames[calendarMonth - 1]}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (calendarMonth < 12) {
                                setCalendarMonth(calendarMonth + 1);
                              } else {
                                setCalendarMonth(1);
                                setCalendarYear(calendarYear + 1);
                              }
                              console.log(`[달력] 다음 월`);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {weekDays.map((day, i) => (
                            <div
                              key={day}
                              className={`text-center text-xs font-medium py-1 ${
                                i === 0
                                  ? "text-red-500"
                                  : i === 6
                                    ? "text-blue-500"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((day, index) => {
                            const isHighlighted =
                              day && highlightedDates.includes(day);
                            const dayOfWeek = index % 7;
                            const isToday =
                              day &&
                              calendarYear === today.year &&
                              calendarMonth === today.month &&
                              day === today.day;

                            return (
                              <div
                                key={index}
                                className="aspect-square flex items-center justify-center"
                              >
                                {day ? (
                                  <button
                                    className={`w-full h-full flex items-center justify-center text-sm rounded-lg transition-colors ${
                                      isHighlighted
                                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                        : isToday
                                          ? "bg-gray-300 text-gray-700 font-medium"
                                          : dayOfWeek === 0
                                            ? "text-red-500 hover:bg-muted"
                                            : dayOfWeek === 6
                                              ? "text-blue-500 hover:bg-muted"
                                              : "text-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ) : (
                                  <div />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <span>특강 일정</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-gray-300" />
                            <span>오늘</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: Region Notice */}
                  <div>
                    <div className="mb-3">
                      <h3 className="text-lg sm:text-xl font-bold text-primary">
                        📍 지역 안내
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {getActiveClasses().map((classItem) => {
                        const isSelectedSchedule =
                          selectedClass === String(classItem.id);
                        return (
                          <Card
                            key={classItem.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedClass(String(classItem.id));
                              setSelectedTimeSlot(null);
                              setPaidPageId(null);
                              setOrderNumber("");
                              setRegionError(false);
                              setCalendarMonth(classItem.month);
                              setCalendarYear(classItem.year);
                              console.log("[일정 선택] 랜딩 일정 카드 선택:", {
                                id: classItem.id,
                                location: classItem.location,
                                date: classItem.date,
                              });
                              handleRegistration();
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedClass(String(classItem.id));
                                setSelectedTimeSlot(null);
                                setPaidPageId(null);
                                setOrderNumber("");
                                setRegionError(false);
                                setCalendarMonth(classItem.month);
                                setCalendarYear(classItem.year);
                                handleRegistration();
                              }
                            }}
                            className={`cursor-pointer transition-all shadow-sm ${
                              isSelectedSchedule
                                ? "border-primary border-2 bg-primary/5 shadow-md"
                                : "hover:border-primary/40 hover:shadow-md"
                            }`}
                          >
                          <CardContent className="p-4 sm:p-5">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-blue-500 fill-blue-500/10" />
                                <span className="font-bold text-base sm:text-lg">
                                  {classItem.location}
                                </span>
                              </div>
                              {isSelectedSchedule && (
                                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
                                  선택됨
                                </span>
                              )}
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <span className="font-bold text-base sm:text-lg text-blue-900">
                                  {classItem.date}
                                </span>
                              </div>
                              <p className="ml-7 text-sm sm:text-[15px] font-semibold leading-6 text-blue-700">
                                수영 특강 일정
                              </p>
                              <div className="ml-7 mt-1 space-y-0.5 text-[13px] sm:text-sm font-medium leading-5 text-blue-600">
                                {classItem.scheduleSummaryLines.map((line) => (
                                  <p key={line}>{line}</p>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-start gap-4">
                                <span className="text-sm sm:text-[15px] font-bold text-gray-900 min-w-[45px]">
                                  수영장
                                </span>
                                <span className="text-sm sm:text-[15px] text-gray-600 leading-6">
                                  {classItem.venue}
                                </span>
                              </div>
                              <div className="flex items-start gap-4">
                                <span className="text-sm sm:text-[15px] font-bold text-gray-900 min-w-[45px]">
                                  주소
                                </span>
                                <span className="text-sm sm:text-[15px] text-gray-600 leading-6">
                                  {classItem.address}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span className="text-sm sm:text-[15px] font-bold text-green-600">
                                  예약 가능
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {!showRegistrationForm && (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
                  <p className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    📌 일정 확인하셨다면, 지금 바로 자리 확보하세요
                  </p>
                  <div className="mt-3">
                    <Button
                      onClick={() => {
                        console.log("[CTA] 일정 안내 아래 자리 선점 CTA 클릭");
                        handleScheduleRegistration();
                      }}
                      disabled={!selectedScheduleClass}
                      className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-60"
                      size="lg"
                    >
                      {scheduleApplyButtonText}
                    </Button>
                    {!selectedScheduleClass && (
                      <p className="mt-2 text-center text-xs sm:text-sm text-orange-700">
                        위 일정 카드 중 신청할 특강을 먼저 선택해 주세요.
                      </p>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 text-xs sm:text-sm text-gray-700 leading-5">
                    <p>※ 선착순 마감 / 레인별 7명 제한</p>
                    <p>※ 신청 후 상세 위치 안내됩니다</p>
                  </div>
                </div>
                )}
              </section>

              {/* Action Button (hidden when showRegistrationForm is true) */}
              {/* Warning Section */}
              <Alert className="order-6 w-full mt-6 bg-red-50 border-red-200 shadow-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="ml-2">
                  <h3 className="font-bold text-red-900 mb-2.5 text-base sm:text-lg">
                    ⚠️ 주의사항
                  </h3>
                  <ul className="space-y-2.5 text-sm sm:text-[15px] text-gray-700 leading-6">
                    <li>• 본 특강은 마법이 아닌 '정확한 기술'을 전수합니다.</li>
                    <li>
                      단 한 번으로 국가대표가 될 수는 없지만, 무엇이 문제인지
                      확실히 깨닫고 교정할 수 있는 '방향키'를 쥐여드립니다.
                    </li>
                    <li>
                      • 디테일한 교정을 위해 평소 운동량보다 대기 시간이 있을 수
                      있습니다.
                    </li>
                    <li>• 만 19세 미만은 참여가 제한됩니다.</li>
                  </ul>
                </AlertDescription>
              </Alert>
              {/* Refund Policy Section */}
              <Alert className="order-7 w-full mt-6 bg-yellow-50 border-yellow-200 shadow-sm">
                <HelpCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="ml-2">
                  <h3 className="font-bold text-yellow-900 mb-2 text-base sm:text-lg">
                    💬 특강 관련 문의
                  </h3>
                  <p className="text-sm sm:text-[15px] text-gray-700 mb-3 leading-6">
                    특강에 대해 궁금한 점이 있으신가요? 카카오톡으로 편하게
                    문의해주세요!
                  </p>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                    onClick={() =>
                      window.open("https://pf.kakao.com/_dXUgn/chat", "_blank")
                    }
                  >
                    ☎️ 카카오톡 문의하기
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        {showRegistrationForm && (
          <section
            ref={applicationSectionRef}
            className="order-3 w-full mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm sm:p-6"
          >
            <div className="relative">
              <button
                type="button"
                onClick={handleBackToSchedule}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 shadow hover:bg-white hover:text-gray-900"
                aria-label="신청 영역 닫기"
              >
                <X className="h-5 w-5" />
              </button>

              {selectedScheduleClass && (
                <div className="sticky top-0 z-[1] mb-4 rounded-xl border border-blue-100 bg-white/95 p-4 pr-12 shadow-sm backdrop-blur">
                  <div className="text-xs font-bold text-primary">
                    선택한 일정
                  </div>
                  <div className="mt-1 font-bold text-gray-900">
                    {selectedScheduleClass.location}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-gray-700 sm:grid-cols-2">
                    <div>수영장: {selectedScheduleClass.venue}</div>
                    <div>날짜: {selectedScheduleClass.date}</div>
                    <div>
                      시간: {selectedScheduleClass.scheduleSummaryLines.join(", ")}
                    </div>
                    <div className="sm:col-span-2">
                      주소: {selectedScheduleClass.address}
                    </div>
                  </div>
                </div>
              )}
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {/* Step 1 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step > 1
                      ? "bg-green-500 text-white"
                      : step === 1
                        ? "bg-primary text-white"
                        : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step > 1 ? "✓" : "1"}
                </div>
                <span className="ml-2 text-sm font-medium">일정 선택</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300" />

              {/* Step 2 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step > 3
                      ? "bg-green-500 text-white"
                      : step === 2 || step === 3
                        ? "bg-primary text-white"
                        : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step > 3 ? "✓" : "2"}
                </div>
                <span className="ml-2 text-sm font-medium">신청/결제</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300" />

              {/* Step 3 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 4
                        ? "bg-primary text-white"
                        : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step === 4 ? "✓" : "3"}
                </div>
                <span className="ml-2 text-sm font-medium">완료</span>
              </div>
            </div>

            {step === 2 ? (
              <>
                {/* Step 2: Registration Form */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                    <div className="bg-primary/10 p-2 rounded">
                      <svg
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    개인정보 입력
                  </h1>
                </div>

                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 sm:text-[15px]">
                  <p>선택하신 클래스는 결제 완료 순으로 자리가 확정됩니다.</p>
                  <p>
                    아래에 이름과 연락처를 입력하시면 결제 단계로 이동합니다.
                  </p>
                </div>

                {/* Registration Form */}
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <User className="h-4 w-4" />
                        이름 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="실명을 입력해주세요 (한글만 가능)"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>

                    {/* Phone Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        전화번호 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="010-1234-5678"
                        value={formData.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setFormData({ ...formData, phone: formatted });
                          console.log(
                            `[v0] 전화번호 입력: ${e.target.value} -> ${formatted}`,
                          );
                        }}
                      />
                    </div>

                    {/* Gender Field */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        <User className="h-4 w-4" />
                        성별 <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(value) =>
                          setFormData({ ...formData, gender: value })
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label
                            htmlFor="male"
                            className="font-normal cursor-pointer"
                          >
                            남성
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label
                            htmlFor="female"
                            className="font-normal cursor-pointer"
                          >
                            여성
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Location Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <MapPinned className="h-4 w-4" />
                        거주지역 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="예시: 서울 강남구 / 부산 해운대구"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <Mail className="h-4 w-4" />
                        이메일 (특강/ 수영 제품 할인 정보를 제공합니다)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="예시: swimit@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          console.log("[v0] 이메일 입력:", e.target.value);
                          setFormData({ ...formData, email: e.target.value });
                        }}
                      />
                    </div>

                    {/* Swimming Experience Survey */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        수영을 배우신 지 얼마나 되셨나요?
                      </Label>
                      <RadioGroup
                        value={formData.swimmingExperience}
                        onValueChange={(value) => {
                          console.log("[설문] 수영 경력 선택:", value);
                          setFormData({
                            ...formData,
                            swimmingExperience: value,
                          });
                        }}
                        className="space-y-2"
                      >
                        {["3개월 미만", "6개월~1년", "1년~3년", "3년 이상"].map(
                          (option) => (
                            <div
                              key={option}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={option}
                                id={`exp-${option}`}
                              />
                              <Label
                                htmlFor={`exp-${option}`}
                                className="font-normal cursor-pointer"
                              >
                                {option}
                              </Label>
                            </div>
                          ),
                        )}
                      </RadioGroup>
                    </div>

                    {/* Pain Area Survey */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        수영 후 통증이 느껴지거나 불편한 부위가 있나요? (중복
                        선택 가능)
                      </Label>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {["어깨", "허리", "무릎", "목", "없음"].map((area) => {
                          const checked = formData.painAreas.includes(area);
                          return (
                            <label
                              key={area}
                              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 cursor-pointer hover:border-primary/60"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePainArea(area)}
                              />
                              <span>{area}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Message Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="message"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        이번 특강을 통해 가장 해결하고 싶은 단 하나는
                        무엇인가요?
                      </Label>
                      <Textarea
                        id="message"
                        rows={4}
                        placeholder="예시: 숨쉬기 때문에 자세가 무너지는 문제를 해결하고 싶어요."
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>

                    {/* Required Agreements */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <h4 className="font-semibold">필수 동의 사항</h4>
                      </div>

                      <div className="space-y-4">
                        {/* Agree All */}
                        <div className="flex items-start gap-2 pb-3 border-b border-yellow-200">
                          <Checkbox
                            id="agree-all"
                            checked={agreeAll}
                            onCheckedChange={(checked) =>
                              handleAgreeAll(checked as boolean)
                            }
                            className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                          />
                          <Label
                            htmlFor="agree-all"
                            className="text-sm font-medium cursor-pointer leading-relaxed"
                          >
                            전체 동의
                          </Label>
                        </div>

                        {/* Individual Consents */}
                        <div className="space-y-4">
                          {/* 1. 개인정보 수집 및 이용 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-1"
                                  checked={agree1}
                                  onCheckedChange={(checked) =>
                                    setAgree1(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-1"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  개인정보 수집 및 이용 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowPrivacyModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              수업 관리 목적 외 다른 용도로 사용되지 않으며,
                              개인정보보호법에 따라 안전하게 관리됩니다.
                            </p>
                          </div>

                          {/* 2. 서비스 이용약관 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-2"
                                  checked={agree2}
                                  onCheckedChange={(checked) =>
                                    setAgree2(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-2"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  서비스 이용약관 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowTermsModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              수업 관리 목적 외 서비스 이용약관 필수 가능 약관에
                              동의합니다.
                            </p>
                          </div>

                          {/* 3. 수영 강의 영상촬영 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-7"
                                  checked={agree7}
                                  onCheckedChange={(checked) =>
                                    setAgree7(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-7"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  수영 강의 영상촬영 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowVideoModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              촬영된 영상은 및 교육정보조절로 가능 일정변경도
                              원석되합니다.
                            </p>
                          </div>

                          {/* 4. 수영 활동 안전 및 면책 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-6"
                                  checked={agree6}
                                  onCheckedChange={(checked) =>
                                    setAgree6(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-6"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  수영 활동 안전 및 면책 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowSafetyModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              수영 활동 중 부주의 및 수영 사건을 대한 책임은
                              소지하지 않습니다.
                            </p>
                          </div>

                          {/* 5. 취소 및 환불약관 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-4"
                                  checked={agree4}
                                  onCheckedChange={(checked) =>
                                    setAgree4(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-4"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  취소 및 환불약관 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowRefundModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              환불 규정에 따라 수업 시작 전 취소 시 전액 환불,
                              이후 환불은 약관에 따릅니다.
                            </p>
                          </div>

                          {/* 6. 강의 취소 가능성 안내 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-5"
                                  checked={agree5}
                                  onCheckedChange={(checked) =>
                                    setAgree5(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-5"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  강의 취소 가능성 안내
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowCancellationModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              날씨, 수업장 사정 등에 따라 수업 취소 시 전액 환불
                              및 일정 변경 후 적용됩니다.
                            </p>
                          </div>

                          {/* 7. 강사 자격 기준정 안내 (removed as not in image) */}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleBackToSchedule}
                  >
                    ← 이전
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (!agreeAll) {
                        console.log(
                          "[약관] 전체 동의 미체크 - 다음 단계 이동 차단",
                        );
                        toast({
                          title: "약관 동의 필요",
                          description:
                            "모든 약관에 동의해야 다음으로 진행할 수 있습니다.",
                          variant: "destructive",
                        });
                        return;
                      }
                      // Validate form data and all agreements
                      const isKorean = /^[가-힣]+$/.test(formData.name);
                      const isPhone010 = formData.phone.startsWith("010");

                      if (!isKorean) {
                        console.log(
                          "[v0] 유효성 검사 실패: 이름이 한글이 아님",
                          formData.name,
                        );
                        toast({
                          title: "입력 오류",
                          description: "이름은 한글로만 입력해주세요.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (!isPhone010) {
                        console.log(
                          "[v0] 유효성 검사 실패: 전화번호가 010으로 시작하지 않음",
                          formData.phone,
                        );
                        toast({
                          title: "입력 오류",
                          description: "전화번호는 010으로 시작해야 합니다.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (
                        formData.name &&
                        formData.phone &&
                        formData.gender &&
                        formData.location &&
                        agreeAll
                      ) {
                        // 개인정보 입력 단계: Notion 조회 후 있으면 재사용, 없으면 신규 생성
                        try {
                          setIsSubmitting(true);

                          const notionResult =
                            await findOrCreateApplicant(formData);
                          if (notionResult.success && notionResult.pageId) {
                            setApplicantPageId(notionResult.pageId);
                            if (notionResult.isNew) {
                              console.log(
                                "[개인정보] 신규 저장 성공:",
                                notionResult.pageId,
                              );
                            } else {
                              console.log(
                                "[개인정보] 기존 데이터 재사용:",
                                notionResult.pageId,
                              );
                            }
                            incrementFunnelCount(2, "클래스 신청하기 클릭");
                            markFunnelStep(2);
                            setStep(3);
                          } else {
                            console.error(
                              "[개인정보] 저장 실패:",
                              notionResult.error,
                            );
                            toast({
                              title: "저장 실패",
                              description:
                                notionResult.error ||
                                "개인정보 저장 중 오류가 발생했습니다.",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error("[개인정보] 저장 중 오류 발생:", error);
                          toast({
                            title: "오류 발생",
                            description:
                              "개인정보 저장 중 예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }
                    }}
                    disabled={
                      !formData.name ||
                      !formData.phone ||
                      !formData.location ||
                      !formData.swimmingExperience ||
                      !agreeAll ||
                      isSubmitting
                    }
                  >
                    {isSubmitting ? "저장 중..." : "클래스 신청하기 →"}
                  </Button>
                </div>
              </>
            ) : step === 3 ? (
              <>
                {/* Step 2: Combined Application and Payment */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                    <div className="bg-primary/10 p-2 rounded">
                      <svg
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="16"
                          rx="2"
                          strokeWidth="2"
                        />
                        <path d="M3 10h18" strokeWidth="2" />
                      </svg>
                    </div>
                    신청/결제
                  </h1>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    클래스를 선택하고 정보를 입력한 뒤 결제까지 한 번에 진행합니다.
                  </p>
                </div>

                {/* 클래스 선택 안내 */}
                <details className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer text-base font-bold text-gray-900">
                    📋 어떤 반을 선택해야 할까요?
                    <span className="ml-2 text-xs font-medium text-gray-500">
                      자세히 보기
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      ["🏊", "자유형 A｜숨참·가라앉음 교정반", "자유형 25m 이상 가능 / 숨차고 다리가 가라앉는 분"],
                      ["🏊", "자유형 B｜장거리·효율 완성반", "자유형 50m 가능 / 더 오래, 더 편하게 수영하고 싶은 분"],
                      ["🐸", "평영 A｜제자리 탈출반", "평영 50m 이상 가능 / 차도 앞으로 잘 안 나가는 분"],
                      ["🐸", "평영 B｜추진력·타이밍 완성반", "평영 100m 가능 / 속도와 추진력을 높이고 싶은 분"],
                      ["🦋", "접영 A｜첫 25m 완주반", "접영 동작이 어렵고 25m 완주가 힘든 분"],
                      ["🦋", "접영 B｜50m 리듬 완성반", "접영 50m 가능 / 팔이 무겁고 자세가 무너지는 분"],
                    ].map(([icon, title, description]) => (
                      <div
                        key={title}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="font-bold text-gray-900">
                          {icon} {title}
                        </div>
                        <div className="mt-1 text-gray-600 leading-5">
                          {description}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                <div className="space-y-6">
                  {regionError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 font-bold text-center">
                        지역을 선택해주세요
                      </p>
                    </div>
                  )}
                  <Card className="overflow-hidden border-0 shadow-md">
                    <div className="bg-[#2563EB] text-white px-4 py-4 md:py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-6 w-6 md:h-5 md:w-5" />
                        <h4 className="font-bold text-xl md:text-lg">
                          수영 클래스 시간표
                        </h4>
                      </div>
                      <p className="text-base md:text-sm text-blue-100 ml-8 md:ml-7">
                        시간대별 수업을 확인하고 선택해주세요
                      </p>
                    </div>
                    <CardContent className="p-0">
                      <div className="flex flex-col w-full overflow-x-auto">
                        {/* 레인 헤더 (PC/태블릿에서만 표시) */}
                        {activeTimetable.length > 0 && (() => {
                          const laneCount = activeTimetable[0].lanes.length;
                          const colClass = laneCount === 6 ? "grid-cols-6" : laneCount === 4 ? "grid-cols-4" : "grid-cols-5";
                          return (
                            <div className="hidden md:flex border-b">
                              <div className="w-[180px] bg-[#F8FAFC] border-r border-gray-100 shrink-0" />
                              <div className={`flex-1 bg-white grid ${colClass} gap-3 p-3`}>
                                {activeTimetable[0].lanes.map((l) => (
                                  <div
                                    key={l.lane}
                                    className="text-sm font-bold text-gray-700 text-center py-1 rounded bg-gray-50 border border-gray-100"
                                  >
                                    {l.lane}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {activeTimetable.length === 0 ? (
                          <div className="p-8 text-center text-sm text-gray-600 bg-white">
                            위에서 특강 지역을 먼저 선택하면 해당 일정의 시간표가
                            표시됩니다.
                          </div>
                        ) : (
                          activeTimetable.map((row) => (
                          <div
                            key={`${selectedClassIdNum}-${row.session}-${row.time}`}
                            className="flex flex-col sm:flex-row border-b last:border-b-0"
                          >
                            {/* Time Label */}
                            <div className="flex flex-row sm:flex-col justify-center sm:justify-center items-center sm:items-start px-4 sm:px-6 py-4 sm:py-6 bg-[#F8FAFC] w-full sm:w-[180px] sm:border-r border-gray-100 shrink-0">
                              <div className="text-lg md:text-base font-bold text-gray-900 mr-2 sm:mr-0">
                                {row.session}
                              </div>
                              <div className="text-base md:text-sm text-gray-500 sm:mt-1">
                                {row.time}
                              </div>
                            </div>
                            {/* Class Grid */}
                            <div className="flex-1 p-3 sm:p-3 bg-white">
                              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 ${row.lanes.length === 6 ? "md:grid-cols-6" : row.lanes.length === 4 ? "md:grid-cols-4" : "md:grid-cols-5"}`}>
                                {row.lanes.map((slot, index) => {
                                if (slot.closed) {
                                  return (
                                    <div
                                      key={`${row.session}-closed-${slot.lane}`}
                                      className="relative border border-dashed rounded-lg p-3 sm:p-4 flex flex-col justify-center min-h-[96px] sm:min-h-[110px] bg-slate-50/80 border-slate-200"
                                    >
                                      <div className="md:hidden mb-1">
                                        <span className="inline-flex items-center justify-center text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                          {slot.lane}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-400 text-center font-medium">
                                        운영 없음
                                      </p>
                                    </div>
                                  );
                                }
                                const classKey = makeClassKey(
                                  selectedClassIdNum,
                                  row.session,
                                  slot.lane,
                                  slot.title,
                                );
                                const isFull = isClassFull(classKey);
                                const hasPayment = hasEnrollment(classKey);
                                return (
                                  <button
                                    key={`${row.session}-${index}`}
                                    onClick={() => {
                                      const regionInfo = classes.find(
                                        (c) => String(c.id) === selectedClass,
                                      );
                                      console.log("[선택] 클래스 선택:", {
                                        className: classKey,
                                        session: row.session,
                                        time: row.time,
                                        region:
                                          regionInfo?.location || "정보 없음",
                                        regionCode:
                                          regionInfo?.locationCode || "",
                                      });
                                      setSelectedTimeSlot({
                                        name: classKey,
                                        session: row.session,
                                        lane: slot.lane,
                                        title: slot.title,
                                        time: row.time,
                                        price: slot.price,
                                        isWaitlist: isFull,
                                        available: !isFull,
                                      });
                                      setStep(3); // 바로 결제 화면으로 이동
                                    }}
                                    className={`relative border rounded-lg p-3 sm:p-4 flex flex-col justify-between min-h-[96px] sm:min-h-[110px] transition-all ${
                                      selectedTimeSlot?.name === classKey &&
                                      selectedTimeSlot?.session === row.session
                                        ? "border-primary border-2 ring-2 ring-primary/10 bg-primary/5"
                                        : slot.premium
                                          ? "border-amber-400 border-2 bg-amber-50/60 hover:border-amber-500 hover:shadow-md"
                                          : "border-gray-200 hover:border-primary/50 hover:shadow-sm bg-white"
                                    }`}
                                  >
                                    {/* 프리미엄 배지 */}
                                    {slot.premium && (
                                      <div className="absolute -top-3 left-2">
                                        <span className="inline-flex items-center gap-1 bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                          ✨ 프리미엄
                                        </span>
                                      </div>
                                    )}

                                    {/* 모바일: 레인 표시를 카드 안으로 (상단 헤더가 좁아서) */}
                                    <div className={`md:hidden ${slot.premium ? "mt-2" : ""} mb-1`}>
                                      <span className="inline-flex items-center justify-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                                        {slot.lane}
                                      </span>
                                    </div>

                                    <div className="text-base md:text-sm font-bold text-gray-900 break-words leading-snug">
                                      {(() => {
                                        const { label, description } =
                                          getClassDisplayParts(slot.title);
                                        return (
                                          <>
                                            <span className="block">{label}</span>
                                            {description && (
                                              <span className="block text-sm md:text-xs text-gray-700">
                                                {description}
                                              </span>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                    {slot.premium && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        <span className="inline-block bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded">
                                          지상 1h + 수중 1h
                                        </span>
                                        <span className="inline-block bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded">
                                          레인 당 4명 코칭
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2 mt-2 sm:mt-2 flex-wrap">
                                      {(() => {
                                        const laneBadge: Record<
                                          string,
                                          string
                                        > = {
                                          "1레인": "1자리 남음",
                                          "2레인": "마감임박",
                                          "3레인": "2자리 남음",
                                          "4레인": "마감임박",
                                          "5레인": "1자리 남음",
                                        };
                                        const label =
                                          isFull || hasPayment
                                            ? "마감"
                                            : (laneBadge[slot.lane] ??
                                              "마감임박");
                                        if (!label) return null;
                                        return (
                                          <span className="bg-white border border-red-200 text-red-600 text-sm md:text-[11px] px-3 md:px-2 py-1.5 md:py-1 rounded font-bold">
                                            {label}
                                          </span>
                                        );
                                      })()}
                                      {isFull || hasPayment ? (
                                        <span className="bg-orange-500 text-white text-sm md:text-[11px] px-3 md:px-2 py-1.5 md:py-1 rounded font-bold">
                                          예약대기
                                        </span>
                                      ) : (
                                        <span className="bg-[#10B981] text-white text-sm md:text-[11px] px-3 md:px-2 py-1.5 md:py-1 rounded font-bold">
                                          결제가능
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                                })}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                ※ 최소 인원 미달 시 일부 클래스는 통합반으로 운영될 수 있습니다.
                              </p>
                            </div>
                          </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">신청자 정보 입력</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="combined-name"
                            className="text-sm font-semibold flex items-center gap-1"
                          >
                            <User className="h-4 w-4" />
                            이름 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="combined-name"
                            placeholder="실명을 입력해주세요 (한글만 가능)"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="combined-phone"
                            className="text-sm font-semibold flex items-center gap-1"
                          >
                            <Phone className="h-4 w-4" />
                            전화번호 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="combined-phone"
                            placeholder="010-1234-5678"
                            value={formData.phone}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value);
                              setFormData({ ...formData, phone: formatted });
                              console.log(
                                `[신청/결제] 전화번호 입력: ${e.target.value} -> ${formatted}`,
                              );
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold flex items-center gap-1">
                            <User className="h-4 w-4" />
                            성별 <span className="text-red-500">*</span>
                          </Label>
                          <RadioGroup
                            value={formData.gender}
                            onValueChange={(value) =>
                              setFormData({ ...formData, gender: value })
                            }
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="male" id="combined-male" />
                              <Label
                                htmlFor="combined-male"
                                className="font-normal cursor-pointer"
                              >
                                남성
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="female" id="combined-female" />
                              <Label
                                htmlFor="combined-female"
                                className="font-normal cursor-pointer"
                              >
                                여성
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="combined-location"
                            className="text-sm font-semibold flex items-center gap-1"
                          >
                            <MapPinned className="h-4 w-4" />
                            거주지역 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="combined-location"
                            placeholder="예시: 서울 강남구 / 부산 해운대구"
                            value={formData.location}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                location: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="combined-email"
                          className="text-sm font-semibold flex items-center gap-1"
                        >
                          <Mail className="h-4 w-4" />
                          이메일 (특강/ 수영 제품 할인 정보를 제공합니다)
                        </Label>
                        <Input
                          id="combined-email"
                          type="email"
                          placeholder="예시: swimit@example.com"
                          value={formData.email}
                          onChange={(e) => {
                            console.log("[신청/결제] 이메일 입력:", e.target.value);
                            setFormData({ ...formData, email: e.target.value });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-1">
                          수영을 배우신 지 얼마나 되셨나요?
                        </Label>
                        <RadioGroup
                          value={formData.swimmingExperience}
                          onValueChange={(value) => {
                            console.log("[신청/결제] 수영 경력 선택:", value);
                            setFormData({
                              ...formData,
                              swimmingExperience: value,
                            });
                          }}
                          className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2"
                        >
                          {["3개월 미만", "6개월~1년", "1년~3년", "3년 이상"].map(
                            (option) => (
                              <div
                                key={option}
                                className="flex items-center space-x-2 rounded-md border border-gray-200 px-3 py-2"
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`combined-exp-${option}`}
                                />
                                <Label
                                  htmlFor={`combined-exp-${option}`}
                                  className="font-normal cursor-pointer"
                                >
                                  {option}
                                </Label>
                              </div>
                            ),
                          )}
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-1">
                          수영 후 통증이 느껴지거나 불편한 부위가 있나요? (중복
                          선택 가능)
                        </Label>
                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                          {["어깨", "허리", "무릎", "목", "없음"].map((area) => {
                            const checked = formData.painAreas.includes(area);
                            return (
                              <label
                                key={area}
                                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 cursor-pointer hover:border-primary/60"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => togglePainArea(area)}
                                />
                                <span>{area}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="combined-message"
                          className="text-sm font-semibold flex items-center gap-1"
                        >
                          <MessageSquare className="h-4 w-4" />
                          이번 특강에서 해결하고 싶은 점
                        </Label>
                        <Textarea
                          id="combined-message"
                          rows={3}
                          placeholder="예시: 숨쉬기 때문에 자세가 무너지는 문제를 해결하고 싶어요."
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              message: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <h4 className="font-semibold">약관/환불 규정 동의</h4>
                        </div>

                        <div className="flex items-start gap-2 pb-3 border-b border-yellow-200">
                          <Checkbox
                            id="combined-agree-all"
                            checked={agreeAll}
                            onCheckedChange={(checked) =>
                              handleAgreeAll(checked as boolean)
                            }
                            className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                          />
                          <Label
                            htmlFor="combined-agree-all"
                            className="text-sm font-medium cursor-pointer leading-relaxed"
                          >
                            전체 동의
                          </Label>
                        </div>

                        <div className="space-y-3 text-sm">
                          {[
                            ["agree-1", agree1, setAgree1, "개인정보 수집 및 이용 동의", () => setShowPrivacyModal(true)],
                            ["agree-2", agree2, setAgree2, "서비스 이용약관 동의", () => setShowTermsModal(true)],
                            ["agree-7", agree7, setAgree7, "수영 강의 영상촬영 동의", () => setShowVideoModal(true)],
                            ["agree-6", agree6, setAgree6, "수영 활동 안전 및 면책 동의", () => setShowSafetyModal(true)],
                            ["agree-4", agree4, setAgree4, "취소 및 환불약관 동의", () => setShowRefundModal(true)],
                            ["agree-5", agree5, setAgree5, "강의 취소 가능성 안내", () => setShowCancellationModal(true)],
                          ].map(([id, checked, setter, label, openModal]) => (
                            <div
                              key={String(id)}
                              className="flex items-start justify-between gap-3"
                            >
                              <div className="flex flex-1 items-start gap-2">
                                <Checkbox
                                  id={`combined-${id}`}
                                  checked={checked as boolean}
                                  onCheckedChange={(nextChecked) =>
                                    (setter as (value: boolean) => void)(
                                      nextChecked as boolean,
                                    )
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor={`combined-${id}`}
                                  className="cursor-pointer leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  {label as string}
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={openModal as () => void}
                              >
                                보기
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Header */}
                  <div className="text-center py-6 border-t">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="text-2xl">💳</span>
                      <h2 className="text-2xl font-bold">결제 금액 확인</h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      신청 정보를 저장한 뒤 결제를 진행합니다
                    </p>
                  </div>

                  <div className="flex justify-center">
                    {/* Order Summary - Centered and Wide */}
                    <div className="space-y-6 w-full max-w-2xl">
                      {/* Order Summary */}
                      <div>
                        <h3 className="text-lg font-bold mb-4">주문 요약</h3>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span className="text-gray-700">
                              {classes.find(
                                (c) => String(c.id) === selectedClass,
                              )?.location || "정보 없음"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">
                              {selectedTimeSlot?.time.split("(")[0] ||
                                "날짜 정보 없음"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">어른</span>
                          </div>
                        </div>
                      </div>

                      {/* Selected Class */}
                      <div>
                        <h3 className="text-lg font-bold mb-3">
                          선택된 클래스
                        </h3>
                        <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                          {selectedTimeSlot ? (
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-1">
                                {getClassDisplayName(selectedTimeSlot.name)}
                              </p>
                              <p className="text-xs text-gray-500">
                                시간대: {selectedTimeSlot.session} (
                                {selectedTimeSlot.time})
                              </p>
                              <p className="text-xs text-gray-500">
                                지역:{" "}
                                {classes.find(
                                  (c) => String(c.id) === selectedClass,
                                )?.location || "정보 없음"}
                              </p>
                              {selectedTimeSlot.isWaitlist && (
                                <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                  대기신청
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-sm text-gray-500 mb-1">
                                아직 클래스를 선택하지 않았습니다
                              </p>
                              <p className="text-xs text-gray-400">
                                위 시간표에서 클래스를 선택해주세요
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold">총 결제 금액</h3>
                          <span className="text-2xl font-bold text-primary">
                            ₩{(selectedTimeSlot?.price ?? 0).toLocaleString()}
                          </span>
                        </div>

                        {selectedTimeSlot &&
                          !selectedTimeSlot.isWaitlist &&
                          selectedTimeSlot.available && (
                            <div className="mb-3 space-y-1">
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>원가</span>
                                <span className="line-through">₩200,000</span>
                              </div>
                              <div className="flex justify-between text-sm text-red-600 font-semibold">
                                <span>할인</span>
                                <span>-₩{(200000 - (selectedTimeSlot?.price ?? 80000)).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  {regionError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-600 font-bold text-center">
                        지역을 선택해주세요
                      </p>
                    </div>
                  )}
                  <div className="space-y-3 pt-4">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                      <p>스윔잇 특강은 결제 완료 순으로 자리가 확정됩니다.</p>
                      <p>결제 전까지는 예약이 확정되지 않습니다.</p>
                    </div>
                    <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="px-8 border-gray-300 text-gray-700 bg-transparent"
                      onClick={handleBackToSchedule}
                    >
                      ← 이전
                    </Button>
                    <Button
                      className={`flex-1 text-white ${
                        selectedTimeSlot &&
                        (isClassFull(selectedTimeSlot.name) ||
                          hasEnrollment(selectedTimeSlot.name))
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "bg-[#10B981] hover:bg-[#059669]"
                      }`}
                      disabled={
                        !selectedTimeSlot ||
                        !formData.name ||
                        !formData.phone ||
                        !formData.location ||
                        !formData.swimmingExperience ||
                        !agreeAll ||
                        isSubmitting
                      }
                      onClick={async () => {
                        // 중복 클릭 방지: 이미 처리 중이면 리턴
                        if (isSubmitting) {
                          console.log(
                            "[결제] 이미 처리 중입니다. 중복 클릭 방지",
                          );
                          return;
                        }

                        if (!validateApplicationForPayment()) {
                          return;
                        }

                        // 지역 선택 검증
                        if (!selectedClass) {
                          setRegionError(true);
                          return;
                        }
                        setRegionError(false);

                        incrementFunnelCount(3, "결제하기 버튼 클릭");
                        markFunnelStep(3);

                        // 결제 처리 시작 - 버튼 비활성화
                        setIsSubmitting(true);
                        console.log("[결제] 결제 처리 시작 - 버튼 비활성화");

                        if (selectedTimeSlot) {
                          const paymentStartedAt = new Date();
                          setPaymentDate(paymentStartedAt);

                          // 같은 클래스 중복 신청 방지 (옵션1: 결제대기/예약대기만 차단)
                          const duplicateCheck =
                            await checkDuplicateForSameClass({
                              name: formData.name,
                              phone: formData.phone,
                              selectedClass: selectedTimeSlot.name,
                            });
                          if (
                            duplicateCheck.success &&
                            duplicateCheck.hasDuplicate
                          ) {
                            console.log(
                              "[중복방지] 동일 클래스 중복(결제대기/예약대기) 차단:",
                              {
                                className: selectedTimeSlot.name,
                                statuses: duplicateCheck.matchedStatuses,
                              },
                            );
                            toast({
                              title: "중복 신청 방지",
                              description: `같은 성함/연락처로 이미 ${getClassDisplayName(selectedTimeSlot.name)}를 신청하셨습니다. 다른 클래스는 신청 가능합니다.`,
                              variant: "destructive",
                            });
                            setIsSubmitting(false);
                            return;
                          }

                          const applicantKey = getApplicantKey(
                            selectedTimeSlot.name,
                          );
                          if (
                            applicantKey &&
                            submittedApplicantsRef.current.has(applicantKey)
                          ) {
                            console.log(
                              "[중복방지] 동일 클래스 중복 결제 시도 차단:",
                              applicantKey,
                            );
                            toast({
                              title: "중복 신청 방지",
                              description: `같은 정보로 이미 ${getClassDisplayName(selectedTimeSlot.name)}를 신청하셨습니다. 다른 클래스는 신청 가능합니다.`,
                              variant: "destructive",
                            });
                            setIsSubmitting(false);
                            return;
                          }
                          const isFull = isClassFull(selectedTimeSlot.name);
                          const hasPayment = hasEnrollment(
                            selectedTimeSlot.name,
                          );
                          const currentEnrollment =
                            getEffectiveEnrollmentCount(
                              selectedTimeSlot.name,
                              classEnrollment,
                            );
                          console.log(
                            `[결제] 클래스: ${selectedTimeSlot.name}, 현재 인원: ${currentEnrollment}, 다음 클릭 시: ${currentEnrollment + 1}번째`,
                          );

                          if (isFull || hasPayment) {
                            // 예약대기 모드 (11번째 클릭) - 예약하기 동작 (결제 프로세스 진행)
                            console.log(
                              `[예약대기] 예약대기 모드로 전환 - ${selectedTimeSlot.name} 클래스의 ${currentEnrollment + 1}번째 신청자`,
                            );
                            console.log(
                              `[예약대기] 예약 처리 시작 - 중복 클릭 방지 활성화`,
                            );

                            try {
                              // 노션 페이지가 없으면 개인정보 저장
                              let pageId = paidPageId;
                              if (!pageId) {
                                const notionResult =
                                  await submitPaidToNotion(formData);
                                if (
                                  !notionResult.success ||
                                  !notionResult.pageId
                                ) {
                                  setIsSubmitting(false);
                                  console.error(
                                    "[예약대기] Notion 저장 실패:",
                                    notionResult.error,
                                  );
                                  toast({
                                    title: "저장 실패",
                                    description:
                                      notionResult.error ||
                                      "데이터 저장 중 오류가 발생했습니다.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                pageId = notionResult.pageId;
                                setPaidPageId(pageId);
                              }
                              if (pageId) {
                                const newOrderNumber = generateOrderNumber();
                                setOrderNumber(newOrderNumber); // 주문번호 저장
                                setPaymentStatus("예약대기"); // 예약대기 상태 설정
                                const selectedClassInfo = classes.find(
                                  (c) => String(c.id) === selectedClass,
                                );
                                const selectedRegion =
                                  selectedClassInfo?.location || "정보 없음";
                                const classDate = selectedClassInfo
                                  ? formatSheetClassDate(
                                      calendarYear,
                                      selectedClassInfo.month,
                                      selectedClassInfo.dateNum,
                                    )
                                  : "";
                                console.log(
                                  "[예약대기] 지역 정보 저장:",
                                  selectedRegion,
                                );

                                // Notion 결제 정보 업데이트
                                await updatePaymentInNotion({
                                  pageId,
                                  // 노션 표의 '가상계좌 입금 정보' 컬럼에는 상태 값만 저장 (예: 예약대기)
                                  virtualAccountInfo: "예약대기",
                                  orderNumber: newOrderNumber,
                                  selectedClass: selectedTimeSlot.name,
                                  timeSlot: `${selectedTimeSlot.session} (${selectedTimeSlot.time})`,
                                  region: selectedRegion,
                                  paymentStartedAt:
                                    paymentStartedAt.toISOString(),
                                });

                                try {
                                  console.log(
                                    "[구글시트] 예약대기 행 추가 시작:",
                                    newOrderNumber,
                                  );
                                  const sheetResponse = await fetch(
                                    "/api/sheets/append",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        접수일시:
                                          formatSheetTimestamp(paymentStartedAt),
                                        신청번호: newOrderNumber,
                                        이름: formData.name,
                                        전화번호:
                                          "'" +
                                          formData.phone.replace(/-/g, ""),
                                        이메일: formData.email || "",
                                        성별:
                                          formData.gender === "male"
                                            ? "남성"
                                            : "여성",
                                        거주지역: formData.location,
                                        수영경력:
                                          formData.swimmingExperience || "",
                                        통증부위: formData.painAreas.join(", "),
                                        해결문제: formData.message || "",
                                        클래스: selectedTimeSlot.title,
                                        회차: formatSheetSession(
                                          selectedTimeSlot.session,
                                        ),
                                        레인: selectedTimeSlot.lane,
                                        날짜: classDate,
                                        특강지역: selectedRegion,
                                        예약상태: "예약대기",
                                      }),
                                    },
                                  );

                                  const sheetResult = await sheetResponse
                                    .json()
                                    .catch(() => null);

                                  if (!sheetResponse.ok || !sheetResult?.success) {
                                    console.error(
                                      "[구글시트] 예약대기 행 추가 실패:",
                                      sheetResult?.error || sheetResponse.status,
                                    );
                                    toast({
                                      title: "구글 시트 저장 실패",
                                      description:
                                        "신청은 완료됐지만 시트 연동에 실패했습니다. 고객센터(@스윔잇)로 연락해 주세요.",
                                      variant: "destructive",
                                    });
                                  } else {
                                    console.log(
                                      "[구글시트] 예약대기 행 추가 완료:",
                                      newOrderNumber,
                                    );
                                  }
                                } catch (sheetError) {
                                  console.error(
                                    "[구글시트] 예약대기 행 추가 중 예외:",
                                    sheetError,
                                  );
                                  toast({
                                    title: "구글 시트 저장 오류",
                                    description:
                                      "신청은 완료됐지만 시트 연동 중 오류가 발생했습니다.",
                                    variant: "destructive",
                                  });
                                }

                                // 신청 인원 증가
                                setClassEnrollment((prev) => {
                                  const next = {
                                    ...prev,
                                    [selectedTimeSlot.name]:
                                      (prev[selectedTimeSlot.name] || 0) + 1,
                                  };
                                  try {
                                    localStorage.setItem(
                                      "class_enrollment_counts",
                                      JSON.stringify(next),
                                    );
                                  } catch (error) {
                                    console.log(
                                      "[카운터] 로컬 저장 실패:",
                                      error,
                                    );
                                  }
                                  return next;
                                });
                                if (applicantKey) {
                                  submittedApplicantsRef.current.add(
                                    applicantKey,
                                  );
                                  console.log(
                                    "[중복방지] 신청자 정보 저장:",
                                    applicantKey,
                                  );
                                }
                                if (hasFunnelStep(3)) {
                                  incrementFunnelCount(
                                    4,
                                    "예약완료/가상계좌 발급",
                                  );
                                  markFunnelStep(4);
                                } else {
                                  console.log(
                                    "[퍼널] 3단계 미기록 - 4단계 카운트 건너뜀",
                                  );
                                }
                                console.log(
                                  "[예약대기] 예약 처리 완료 - 4단계로 이동",
                                );
                                setStep(4);
                              }
                            } catch (error) {
                              setIsSubmitting(false); // 에러 발생 시 버튼 다시 활성화
                              console.error(
                                "[예약대기] 예약 처리 중 오류 발생:",
                                error,
                              );
                              toast({
                                title: "오류 발생",
                                description:
                                  "예약 처리 중 예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
                                variant: "destructive",
                              });
                            }
                          } else {
                            // 결제하기 모드
                            console.log(
                              `[결제] 일반 결제 모드 - ${selectedTimeSlot.name} 클래스의 ${currentEnrollment + 1}번째 신청자`,
                            );
                            console.log(
                              `[결제] 결제 처리 시작 - 중복 클릭 방지 활성화`,
                            );

                            try {
                              // 노션 페이지가 없으면 개인정보 저장
                              let pageId = paidPageId;
                              if (!pageId) {
                                const notionResult =
                                  await submitPaidToNotion(formData);
                                if (
                                  !notionResult.success ||
                                  !notionResult.pageId
                                ) {
                                  setIsSubmitting(false);
                                  console.error(
                                    "[결제] Notion 저장 실패:",
                                    notionResult.error,
                                  );
                                  toast({
                                    title: "저장 실패",
                                    description:
                                      notionResult.error ||
                                      "데이터 저장 중 오류가 발생했습니다.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                pageId = notionResult.pageId;
                                setPaidPageId(pageId);
                              }
                              if (pageId) {
                                const newOrderNumber = generateOrderNumber();
                                setOrderNumber(newOrderNumber); // 주문번호 저장
                                setPaymentStatus("결제대기"); // 결제 전 이탈 고객 회수용 상태
                                const selectedClassInfo = classes.find(
                                  (c) => String(c.id) === selectedClass,
                                );
                                const selectedRegion =
                                  selectedClassInfo?.location || "정보 없음";
                                const classDate = selectedClassInfo
                                  ? formatSheetClassDate(
                                      calendarYear,
                                      selectedClassInfo.month,
                                      selectedClassInfo.dateNum,
                                    )
                                  : "";
                                console.log(
                                  "[결제] 지역 정보 저장:",
                                  selectedRegion,
                                );

                                // Notion 결제 정보 업데이트
                                await updatePaymentInNotion({
                                  pageId,
                                  // 노션 표의 '가상계좌 입금 정보' 컬럼에는 상태 값만 저장 (예: 결제대기)
                                  virtualAccountInfo: "결제대기",
                                  orderNumber: newOrderNumber,
                                  selectedClass: selectedTimeSlot.name,
                                  timeSlot: `${selectedTimeSlot.session} (${selectedTimeSlot.time})`,
                                  region: selectedRegion,
                                  paymentStartedAt:
                                    paymentStartedAt.toISOString(),
                                });

                                try {
                                  console.log(
                                    "[구글시트] 결제대기 행 추가 시작:",
                                    newOrderNumber,
                                  );
                                  const sheetResponse = await fetch(
                                    "/api/sheets/append",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        접수일시:
                                          formatSheetTimestamp(paymentStartedAt),
                                        신청번호: newOrderNumber,
                                        이름: formData.name,
                                        전화번호:
                                          "'" +
                                          formData.phone.replace(/-/g, ""),
                                        이메일: formData.email || "",
                                        성별:
                                          formData.gender === "male"
                                            ? "남성"
                                            : "여성",
                                        거주지역: formData.location,
                                        수영경력:
                                          formData.swimmingExperience || "",
                                        통증부위: formData.painAreas.join(", "),
                                        해결문제: formData.message || "",
                                        클래스: selectedTimeSlot.title,
                                        회차: formatSheetSession(
                                          selectedTimeSlot.session,
                                        ),
                                        레인: selectedTimeSlot.lane,
                                        날짜: classDate,
                                        특강지역: selectedRegion,
                                        예약상태: "결제대기",
                                      }),
                                    },
                                  );

                                  const sheetResult = await sheetResponse
                                    .json()
                                    .catch(() => null);

                                  if (!sheetResponse.ok || !sheetResult?.success) {
                                    console.error(
                                      "[구글시트] 결제대기 행 추가 실패:",
                                      sheetResult?.error || sheetResponse.status,
                                    );
                                    toast({
                                      title: "구글 시트 저장 실패",
                                      description:
                                        "신청은 완료됐지만 시트 연동에 실패했습니다. 고객센터(@스윔잇)로 연락해 주세요.",
                                      variant: "destructive",
                                    });
                                  } else {
                                    console.log(
                                      "[구글시트] 결제대기 행 추가 완료:",
                                      newOrderNumber,
                                    );
                                  }
                                } catch (sheetError) {
                                  console.error(
                                    "[구글시트] 결제대기 행 추가 중 예외:",
                                    sheetError,
                                  );
                                  toast({
                                    title: "구글 시트 저장 오류",
                                    description:
                                      "신청은 완료됐지만 시트 연동 중 오류가 발생했습니다.",
                                    variant: "destructive",
                                  });
                                }

                                // 알리고 알림톡 자동 발송
                                console.log("[알림톡] 자동 발송 시작");
                                try {
                                  const alimtalkResponse = await fetch(
                                    "/api/nhn/send-alimtalk",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        customerName: formData.name,
                                        customerPhone: formData.phone,
                                        className: selectedTimeSlot.name,
                                        pageId,
                                      }),
                                    },
                                  );

                                  const alimtalkResult =
                                    await alimtalkResponse.json();

                                  if (alimtalkResult.success) {
                                    console.log(
                                      "[알림톡] 발송 성공:",
                                      formData.name,
                                    );
                                  } else {
                                    console.error(
                                      "[알림톡] 발송 실패:",
                                      alimtalkResult.error,
                                    );
                                  }

                                  if (alimtalkResult?.notionLog?.attempted) {
                                    if (alimtalkResult.notionLog.success) {
                                      console.log("[알림톡] Notion 기록 성공");
                                    } else {
                                      console.error(
                                        "[알림톡] Notion 기록 실패:",
                                        alimtalkResult.notionLog.error,
                                      );
                                      toast({
                                        title: "노션 표시 실패",
                                        description:
                                          "알림톡은 처리됐지만 노션에 체크/시간 기록을 저장하지 못했습니다. 노션 컬럼명/타입(알림톡 발송, 발송 시간, 발송 실패 사유, SMS 대체 발송)을 확인해주세요.",
                                        variant: "destructive",
                                      });
                                    }
                                  } else {
                                    console.log(
                                      "[알림톡] Notion 기록 미시도(pageId 없음)",
                                    );
                                  }
                                } catch (alimtalkError) {
                                  // 알림톡 실패해도 결제는 계속 진행
                                  console.error(
                                    "[알림톡] 발송 중 오류:",
                                    alimtalkError,
                                  );
                                }

                                // 신청 인원 증가
                                setClassEnrollment((prev) => {
                                  const next = {
                                    ...prev,
                                    [selectedTimeSlot.name]:
                                      (prev[selectedTimeSlot.name] || 0) + 1,
                                  };
                                  try {
                                    localStorage.setItem(
                                      "class_enrollment_counts",
                                      JSON.stringify(next),
                                    );
                                  } catch (error) {
                                    console.log(
                                      "[카운터] 로컬 저장 실패:",
                                      error,
                                    );
                                  }
                                  return next;
                                });
                                if (applicantKey) {
                                  submittedApplicantsRef.current.add(
                                    applicantKey,
                                  );
                                  console.log(
                                    "[중복방지] 신청자 정보 저장:",
                                    applicantKey,
                                  );
                                }
                                if (hasFunnelStep(3)) {
                                  incrementFunnelCount(4, "가상계좌 발급");
                                  markFunnelStep(4);
                                } else {
                                  console.log(
                                    "[퍼널] 3단계 미기록 - 4단계 카운트 건너뜀",
                                  );
                                }
                                console.log(
                                  "[결제] 결제 처리 완료 - 4단계로 이동",
                                );
                                console.log(
                                  "[입금안내] 가상계좌 발급 완료 모달 열기:",
                                  {
                                    orderNumber: newOrderNumber,
                                    status: "결제대기",
                                    account: DEPOSIT_ACCOUNT_LABEL,
                                  },
                                );
                                setShowDepositModal(true);
                                setStep(4);
                              }
                            } catch (error) {
                              setIsSubmitting(false); // 에러 발생 시 버튼 다시 활성화
                              console.error(
                                "[결제] 결제 처리 중 오류 발생:",
                                error,
                              );
                              toast({
                                title: "오류 발생",
                                description:
                                  "결제 처리 중 예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
                                variant: "destructive",
                              });
                            }
                          }
                        }
                      }}
                    >
                      {isSubmitting
                        ? "처리 중..."
                        : selectedTimeSlot &&
                            (isClassFull(selectedTimeSlot.name) ||
                              hasEnrollment(selectedTimeSlot.name))
                          ? "예약하기"
                          : `₩${(selectedTimeSlot?.price ?? 0).toLocaleString()} 결제하고 자리 확정하기`}
                    </Button>
                    </div>
                    {showPgTest && selectedTimeSlot && (
                      <div
                        className="rounded-xl border-2 p-4 sm:p-5 space-y-4 shadow-sm"
                        style={{
                          backgroundColor: "#FEF2F2",
                          borderColor: "#EF4444",
                        }}
                        role="alert"
                        aria-label="PG 심사용 테스트 안내"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <AlertTriangle
                            className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-red-600 mt-0.5"
                            aria-hidden
                          />
                          <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                            <p className="text-base sm:text-lg font-extrabold text-red-800 leading-snug">
                              ⚠️ 실제 결제 버튼이 아닙니다
                            </p>
                            <p className="text-sm sm:text-[15px] text-red-900/90 leading-relaxed">
                              아래 버튼은 PG·카드사 심사를 위한 테스트 결제
                              버튼입니다.
                              <br />
                              실제 특강 신청, 예약 확정, 결제 진행이 되지
                              않습니다.
                              <br />
                              <span className="font-semibold text-red-800">
                                고객님은 누르지 않으셔도 됩니다.
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                          {["심사용", "테스트 전용", "실제 결제 불가"].map(
                            (label) => (
                              <span
                                key={label}
                                className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white"
                              >
                                {label}
                              </span>
                            ),
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isClassPgTestLoading}
                          onClick={() => void handleClassPgTestPayment()}
                          className="w-full rounded-lg border border-gray-300 bg-gray-200 py-3 px-3 text-center cursor-not-allowed hover:bg-gray-200 hover:opacity-100 disabled:opacity-60"
                          aria-label="PG 심사용 테스트 버튼, 실제 결제 아님"
                        >
                          <span className="block text-sm sm:text-base font-bold text-gray-600">
                            {isClassPgTestLoading
                              ? "테스트 결제창 여는 중..."
                              : "PG 심사용 테스트 버튼"}
                          </span>
                          <span className="block mt-1 text-xs sm:text-sm text-gray-500">
                            실제 결제 아님
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : step === 4 ? (
              <div className="space-y-4">
                {paymentStatus === "예약대기" ? (
                  <div className="rounded-xl border border-purple-200 bg-white p-6 text-center shadow-sm">
                    <div className="mb-3 text-3xl">✅</div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      예약 대기
                    </h2>
                    <p className="mt-3 text-lg font-bold leading-relaxed text-gray-800">
                      취소가 생기거나 다음 특강시 연락드리겠습니다.
                      <br />
                      예약해주셔서 감사합니다!
                    </p>
                  </div>
                ) : (
                  <Card className="border-orange-200 bg-orange-50 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl text-orange-900">
                            입금 대기
                          </CardTitle>
                          <p className="mt-1 text-sm font-semibold text-red-600">
                            아직 예약 확정 전입니다. 입금 확인 후 예약이
                            확정됩니다.
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                          {paymentStatus}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
                        <div className="space-y-3">
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">계좌번호</span>
                            <span className="text-right text-lg font-bold text-red-600">
                              {DEPOSIT_ACCOUNT_LABEL}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">예금주</span>
                            <span className="font-bold text-red-600">
                              {DEPOSIT_ACCOUNT_HOLDER}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">입금금액</span>
                            <span className="font-bold">
                              {(selectedTimeSlot?.price ?? 0).toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">입금기한</span>
                            <span className="text-right font-bold text-red-600">
                              {paymentDate ? getDepositDeadline() : ""}
                            </span>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-600">선택한 클래스</span>
                              <span className="text-right font-medium">
                                {selectedTimeSlot
                                  ? getClassDisplayName(selectedTimeSlot.name)
                                  : ""}
                              </span>
                            </div>
                            <div className="mt-2 flex justify-between gap-3">
                              <span className="text-gray-600">예약자명</span>
                              <span className="font-bold">{formData.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-orange-300 bg-white font-bold text-orange-700 hover:bg-orange-100"
                        onClick={() => void copyDepositAccount()}
                      >
                        계좌번호 복사하기
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  className="w-full py-6 text-lg font-semibold bg-teal-600 hover:bg-teal-700"
                  onClick={() => {
                    setStep(1);
                    setSelectedDate(null);
                    setSelectedClass(null);
                    setSelectedTimeSlot(null);
                    setShowRegistrationForm(false);
                    setShowDepositModal(false);
                    setFormData({
                      name: "",
                      phone: "",
                      gender: "male",
                      location: "",
                      email: "",
                      painAreas: ["없음"],
                      swimmingExperience: "",
                      message: "",
                    });
                    setAgreeAll(false);
                    setAgree1(false);
                    setAgree2(false);
                    setAgree4(false);
                    setAgree5(false);
                    setAgree6(false);
                    setAgree7(false);
                    setFinalAgree(false);
                    setPaymentMethod("card");
                    setIsSubmitting(false);
                    setApplicantPageId(null);
                    setPaidPageId(null);
                    setShowSafetyModal(false);
                    setShowRefundModal(false);
                    setShowPrivacyModal(false);
                    setShowTermsModal(false);
                    setShowVideoModal(false);
                    setShowCancellationModal(false);
                    setShowWaitlistModal(false);
                    setWaitlistClass(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  홈으로 돌아가기
                </Button>
              </div>
            ) : null}
            </div>
          </section>
        )}
      </main>

      <Dialog
        open={showDepositModal && paymentStatus !== "예약대기"}
        onOpenChange={(open) => {
          if (open) setShowDepositModal(true);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-0 max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl p-4 sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:p-6"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="pr-2 text-2xl font-extrabold text-gray-900">
              💳 입금 계좌가 발급되었습니다
            </DialogTitle>
            <p className="text-sm font-semibold leading-6 text-red-600">
              아직 예약 확정 전입니다.
              <br />
              아래 계좌로 입금하시면 입금 확인 후 예약이 확정됩니다.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="space-y-3 rounded-xl bg-white p-4 text-sm shadow-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">입금 상태</span>
                  <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                    {paymentStatus}
                  </span>
                </div>
                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-gray-600">계좌번호</span>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="text-lg font-extrabold text-red-600">
                      {DEPOSIT_ACCOUNT_LABEL}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-orange-300 font-bold text-orange-700 hover:bg-orange-100"
                      onClick={() => void copyDepositAccount()}
                    >
                      계좌번호 복사하기
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">예금주</span>
                  <span className="font-bold text-red-600">
                    {DEPOSIT_ACCOUNT_HOLDER}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">입금금액</span>
                  <span className="text-lg font-extrabold text-gray-900">
                    {(selectedTimeSlot?.price ?? 0).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">입금기한</span>
                  <span className="text-right font-bold text-red-600">
                    {paymentDate ? getDepositDeadline() : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <ul className="space-y-2 text-sm font-semibold leading-6 text-red-700">
                <li>입금자명은 신청자명과 동일해야 합니다.</li>
                <li>기한 내 미입금 시 신청은 자동 취소됩니다.</li>
                <li>입금 확인 후 예약 확정 문자를 보내드립니다.</li>
                <li>수업 안내사항은 익일 오후 2시에 발송됩니다.</li>
              </ul>
            </div>

            <details className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-bold text-gray-900">
                주문 상세 정보 보기
              </summary>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">주문번호</span>
                  <span className="text-right text-orange-600">
                    {orderNumber || "WC-000000000"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">주문일시</span>
                  <span className="text-right">
                    {paymentDate ? formatOrderDate(paymentDate) : ""}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">결제방법</span>
                  <span>가상계좌</span>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2">
                  <span className="text-gray-600">선택 클래스</span>
                  <span className="text-right font-medium">
                    {selectedTimeSlot
                      ? getClassDisplayName(selectedTimeSlot.name)
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">시간대</span>
                  <span className="text-right text-gray-700">
                    {selectedTimeSlot
                      ? `${selectedTimeSlot.session} (${selectedTimeSlot.time})`
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">지역</span>
                  <span className="text-right text-gray-700">
                    {classes.find((c) => String(c.id) === selectedClass)
                      ?.location || "정보 없음"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2">
                  <span className="text-gray-600">예약자명</span>
                  <span className="font-bold">{formData.name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">연락처</span>
                  <span>{formData.phone}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">성별</span>
                  <span>{formData.gender === "male" ? "남성" : "여성"}</span>
                </div>
              </div>
            </details>

            <details className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <summary className="cursor-pointer font-bold text-yellow-900">
                환불 정책 보기
              </summary>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-semibold leading-6 text-gray-900">
                <li>수업 14일 전 취소 요청시 100% 환불됩니다.</li>
                <li>이후 대관 예약을 진행하므로 환불 및 취소는 불가합니다.</li>
                <li>자세한 환불 정책은 이용약관을 확인해주세요.</li>
              </ul>
            </details>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 border-orange-300 bg-white font-bold text-orange-700 hover:bg-orange-100"
                onClick={() => void copyDepositAccount()}
              >
                계좌번호 복사하기
              </Button>
              <Button
                type="button"
                className="h-12 bg-orange-600 font-bold text-white hover:bg-orange-700"
                onClick={() => {
                  console.log("[입금안내] 사용자가 입금 계좌 모달 확인 완료");
                  setShowDepositModal(false);
                }}
              >
                확인했습니다
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              개인정보 수집 및 이용 동의
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowPrivacyModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-base mb-2">
                1. 개인정보의 수집 및 이용 목적
              </h3>
              <p className="text-gray-600 mb-2">
                블루마인드주식회사(이하 "회사")는 다음의 목적을 위하여 개인정보를 수집하고
                이용합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수영 강의 예약 및 관리</li>
                <li>수강생 본인 확인 및 연락</li>
                <li>수업 일정 변경 및 취소 안내</li>
                <li>서비스 관련 중요 공지사항 전달</li>
                <li>고객 문의 및 불만 처리</li>
                <li>통계 분석 및 서비스 개선</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                2. 수집하는 개인정보 항목
              </h3>
              <p className="text-gray-600 mb-2">
                회사는 예약 서비스 제공을 위해 다음과 같은 개인정보를
                수집합니다:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [필수 항목]
                  </p>
                  <p className="text-gray-600">
                    이름, 휴대폰 번호, 성별, 거주 지역, 수영 경력, 수강 목적
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [선택 항목]
                  </p>
                  <p className="text-gray-600">
                    차량번호 (주차 지원 시), 이메일 (추가 정보 수신 시)
                  </p>
                </div>
                <p className="text-xs text-red-600 font-medium">
                  * 필수 항목을 입력하지 않을 경우 서비스 이용이 제한될 수
                  있습니다.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                3. 개인정보의 보유 및 이용 기간
              </h3>
              <p className="text-gray-600 mb-2">
                회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를
                지체 없이 파기합니다. 단, 다음의 경우에는 해당 기간 동안
                보관합니다:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    전자상거래 등에서의 소비자보호에 관한 법률
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    통신비밀보호법
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>웹사이트 방문 기록: 3개월</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                4. 개인정보의 제3자 제공
              </h3>
              <p className="text-gray-600 mb-3">
                회사는 원칙적으로 고객의 개인정보를 외부에 제공하지 않습니다.
                다만, 다음의 경우는 예외로 합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 mb-4">
                <li>고객이 사전에 동의한 경우</li>
                <li>
                  법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와
                  방법에 따라 수사기관의 요구가 있는 경우
                </li>
                <li>
                  서비스 제공을 위해 필요한 경우 (결제 대행사, 배송업체 등)
                </li>
              </ul>

              <p className="font-semibold text-gray-900 mb-2">
                [제3자 제공 현황]
              </p>
              <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 border-r font-bold">제공받는 자</th>
                      <th className="p-2 border-r font-bold">제공 목적</th>
                      <th className="p-2 font-bold">제공 항목</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 border-r">PG사 (결제 대행)</td>
                      <td className="p-2 border-r">결제 처리</td>
                      <td className="p-2">이름, 연락처, 결제 정보</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r">알림톡 발송 업체</td>
                      <td className="p-2 border-r">예약 확인 알림</td>
                      <td className="p-2">이름, 연락처, 예약 정보</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                5. 개인정보의 파기 절차 및 방법
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [파기 절차]
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    이용자가 입력한 정보는 목적 달성 후 내부 방침 및 관련 법령에
                    따라 일정 기간 저장된 후 파기됩니다.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [파기 방법]
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>
                      전자적 파일 형태: 복구 및 재생이 불가능한 기술적 방법을
                      사용하여 완전 삭제
                    </li>
                    <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                6. 이용자 및 법정대리인의 권리와 행사 방법
              </h3>
              <p className="text-gray-600 mb-2">
                이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 mb-3">
                <li>개인정보 열람 요구</li>
                <li>개인정보 정정·삭제 요구</li>
                <li>개인정보 처리 정지 요구</li>
              </ul>
              <p className="text-gray-600 leading-relaxed bg-blue-50 p-3 rounded-lg">
                권리 행사는 고객센터(
                <span className="font-bold">010-3904-1018</span>) 또는 이메일(
                <span className="font-bold">toptier1018@gmail.com</span>)을 통해
                하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                7. 개인정보 보호책임자
              </h3>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-gray-600">
                <p>
                  <span className="font-bold text-gray-900">이름:</span> 김세란
                </p>
                <p>
                  <span className="font-bold text-gray-900">직책:</span> 총괄
                </p>
                <p>
                  <span className="font-bold text-gray-900">연락처:</span>{" "}
                  010-3904-1018
                </p>
                <p>
                  <span className="font-bold text-gray-900">이메일:</span>{" "}
                  toptier1018@gmail.com
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                8. 개인정보 처리방침 변경
              </h3>
              <p className="text-gray-600 leading-relaxed">
                이 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라
                내용의 추가, 삭제 및 수정이 있을 시에는 변경사항의 시행 3일
                전부터 웹사이트를 통하여 공지할 것입니다.
              </p>
            </div>

            <div className="pt-4 border-t text-xs text-gray-500">
              <p className="font-bold">부칙</p>
              <p>본 방침은 2026년 1월 1일부터 시행됩니다.</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowPrivacyModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              서비스 이용약관
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowTermsModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-base mb-2">제1조 (목적)</h3>
              <p className="text-gray-600 leading-relaxed">
                본 약관은 블루마인드주식회사(이하 "회사")가 제공하는 수영 강의 예약
                서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리,
                의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제2조 (용어의 정의)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  "서비스"란 회사가 제공하는 수영 강의 예약 및 관련 부가
                  서비스를 말합니다.
                </li>
                <li>
                  "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는
                  고객을 말합니다.
                </li>
                <li>"강의"란 회사가 제공하는 수영 교육 프로그램을 말합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                제3조 (서비스의 제공)
              </h3>
              <p className="text-gray-600 mb-2">
                회사는 다음과 같은 서비스를 제공합니다:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>수영 강의 예약 및 결제 서비스</li>
                <li>강의 일정 안내 및 변경 알림</li>
                <li>수영 관련 정보 제공</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제4조 (서비스 이용)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한
                  연중무휴, 1일 24시간을 원칙으로 합니다.
                </li>
                <li>
                  회사는 시스템 정기점검, 서버 증설 및 교체 등의 사유로 서비스를
                  일시 중단할 수 있으며, 이 경우 사전에 공지합니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제5조 (예약 및 결제)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  강의 예약은 웹사이트를 통해 진행되며, 결제 완료 시 예약이
                  확정됩니다.
                </li>
                <li>
                  결제는 신용카드, 계좌이체 등 회사가 정한 방법으로 진행됩니다.
                </li>
                <li>
                  예약 확정 후 이용자의 연락처로 예약 확인 알림톡이 발송됩니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                제6조 (이용자의 의무)
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  이용자는 정확한 정보를 제공해야 하며, 허위 정보 제공 시 예약이
                  취소될 수 있습니다.
                </li>
                <li>이용자는 강의 시작 30분 전까지 도착해야 합니다.</li>
                <li>이용자는 강사의 안전 지침을 준수해야 합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제7조 (회사의 의무)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  회사는 안전하고 질 높은 강의를 제공하기 위해 노력합니다.
                </li>
                <li>
                  회사는 이용자의 개인정보를 보호하며, 관련 법령을 준수합니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                제8조 (개인정보 보호)
              </h3>
              <p className="text-gray-600 leading-relaxed">
                회사는 이용자의 개인정보를 보호하기 위해 개인정보보호법 및 관련
                법령을 준수하며, 개인정보처리방침에 따라 이용자의 개인정보를
                처리합니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제9조 (면책)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  회사는 천재지변, 전쟁, 기타 불가항력으로 인하여 서비스를
                  제공할 수 없는 경우 책임이 면제됩니다.
                </li>
                <li>
                  회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여
                  책임을 지지 않습니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제10조 (분쟁 해결)</h3>
              <p className="text-gray-600 leading-relaxed">
                서비스 이용과 관련하여 발생한 분쟁은 회사와 이용자 간의 협의를
                통해 해결함을 원칙으로 하며, 협의가 이루어지지 않을 경우 관련
                법령 및 회사 소재지 법원의 관할에 따릅니다.
              </p>
            </div>

            <div className="pt-4 border-t text-xs text-gray-500">
              <p className="font-bold">부칙</p>
              <p>본 약관은 2026년 1월 1일부터 시행됩니다.</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowTermsModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Video Filming Consent Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              수영 강의 영상촬영 동의
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowVideoModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. 촬영 목적</h3>
              <p className="text-gray-600 mb-2">
                회사는 다음의 목적을 위해 수영 강의 영상을 촬영합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수강생의 수영 자세 교정 및 피드백 제공</li>
                <li>강의 품질 향상을 위한 분석 자료</li>
                <li>수강생 본인의 실력 향상 확인을 자료 제공</li>
                <li>교육용 모델 콘텐츠 제작 및 수영 강의 홍보 목적</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 촬영 방법</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>모든 카메라 및 수영장 곳곳에 카메라를 설치하여 촬영</li>
                <li>강의 진행 중 참사자 동의 시 촬영</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. 영상의 보관 및 이용</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  영상은 수강생 본인의 교육 목적으로만 사용되며, 제3자에게
                  제공되지 않습니다.
                </li>
              </ul>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowVideoModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Swimming Activity Safety and Liability Modal */}
      <Dialog open={showSafetyModal} onOpenChange={setShowSafetyModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              수영 활동 안전 및 면책 동의
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowSafetyModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900 text-xs ml-2">
                ⚠️ 본 동의서는 수영 활동의 안전을 위한 중요한 문서입니다. 수영
                강의 참여 전 반드시 숙지하시기 바랍니다.
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="font-bold text-base mb-2">
                1. 수영 활동의 위험성 인지
              </h3>
              <p className="text-gray-600 mb-3 leading-relaxed">
                수강생은 수영이 다음과 같은 위험을 포함할 수 있음을 충분히
                인지하고 이해합니다:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="font-bold text-blue-900 mb-2 flex items-center gap-1">
                    🌊 수상 활동 관련 위험
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                    <li>익수 및 호흡 곤란</li>
                    <li>수영 중 근육 경련</li>
                    <li>과호흡 및 저체온증</li>
                    <li>수중 시야 확보 어려움으로 인한 충돌</li>
                  </ul>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <p className="font-bold text-indigo-900 mb-2 flex items-center gap-1">
                    🏊 신체 활동 관련 위험
                  </p>
                  <ul className="text-xs text-indigo-700 space-y-1 list-disc pl-4">
                    <li>근육 및 관절 부상</li>
                    <li>미끄러짐으로 인한 낙상</li>
                    <li>과도한 운동으로 인한 탈진</li>
                    <li>기존 건강 상태의 악화 가능성</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                2. 건강 상태 고지 의무
              </h3>
              <p className="text-gray-600 mb-3 leading-relaxed">
                수강생은 다음 사항을 강사에게 반드시 사전에 고지해야 합니다:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-bold text-gray-900 mb-3 text-xs">
                  [필수 고지 사항]
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">
                      심혈관계 질환
                    </p>
                    <p className="text-gray-600 text-[11px]">
                      심장 질환, 고혈압, 부정맥
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">
                      호흡기 질환
                    </p>
                    <p className="text-gray-600 text-[11px]">
                      천식, 폐 질환, 호흡기 알레르기
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">기타 질환</p>
                    <p className="text-gray-600 text-[11px]">
                      당뇨병, 간질, 척추/관절 질환
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">특이사항</p>
                    <p className="text-gray-600 text-[11px]">
                      최근 수술 이력, 임신 여부, 약물 복용 중
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-3 font-bold">
                ⚠️ 중요: 건강 상태를 고지하지 않아 발생한 사고에 대해서는 회사가
                책임을 지지 않습니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">3. 안전 수칙 준수</h3>
              <div className="space-y-3">
                {[
                  {
                    title: "준비운동 및 정리운동 참여",
                    desc: "강의 시작 전후 반드시 준비운동과 정리운동에 참여합니다.",
                  },
                  {
                    title: "강사의 안전 지시 이행",
                    desc: "강사의 모든 안전 지침과 주의사항을 즉시 따릅니다.",
                  },
                  {
                    title: "능력 범위 내 활동",
                    desc: "본인의 체력 및 수영 능력 범위 내에서만 활동합니다.",
                  },
                  {
                    title: "이상 증상 즉시 알림",
                    desc: "수영 중 어지러움, 호흡곤란 등 이상 증상 발생 시 즉시 강사에게 알립니다.",
                  },
                  {
                    title: "수영장 규칙 준수",
                    desc: "수영장 내 뛰지 않기, 다이빙 금지 구역 준수 등 수영장 규칙을 지킵니다.",
                  },
                  {
                    title: "음주 후 참여 금지",
                    desc: "음주 상태에서는 절대 수영에 참여하지 않습니다.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 items-start border-b border-gray-100 pb-2"
                  >
                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">
                        {item.title}
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">4. 면책 사항</h3>
              <ul className="space-y-2">
                {[
                  "수강생이 건강 상태를 고지하지 않아 발생한 사고",
                  "수강생이 안전 수칙을 위반하여 발생한 사고",
                  "수강생의 고의 또는 중대한 과실로 인한 사고",
                  "천재지변, 전쟁 등 불가항력적 사유로 인한 사고",
                  "수강생 간 충돌 등 제3자의 행위로 인한 사고",
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-gray-600 text-xs"
                  >
                    <span className="text-gray-300 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                5. 회사의 안전 관리 의무
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    👨‍🏫 인력 관리
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>자격증 보유 강사 배치</li>
                    <li>정기적인 안전 교육 실시</li>
                    <li>응급처치 교육 이수</li>
                  </ul>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    🛟 안전 장비
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>구명 장비 구비</li>
                    <li>응급 의료 키트 비치</li>
                    <li>장비 정기 점검 실시</li>
                  </ul>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    📋 매뉴얼 운영
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>응급 상황 대응 매뉴얼</li>
                    <li>사고 보고 체계 구축</li>
                    <li>정기 안전 훈련</li>
                  </ul>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    🏊 시설 관리
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>수질 정기 검사</li>
                    <li>시설 안전 점검</li>
                    <li>미끄럼 방지 조치</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">6. 긴급 상황 대응</h3>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="font-bold text-red-900 text-xs mb-3 flex items-center gap-1">
                  🚨 긴급 상황 발생 시 행동 요령
                </p>
                <div className="space-y-2 text-[11px] text-red-800">
                  <p>
                    <span className="font-bold">1단계:</span> 즉시 수영을
                    중단하고 안전한 곳으로 이동
                  </p>
                  <p>
                    <span className="font-bold">2단계:</span> 강사 또는 인근
                    스태프에게 즉시 알림
                  </p>
                  <p>
                    <span className="font-bold">3단계:</span> 강사의 지시에 따라
                    행동
                  </p>
                  <p>
                    <span className="font-bold">4단계:</span> 필요시 119 신고
                    (강사가 진행)
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-red-200 space-y-2">
                  <p className="font-bold text-red-900 text-xs flex items-center gap-1">
                    📞 긴급 연락처
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-red-700">
                    <p>수영장 관리실: [수영장별 안내]</p>
                    <p>강사 연락처: [현장 안내]</p>
                    <p>회사 상황실: 010-3904-1018</p>
                    <p>응급 상황: 119</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">7. 보험 안내</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-600">
                <p className="text-[11px] leading-relaxed">
                  회사는 다음과 같은 보험에 가입되어 있습니다:
                </p>
                <ul className="text-[11px] space-y-1 list-disc pl-4 font-medium">
                  <li>시설 배상책임보험: 시설 결함으로 인한 사고 보장</li>
                  <li>강사 배상책임보험: 강사의 과실로 인한 사고 보장</li>
                </ul>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  * 수강생 개인의 건강 상태나 귀책사유로 인한 사고는 보험 적용
                  대상이 아닙니다. 개인 상해보험 가입을 권장합니다.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">8. 동의 철회</h3>
              <p className="text-gray-600 leading-relaxed">
                본 동의는 수강생이 수영 강의에 참여하는 동안 유효하며, 수강을
                중단할 경우 자동으로 효력이 상실됩니다.
              </p>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
              <p className="font-bold text-primary text-xs mb-2">
                📌 최종 확인 사항
              </p>
              <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                본인은 위의 모든 내용을 충분히 숙지하였으며, 수영 활동의
                위험성을 이해하고 안전 수칙을 준수할 것을 약속합니다. 또한 건강
                상태를 정확히 고지하였으며, 고지하지 않은 사항으로 인한 사고에
                대해서는 본인이 책임질 것을 확인합니다.
              </p>
            </div>

            <div className="pt-2 text-[10px] text-gray-400 border-t flex justify-between items-center">
              <p>본 동의서는 2026년 1월 1일부터 시행됩니다.</p>
              <p className="font-bold">부칙</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowSafetyModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Cancellation and Refund Policy Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-base md:text-lg font-bold flex items-center gap-2">
              <span className="text-blue-600">🏊</span>
              스윔잇 수영 특강 환불 및 참가 규정
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowRefundModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* 1. 개요 */}
            <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-200">
              <h3 className="font-bold text-sm md:text-base mb-2 text-blue-900">
                1. 환불 정책 개요
              </h3>
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                본 규정은 스윔잇이 운영하는 모든 수영 특강 예약 서비스에
                적용됩니다. 환불 가능 여부는{" "}
                <span className="font-bold">특강일을 기준으로 역산</span>하여
                산정됩니다.
              </p>
            </div>

            {/* 2. 환불 규정 */}
            <div>
              <h3 className="font-bold text-sm md:text-base mb-2">
                2. 환불 규정
              </h3>
              <div className="space-y-2 md:space-y-3">
                <div className="bg-green-50 p-3 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                    <p className="font-bold text-xs md:text-sm text-green-900">
                      📅 특강일 14일 전까지 (D-14 이전)
                    </p>
                  </div>
                  <p className="text-sm md:text-base font-bold text-green-700 mb-1.5">
                    ✅ 결제 금액의 100% 전액 환불
                  </p>
                  <p className="text-xs md:text-sm text-green-700 leading-relaxed">
                    취소 신청 시 등록한 계좌로 환불 처리
                  </p>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-600 flex-shrink-0" />
                    <p className="font-bold text-xs md:text-sm text-red-900">
                      📅 특강일 14일 이내 (D-14 포함)
                    </p>
                  </div>
                  <p className="text-sm md:text-base font-bold text-red-700 mb-1.5">
                    ❌ 환불 불가
                  </p>
                  <p className="text-xs md:text-sm text-red-700 leading-relaxed">
                    특강 준비를 위한 수영장 대관비 및 강사료가 확정되어 환불이
                    불가합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. 일정 변경 및 대기자 배정 */}
            <div className="border-t pt-3">
              <h3 className="font-bold text-sm md:text-base mb-2">
                3. 일정 변경(이월) 및 대기자 배정 운영 원칙
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                환불 불가 기간 내 취소 요청 시, 아래 기준에 따라 운영됩니다.
              </p>

              <div className="space-y-2">
                {/* D-7 이전 */}
                <div className="bg-blue-50 p-2.5 md:p-3 rounded-lg border border-blue-200">
                  <p className="font-bold text-xs md:text-sm text-blue-900 mb-1.5">
                    ① 특강일 7일 전까지 (D-7 이전)
                  </p>
                  <ul className="space-y-1 text-xs text-gray-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>
                        <span className="font-semibold">1회에 한해</span> 다음
                        기수로 일정 변경(이월) 가능
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>재이월 불가</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>
                        차기 특강 일정이 확정되지 않은 경우, 해당 기수 우선
                        등록권 부여
                      </span>
                    </li>
                  </ul>
                </div>

                {/* D-3 이전 */}
                <div className="bg-orange-50 p-2.5 md:p-3 rounded-lg border border-orange-200">
                  <p className="font-bold text-xs md:text-sm text-orange-900 mb-1.5">
                    ② 특강일 3일 전까지 (D-3 이전)
                  </p>
                  <ul className="space-y-1 text-xs text-gray-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span className="font-semibold">환불은 불가</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span>
                        대기자가 있는 경우 운영자가 자동으로 대기자에게 배정
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span>기존 참가자는 환불 없이 일정 변경 처리</span>
                    </li>
                  </ul>
                  <p className="text-xs text-orange-700 mt-2 bg-white p-2 rounded">
                    ※ 개인 간 직접 양도는 불가하며, 반드시 운영자를 통해
                    진행됩니다.
                  </p>
                </div>

                {/* D-3 이내 */}
                <div className="bg-red-50 p-2.5 md:p-3 rounded-lg border border-red-200">
                  <p className="font-bold text-xs md:text-sm text-red-900 mb-1.5">
                    ③ 특강일 3일 이내 (D-3 포함)
                  </p>
                  <ul className="space-y-1 text-xs text-gray-700 mb-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span className="font-semibold">
                        환불 및 일정 변경 불가
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>
                        단, 아래 긴급 상황에 해당하는 경우 증빙 제출 시 1회에
                        한해 일정 변경 가능
                      </span>
                    </li>
                  </ul>

                  <div className="bg-white p-2 md:p-2.5 rounded border border-red-100">
                    <p className="font-bold text-xs text-red-800 mb-1.5">
                      🔹 인정 가능한 긴급 상황 예시
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li className="flex items-start gap-1">
                        <span className="mt-0.5">·</span>
                        <span>본인의 입원 또는 응급 치료가 필요한 사고</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="mt-0.5">·</span>
                        <span>법정 감염병 확진(격리 통지서 제출 가능 시)</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="mt-0.5">·</span>
                        <span>
                          직계가족(부모, 배우자, 자녀)의 사망 또는 중대한 사고
                        </span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="mt-0.5">·</span>
                        <span>
                          천재지변, 항공/열차 결항 등으로 이동이 물리적으로
                          불가능한 경우
                        </span>
                      </li>
                    </ul>
                    <div className="mt-2 pt-2 border-t border-red-100 space-y-0.5 text-xs text-gray-500 leading-relaxed">
                      <p>
                        ※ 단순 개인 일정 변경, 업무 일정 충돌, 단순 컨디션 난조
                        등은 인정되지 않습니다.
                      </p>
                      <p>
                        ※ 증빙 자료는 문자, 이메일, 카카오톡 등을 통해 제출해야
                        합니다.
                      </p>
                      <p>
                        ※ 허위 사유 제출 시 향후 특강 참여가 제한될 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. 참가 원칙 */}
            <div className="border-t pt-3">
              <h3 className="font-bold text-sm md:text-base mb-2">
                4. 참가 원칙
              </h3>
              <div className="bg-gray-50 p-2.5 md:p-3 rounded-lg">
                <ul className="space-y-1.5 text-xs md:text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <User className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-semibold">
                        결제자 본인 참석 원칙
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>양도 및 대리 참석 불가</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  ※ 단, 제3항에 따른 운영자 승인 절차를 거친 경우에 한해
                  처리됩니다.
                </p>
              </div>
            </div>

            {/* 5. 환불 처리 */}
            <div className="border-t pt-3">
              <h3 className="font-bold text-sm md:text-base mb-2">
                5. 환불 처리
              </h3>
              <div className="bg-gray-50 p-2.5 md:p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-700" />
                  <p className="font-semibold text-xs md:text-sm text-gray-900">
                    처리 절차
                  </p>
                </div>
                <ul className="space-y-1 text-xs text-gray-600 ml-6">
                  <li>• 취소 접수일 기준 3~5 영업일 이내 환불 처리</li>
                  <li>• 환불 계좌는 취소 신청 시 등록</li>
                  <li>• 이체 수수료는 주최 측 부담</li>
                </ul>
                <p className="text-xs text-gray-500 mt-1.5">
                  ※ 카드 결제의 경우 카드사 정책에 따라 반영 시점이 상이할 수
                  있습니다.
                </p>
              </div>
            </div>

            {/* 6. 환불 불가 사유 */}
            <div className="border-t pt-3">
              <h3 className="font-bold text-sm md:text-base mb-2">
                6. 환불 불가 사유
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mb-2">
                다음의 경우 환불이 불가합니다:
              </p>
              <ul className="space-y-1 text-xs md:text-sm text-gray-700 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>특강일 14일 이내 취소</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>참가자의 무단 불참(No-show)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>개인 사정(건강, 일정 변경 등)에 따른 불참</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>당일 지각 또는 중도 퇴장</span>
                </li>
              </ul>
            </div>

            {/* 7. 문의 안내 */}
            <div className="border-t pt-3">
              <h3 className="font-bold text-sm md:text-base mb-2">
                7. 문의 안내
              </h3>
              <div className="bg-yellow-50 p-2.5 md:p-3 rounded-lg border border-yellow-200">
                <p className="text-xs md:text-sm text-gray-700 mb-2">
                  취소 및 환불 문의는 아래 채널을 통해 접수해 주시기 바랍니다.
                </p>
                <ul className="space-y-1 text-xs md:text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 flex-shrink-0" />
                    <span>스윔잇 카카오톡 채팅방</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 flex-shrink-0" />
                    <span>스윔잇 커뮤니티 카페</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 flex-shrink-0" />
                    <span>특강 주최자 개별 연락</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 중요 안내 박스 */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 md:p-4 rounded-lg border-2 border-yellow-300">
              <p className="font-bold text-sm md:text-base text-gray-900 mb-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>중요 안내</span>
              </p>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-800">
                <li className="flex items-start gap-2 leading-relaxed">
                  <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-bold">특강일 14일 전까지:</span> 100%
                    환불 가능
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-bold">특강일 14일 이내:</span> 환불
                    불가
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-bold">7일 전까지</span> 1회 이월 가능
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-bold">3일 전까지</span> 대기자 자동
                    배정 가능
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-bold">3일 이내</span> 환불·이월 불가
                    (긴급 상황 제외)
                  </span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-bold">결제자 본인만</span> 참석 가능
                  </span>
                </li>
              </ul>
            </div>

            {/* 참고 사항 */}
            <div className="text-xs leading-relaxed bg-gray-50 p-2.5 md:p-3 rounded border border-gray-200">
              <p className="font-bold mb-1.5 text-gray-700">[참고 사항]</p>
              <p className="mb-1.5 text-gray-600">
                스윔잇 수영 특강은 소수 정원으로 운영되며, 수영장 대관비 및
                강사료는{" "}
                <span className="font-semibold">
                  특강일 기준 14일 전 최종 확정
                </span>
                됩니다.
              </p>
              <p className="text-gray-600">
                이에 따라 준비 비용이 확정된 이후에는 환불이 제한되는 점 양해
                부탁드립니다.
              </p>
            </div>

            {/* 부칙 */}
            <div className="text-xs text-gray-500 border-t pt-2">
              <p className="font-bold text-gray-700 mb-1">부칙</p>
              <p>본 규정은 2026년 1월 1일부터 시행됩니다.</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowRefundModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCancellationModal}
        onOpenChange={setShowCancellationModal}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              강의 취소 가능성 안내
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            {/* 1. 강의 취소 사유 */}
            <div>
              <h3 className="font-semibold mb-2">1. 강의 취소 사유</h3>
              <p className="text-gray-700 mb-2">
                다음의 경우 예약된 강의가 취소될 수 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>기상 악화: 폭우, 태풍, 폭설 등으로 인한 안전 문제</li>
                <li>수영장 시설 문제: 수질 문제, 시설 고장, 긴급 보수 등</li>
                <li>강사 사정: 강사의 급병, 사고 등 불가피한 사유</li>
                <li>
                  최소 인원 미달: 그룹 강의의 경우 최소 인원 미달 시 (사전 공지)
                </li>
                <li>기타 불가항력: 천재지변, 감염병 확산 등</li>
              </ul>
            </div>

            {/* 2. 취소 안내 방법 */}
            <div>
              <h3 className="font-semibold mb-2">2. 취소 안내 방법</h3>
              <p className="text-gray-700 mb-2">
                강의 취소 시 다음과 같이 안내됩니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>카카오톡 알림톡 발송</li>
                <li>SMS 문자 메시지 발송</li>
                <li>전화 연락 (긴급 상황 시)</li>
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                * 가능한 한 강의 시작 최소 3시간 전에 안내드리기 위해
                노력합니다.
              </p>
            </div>

            {/* 3. 취소 시 조치 */}
            <div>
              <h3 className="font-semibold mb-2">3. 취소 시 조치</h3>
              <p className="text-gray-700 mb-2">
                수강생은 다음 중 선택할 수 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>전액 환불: 결제 금액 100% 환불</li>
                <li>일정 변경: 다른 가능한 날짜로 무료 변경</li>
                <li>
                  크레딧 적립: 다음 강의 예약 시 사용 가능한 크레딧으로 보관
                </li>
              </ul>
            </div>

            {/* 4. 환불 처리 */}
            <div>
              <h3 className="font-semibold mb-2">4. 환불 처리</h3>
              <p className="text-gray-700 mb-2">
                회사 사유로 강의가 취소된 경우:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>환불 신청 즉시 처리 (별도 신청 불필요)</li>
                <li>결제 수단에 따라 3-5 영업일 내 환불 완료</li>
                <li>취소 수수료 없음</li>
              </ul>
            </div>

            {/* 5. 부분 취소 */}
            <div>
              <h3 className="font-semibold mb-2">5. 부분 취소</h3>
              <p className="text-gray-700 mb-2">
                여러 회차 또는 여러 강의를 예약한 경우:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>취소된 강의에 해당하는 금액만 환불</li>
                <li>나머지 예약 강의는 정상 진행</li>
                <li>전체 취소를 원할 경우 별도 요청 가능</li>
              </ul>
            </div>

            {/* 6. 보상 정책 */}
            <div>
              <h3 className="font-semibold mb-2">6. 보상 정책</h3>
              <p className="text-gray-700 mb-2">
                반복적인 강의 취소가 발생할 경우:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>추가 무료 강의권 제공</li>
                <li>다음 예약 시 할인 쿠폰 제공</li>
                <li>우선 예약권 부여</li>
              </ul>
            </div>

            {/* 안내사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 font-medium flex items-start gap-2 mb-2">
                <span className="text-blue-600 text-lg">💡</span>
                <span>안내사항</span>
              </p>
              <p className="text-blue-700 text-xs leading-relaxed mb-2">
                강의 당일 기상 상황이 불안정한 경우, 강의 시작 2-3시간 전에 최종
                진행 여부를 결정하여 안내드립니다. 수영장으로 출발하기 전
                카카오톡 알림을 확인해 주시기 바랍니다.
              </p>
              <p className="text-blue-700 text-xs leading-relaxed">
                본 안내는 수강생의 권익 보호를 위한 것이며, 회사는 최대한 강의
                취소가 발생하지 않도록 노력하겠습니다.
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setShowCancellationModal(false)}
              className="w-full bg-primary text-white"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="max-w-md">
          <button
            onClick={() => setShowWaitlistModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center space-y-4 pt-6">
            {/* Alarm Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-12 h-12 text-orange-500"
                >
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2 2" />
                  <path d="M5 3 2 6" />
                  <path d="m22 6-3-3" />
                  <path d="M6 19 4 21" />
                  <path d="m18 19 2 2" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-center">
              대기자로 신청하시겠습니까?
            </h2>

            {/* Selected Class Info */}
            <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                <span className="font-semibold text-gray-900">
                  선택한 클래스
                </span>
              </div>
              <div className="ml-4 space-y-1">
                <p className="font-bold text-gray-900">{waitlistClass?.name}</p>
                <p className="text-sm text-orange-600">
                  {waitlistClass?.time} / {waitlistClass?.type}
                </p>
                <p className="text-sm text-gray-600">정원: 10/10</p>
              </div>
            </div>

            {/* Waitlist Information */}
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">📋</span>
                </div>
                <span className="font-semibold text-gray-900">
                  대기자 신청 안내
                </span>
              </div>
              <ul className="ml-7 space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>클래스는 선착순입니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>정원 초과 시 조기마감되므로 양해부탁드립니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>대기 순서는 신청 순서대로 배정됩니다</span>
                </li>
              </ul>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={() => {
                setShowWaitlistModal(false);
                // Handle waitlist registration here
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 4 - Completion */}
      {step === 4 && !showRegistrationForm && (
        <div className="space-y-4">
          {/* Completion Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <span className="text-3xl">
                {paymentStatus === "예약대기" ? "✅" : "💳"}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {paymentStatus === "예약대기"
                ? "예약 대기"
                : "가상계좌가 발급되었습니다"}
            </h2>
            <p
              className={
                paymentStatus === "예약대기"
                  ? "text-gray-600"
                  : "text-red-600 font-bold"
              }
            >
              {paymentStatus === "예약대기" ? (
                "완료"
              ) : (
                <>
                  아래 계좌로 입금하시면
                  <br />
                  익일 오후 2시에 확정 문자와 함께 안내사항 보내드립니다
                </>
              )}
            </p>
          </div>

          {/* Virtual Account Information */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="text-blue-600">📋</span>
                가상계좌 입금 정보
              </h3>
              <span
                className={`text-white text-xs px-2 py-1 rounded ${
                  paymentStatus === "입금완료" || paymentStatus === "결제완료"
                    ? "bg-green-500"
                    : paymentStatus === "예약대기" || paymentStatus === "결제대기"
                      ? "bg-orange-500"
                      : "bg-green-500"
                }`}
              >
                {paymentStatus}
              </span>
            </div>
            {paymentStatus === "예약대기" ? (
              <div className="bg-white p-6 rounded text-center">
                <p className="text-xl font-bold text-gray-900 leading-relaxed">
                  취소가 생기거나 다음 특강시 연락드리겠습니다.
                  <br />
                  예약해주셔서 감사합니다!
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm bg-white p-3 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-600">계좌번호</span>
                  <span className="font-bold text-red-600 text-lg">
                    농협 302-1710-5277-51
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예금주</span>
                  <span className="font-medium text-red-600">장연성</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">입금금액</span>
                  <span className="font-bold text-lg">₩{(selectedTimeSlot?.price ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">입금기한</span>
                  <span className="text-red-600 font-bold">
                    {paymentDate ? getDepositDeadline() : ""}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Order & Payment Summary */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3 text-sm">주문 및 결제 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">주문번호</span>
                <span className="text-orange-600">
                  {orderNumber || "WC-000000000"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">주문일시</span>
                <span>{paymentDate ? formatOrderDate(paymentDate) : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제방법</span>
                <span>가상계좌</span>
              </div>
              {selectedTimeSlot && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">선택된 클래스</span>
                  <span className="font-medium">
                    {getClassDisplayName(selectedTimeSlot.name)}
                  </span>
                </div>
              )}
              {selectedTimeSlot && (
                <div className="flex justify-between">
                  <span className="text-gray-600">시간대</span>
                  <span className="text-gray-700">
                    {selectedTimeSlot.session} ({selectedTimeSlot.time})
                  </span>
                </div>
              )}
              {selectedTimeSlot && (
                <div className="flex justify-between">
                  <span className="text-gray-600">지역</span>
                  <span className="text-gray-700">
                    {classes.find((c) => String(c.id) === selectedClass)
                      ?.location || "정보 없음"}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>결제 금액</span>
                <span className="text-cyan-600">₩{(selectedTimeSlot?.price ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Reservation Information */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3 text-sm">예약자 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">이름</span>
                <span>{formData.name || "김민지"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">연락처</span>
                <span>{formData.phone || "01012345678"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">성별</span>
                <span>{formData.gender === "male" ? "남성" : "여성"}</span>
              </div>
            </div>
          </div>

          {/* Important Notices - 예약대기 상태가 아닐 때만 표시 */}
          {paymentStatus !== "예약대기" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="text-orange-500">⚠️</span>
                  입금 안내
                </h3>
                <ul className="text-base font-bold text-red-600 space-y-2 pl-4 list-disc">
                  <li>입금자명은 신청자와 같아야 합니다!</li>
                  <li>기한 내 미입금시 주문이 자동 취소됩니다</li>
                  <li>
                    당일 입금 확인 후 익일 오후 2시 안내사항 문자로 공지됩니다.
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="text-blue-600">💡</span>
                  결제 관련 문의
                </h3>
                <p className="text-xs text-gray-700 mb-3">
                  결제 관련해서 문의사항이 있으시면 카카오톡 문의하기로
                  연락주세요
                </p>
                <Button
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={() =>
                    window.open("https://pf.kakao.com/_dXUgn/chat", "_blank")
                  }
                >
                  ☎️ 카카오톡 문의하기
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  환불 정책 주의사항
                </h3>
                <ul className="text-base font-bold text-gray-900 space-y-2 pl-4 list-disc">
                  <li>수업 14일 전 취소 요청시 100% 환불됩니다</li>
                  <li>
                    이후 대관 예약을 진행하므로 환불 및 취소는 불가합니다.
                  </li>
                  <li>자세한 환불 정책은 이용약관을 확인해주세요</li>
                </ul>
              </div>
            </div>
          )}

          <Button
            className="w-full py-6 text-lg font-semibold bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              console.log("[v0] 홈으로 돌아가기 버튼 클릭됨");
              console.log("[v0] 현재 step:", step);

              // 모든 상태를 초기 상태로 리셋
              setStep(1);
              setSelectedDate(null);
              setSelectedClass(null);
              setSelectedTimeSlot(null);
              setShowRegistrationForm(false);
              setShowDepositModal(false);
              setFormData({
                name: "",
                phone: "",
                gender: "male",
                location: "",
                email: "",
                painAreas: ["없음"],
                swimmingExperience: "",
                message: "",
              });
              setAgreeAll(false);
              setAgree1(false);
              setAgree2(false);
              setAgree4(false);
              setAgree5(false);
              setAgree6(false);
              setAgree7(false);
              setFinalAgree(false);
              setPaymentMethod("card");
              setIsSubmitting(false);
              setApplicantPageId(null);
              setPaidPageId(null);

              // 모든 모달 상태 초기화
              setShowSafetyModal(false);
              setShowRefundModal(false);
              setShowPrivacyModal(false);
              setShowTermsModal(false);
              setShowVideoModal(false);
              setShowCancellationModal(false);
              setShowWaitlistModal(false);
              setWaitlistClass(null);

              // 페이지 상단으로 스크롤
              window.scrollTo({ top: 0, behavior: "smooth" });

              console.log(
                "[v0] 모든 상태 초기화 완료 및 페이지 상단으로 스크롤",
              );
            }}
          >
            홈으로 돌아가기
          </Button>
        </div>
      )}
      <footer className="bg-[#1a2332] text-gray-400 py-12 mt-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-white text-xl font-bold">블루마인드주식회사</h3>
              <div className="text-sm space-y-1">
                <p>
                  대표자:{" "}
                  <span className="text-gray-300">장연성</span>
                </p>
                <p>
                  사업자등록번호:{" "}
                  <span className="text-gray-300">462-86-02893</span>
                </p>
                <p>
                  통신판매업 신고번호:{" "}
                  <span className="text-gray-300">2023-화성봉담-0317</span>
                </p>
                <p>
                  사업장 주소:{" "}
                  <span className="text-gray-300">경기도 화성시 봉담읍 독정길 45-8, A동 2층 202호</span>
                </p>
                <p>
                  전화:{" "}
                  <span className="text-gray-300">010-3904-1018</span>
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-bold">연락처</h3>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="h-4 w-4" />
                  <p>
                    고객센터: 빠른 상담은 카톡 플러스친구{" "}
                    <span className="text-white font-medium">@스윔잇</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MessageSquare className="h-4 w-4" />
                  <p>
                    이메일:{" "}
                    <span className="text-white">toptier1018@gmail.com</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                  onClick={() =>
                    window.open("https://open.kakao.com/o/pk7VePci", "_blank")
                  }
                >
                  💬 스윔잇 수영 수다방 멤버십 라운지
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                  onClick={() =>
                    window.open("https://cafe.naver.com/swimit", "_blank")
                  }
                >
                  ☕ 스윔잇 수영 저항 제로 카페
                </Button>
              </div>
            </div>
          </div>

          {/* Policy Links */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              <button
                onClick={() => setShowTermsModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                이용약관
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                개인정보처리방침
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={() => setShowRefundModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                환불정책
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={() => setShowSafetyModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                안전 및 면책
              </button>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="text-xs space-y-2 text-gray-500">
            <p>© 2026 Swimit, All rights reserved.</p>
            <p>
              본 사이트의 모든 콘텐츠는 저작권법의 보호를 받으며, 무단 전재 및
              복제를 금합니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
