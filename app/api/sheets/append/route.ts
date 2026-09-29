import { NextRequest, NextResponse } from "next/server";
import { appendRowToGoogleSheet } from "@/lib/google-sheets";
import {
  buildSheetScheduleLink,
  resolveClassScheduleFromEnrollmentKey,
} from "@/lib/class-schedule-data";
import {
  isDiagnosisPaymentConsentVersion,
  isResistanceDiagnosisProduct,
  parseContentConsent,
} from "@/lib/resistance-content-consent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[Google Sheets API] 예약 행 추가 요청:", {
      신청번호: body?.신청번호,
      예약상태: body?.예약상태,
      이름: body?.이름,
      classKey: body?.classKey || body?.enrollmentKey || "",
      클라이언트날짜: body?.날짜,
      클라이언트특강지역: body?.특강지역,
      입금기한: body?.입금기한,
      유입경로: body?.유입경로,
      contentConsentVersion: body?.contentConsent?.version || null,
    });

    if (!body?.이름 || !body?.전화번호 || !body?.예약상태) {
      return NextResponse.json(
        {
          success: false,
          error: "이름, 전화번호, 예약상태는 필수입니다.",
        },
        { status: 400 },
      );
    }

    const contentConsent = parseContentConsent(body?.contentConsent);

    if (
      isResistanceDiagnosisProduct({ className: String(body.클래스 || "") }) &&
      (!contentConsent ||
        !isDiagnosisPaymentConsentVersion(contentConsent.version))
    ) {
      console.warn("[Google Sheets API] 저항 진단 촬영 콘텐츠 동의 누락:", {
        신청번호: body?.신청번호,
        클래스: body?.클래스,
      });
      return NextResponse.json(
        {
          success: false,
          error: "촬영 및 콘텐츠 활용 동의가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const classKey = String(body.classKey || body.enrollmentKey || "").trim();
    const resolved = classKey
      ? resolveClassScheduleFromEnrollmentKey(classKey)
      : null;
    const session = String(body.회차 || "").trim();
    const lane = String(body.레인 || "").trim();
    const isoDate = resolved?.isoDate || String(body.날짜 || "").trim();
    const location = resolved?.location || String(body.특강지역 || "").trim();
    const link = isoDate
      ? buildSheetScheduleLink({
          session: session || "1부",
          lane: lane || "미배정",
          isoDate,
        })
      : String(body.링크 || "").trim();

    if (resolved) {
      if (
        body.날짜 &&
        String(body.날짜).trim() &&
        String(body.날짜).trim() !== resolved.isoDate
      ) {
        console.warn(
          "[Google Sheets API] 클라이언트 날짜와 일정 정본이 다름 — 정본 사용:",
          {
            classKey,
            clientDate: body.날짜,
            resolvedDate: resolved.isoDate,
            clientLocation: body.특강지역,
            resolvedLocation: resolved.location,
          },
        );
      }
    } else if (classKey) {
      console.error(
        "[Google Sheets API] classKey로 일정을 확정하지 못함:",
        classKey,
      );
    }

    console.log("[Google Sheets API] 저장 일정 확정:", {
      classKey,
      날짜: isoDate,
      특강지역: location,
      링크: link,
    });

    const result = await appendRowToGoogleSheet({
      접수일시: body.접수일시 ?? "",
      신청번호: body.신청번호 ?? "",
      이름: body.이름 ?? "",
      전화번호: body.전화번호 ?? "",
      이메일: body.이메일 ?? "",
      성별: body.성별 ?? "",
      거주지역: body.거주지역 ?? "",
      수영경력: body.수영경력 ?? "",
      통증부위: body.통증부위 ?? "",
      해결문제: body.해결문제 ?? "",
      클래스: body.클래스 ?? "",
      회차: session,
      레인: lane,
      날짜: isoDate,
      특강지역: location,
      예약상태: body.예약상태 ?? "",
      링크: link,
      입금기한: body.입금기한 ?? "",
      대기순번: body.대기순번 ?? "",
      유입경로: body.유입경로 ?? "",
      video: body.video ?? "",
      source: body.source ?? "",
      utm_source: body.utm_source ?? "",
      utm_medium: body.utm_medium ?? "",
      utm_campaign: body.utm_campaign ?? "",
      contentConsent,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Google Sheets API] 예외:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
