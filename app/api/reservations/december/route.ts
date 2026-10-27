import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { appendAdvanceReservationToGoogleSheet } from "@/lib/google-sheets";
import {
  checkGoogleSheetDuplicateForSameClass,
  getOpsSheetEnrollmentCounts,
  formatOpsSheetDateTime,
} from "@/lib/ops-sheet-enrollment";
import { getClassSettingsFromNotion } from "@/lib/schedules";
import {
  CLASS_SCHEDULES,
  DEFAULT_CAPACITY_BY_CLASS,
  toClassScheduleIsoDate,
} from "@/lib/class-schedule-data";
import {
  isDecemberAdvanceReservationOpen,
  isDecemberSchedule,
  resolveDecemberReservation,
} from "@/lib/december-reservation";
import {
  CLASS_VIDEO_CONSENT_VERSION,
  parseContentConsent,
} from "@/lib/resistance-content-consent";

const inputSchema = z.object({
  classId: z.number().int(),
  classKey: z.string().max(150),
  agreed: z.literal(true),
  form: z.object({
    name: z.string().trim().min(2).max(50),
    phone: z
      .string()
      .transform((v) => v.replace(/[^0-9]/g, ""))
      .pipe(z.string().regex(/^01[016789]\d{7,8}$/)),
    email: z.string().max(150).default(""),
    gender: z.string().max(10),
    location: z.string().max(100),
    swimmingExperience: z.string().min(1).max(100),
    painAreas: z.array(z.string().max(100)).max(20),
    message: z.string().max(2000),
  }),
  contentConsent: z.unknown(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "신청 정보와 필수 동의를 확인해 주세요." },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const schedule = CLASS_SCHEDULES.find((item) => item.id === data.classId);
    if (
      schedule &&
      isDecemberSchedule(schedule) &&
      !isDecemberAdvanceReservationOpen(schedule)
    ) {
      console.log("[12월사전예약] API 거절 — 기간 종료, 일반 결제 안내", {
        classId: data.classId,
        classKey: data.classKey,
      });
      return NextResponse.json(
        {
          error:
            "사전예약 기간이 종료되었습니다. 결제 후 신청해 주세요.",
        },
        { status: 400 },
      );
    }

    const offer = resolveDecemberReservation(data.classId, data.classKey);
    if (!offer) {
      return NextResponse.json(
        { error: "예약 가능한 12월 특강·진단이 아닙니다." },
        { status: 400 },
      );
    }

    const consent = parseContentConsent(data.contentConsent);
    if (
      !consent ||
      consent.version !== CLASS_VIDEO_CONSENT_VERSION ||
      consent.className !== data.classKey
    ) {
      return NextResponse.json(
        { error: "영상 촬영 및 활용 동의가 필요합니다." },
        { status: 400 },
      );
    }

    const duplicate = await checkGoogleSheetDuplicateForSameClass({
      ...data.form,
      selectedClass: data.classKey,
    });
    if (!duplicate.success) throw new Error("기존 예약을 확인하지 못했습니다.");
    if (duplicate.hasDuplicate) {
      return NextResponse.json(
        {
          error:
            "이미 같은 특강을 예약하셨습니다. 기존 예약은 고객센터에서 확인해 주세요.",
        },
        { status: 409 },
      );
    }

    const [enrollment, settings] = await Promise.all([
      getOpsSheetEnrollmentCounts(),
      getClassSettingsFromNotion(),
    ]);
    if (!enrollment.success) throw new Error("예약 인원을 확인하지 못했습니다.");

    const capacity =
      settings.thresholds[data.classKey] ??
      DEFAULT_CAPACITY_BY_CLASS[data.classKey];
    const isWaitlist =
      settings.waitlistClasses.includes(data.classKey) ||
      (enrollment.counts[data.classKey] || 0) >= capacity;
    const status = isWaitlist ? "예약대기" : "사전예약";
    const orderNumber = `NR-${randomUUID()}`;

    const confirmedOffer = resolveDecemberReservation(
      data.classId,
      data.classKey,
    );
    if (!confirmedOffer) {
      return NextResponse.json(
        { error: "예약 접수가 종료되었습니다." },
        { status: 400 },
      );
    }

    console.log("[12월사전예약] 시트 저장 시작:", {
      orderNumber,
      classKey: data.classKey,
      sheetClass: confirmedOffer.stroke,
      expectedAmount: confirmedOffer.expectedAmount,
      status,
    });

    const result = await appendAdvanceReservationToGoogleSheet(
      {
        접수일시: formatOpsSheetDateTime(new Date(confirmedOffer.reservedAt)),
        신청번호: orderNumber,
        이름: data.form.name,
        전화번호: data.form.phone,
        이메일: data.form.email,
        성별: data.form.gender === "male" ? "남성" : "여성",
        거주지역: data.form.location,
        수영경력: data.form.swimmingExperience,
        통증부위: data.form.painAreas.join(", "),
        해결문제: data.form.message,
        클래스: confirmedOffer.stroke,
        회차: "1부",
        레인: "",
        날짜: toClassScheduleIsoDate(offer.schedule),
        특강지역: offer.schedule.location,
        예약상태: status,
        입금기한: "",
        contentConsent: {
          ...consent,
          agreedAt: confirmedOffer.reservedAt,
        },
      },
      confirmedOffer,
    );
    if (!result.success) throw new Error(result.error);

    console.log("[12월사전예약] 등록 완료:", {
      orderNumber,
      status,
      expectedAmount: confirmedOffer.expectedAmount,
    });

    return NextResponse.json({
      success: true,
      orderNumber,
      status,
      ...confirmedOffer,
    });
  } catch (error) {
    console.error("[12월 사전예약]", error);
    return NextResponse.json(
      { error: "예약 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
