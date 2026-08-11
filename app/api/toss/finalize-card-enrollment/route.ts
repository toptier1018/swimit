import { NextRequest, NextResponse } from "next/server";
import {
  findCardOrderByTossOrderId,
  updatePaymentInNotion,
} from "@/app/actions/notion";
import {
  appendRowToGoogleSheet,
  getSheetOrderNumbers,
} from "@/lib/google-sheets";
import {
  encodeCardPendingStatus,
  parseCardPendingStatus,
} from "@/lib/toss-card-order-meta";

/**
 * 토스 승인 이후 Notion/시트 후처리 (멱등)
 * - 승인 성공 여부와 저장 실패를 분리해서 응답
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";
    const paymentKey =
      typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
    const enrollment = body.enrollment && typeof body.enrollment === "object"
      ? body.enrollment
      : null;

    console.log("[카드후처리] 시작:", {
      orderId,
      paymentKeyPrefix: paymentKey ? `${paymentKey.slice(0, 10)}…` : "",
      hasEnrollment: Boolean(enrollment),
    });

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId가 필요합니다." },
        { status: 400 },
      );
    }

    const found = await findCardOrderByTossOrderId(orderId);
    if (!found.success || !found.pageId || !found.virtualAccountInfo) {
      return NextResponse.json(
        {
          success: false,
          paymentConfirmedUnknown: true,
          error:
            "결제 승인 후 주문을 찾지 못했습니다. 고객센터에 주문번호를 알려 주세요.",
          orderId,
          paymentKey,
        },
        { status: 404 },
      );
    }

    const meta = parseCardPendingStatus(found.virtualAccountInfo);
    if (!meta) {
      return NextResponse.json(
        {
          success: false,
          error: "주문 메타 정보가 올바르지 않습니다.",
          orderId,
          paymentKey,
        },
        { status: 400 },
      );
    }

    // Notion이 아직 PENDING이면 승인이 안 된 것으로 간주 (confirm 선행 필요)
    if (meta.status !== "CARD_DONE") {
      console.warn("[카드후처리] CARD_DONE 아님 — confirm 선행 필요:", meta.status);
      return NextResponse.json(
        {
          success: false,
          error: "아직 결제 승인이 완료되지 않았습니다.",
          code: "NOT_CONFIRMED",
          orderId,
        },
        { status: 409 },
      );
    }

    const orderNumber = meta.orderNumber;
    let notionOk = true;
    let sheetOk = true;
    let sheetSkippedDuplicate = false;
    let notionSkipped = false;

    // Notion은 이미 CARD_DONE — enrollment로 클래스/지역 보강만 필요 시 업데이트
    if (enrollment?.selectedClassName) {
      const mark = await updatePaymentInNotion({
        pageId: found.pageId,
        virtualAccountInfo: encodeCardPendingStatus({
          ...meta,
          status: "CARD_DONE",
          paymentKey: paymentKey || meta.paymentKey,
        }),
        orderNumber,
        selectedClass: String(enrollment.selectedClassName),
        timeSlot: String(enrollment.timeSlot || found.timeSlot || ""),
        region: String(enrollment.region || found.region || ""),
        paymentStartedAt: enrollment.paymentStartedAt,
        traffic: enrollment.traffic,
      });
      if (!mark.success) {
        notionOk = false;
        console.error("[카드후처리] Notion 보강 실패:", mark.error);
      } else {
        notionSkipped = false;
        console.log("[카드후처리] Notion 보강 완료:", orderNumber);
      }
    } else {
      notionSkipped = true;
      console.log("[카드후처리] Notion 이미 CARD_DONE — 보강 스킵");
    }

    // Google Sheets 중복 방지 (신청번호 = WC)
    if (enrollment?.form?.name && enrollment?.form?.phone) {
      const existing = await getSheetOrderNumbers();
      if (existing.success && existing.orderNumbers.has(orderNumber)) {
        sheetSkippedDuplicate = true;
        sheetOk = true;
        console.log("[카드후처리] 시트 중복 스킵:", orderNumber);
      } else {
        const sheetResult = await appendRowToGoogleSheet({
          접수일시: String(enrollment.sheetTimestamp || ""),
          신청번호: orderNumber,
          이름: String(enrollment.form.name),
          전화번호:
            "'" + String(enrollment.form.phone).replace(/-/g, ""),
          이메일: String(enrollment.form.email || ""),
          성별:
            enrollment.form.gender === "male" ? "남성" : "여성",
          거주지역: String(enrollment.form.location || ""),
          수영경력: String(enrollment.form.swimmingExperience || ""),
          통증부위: Array.isArray(enrollment.form.painAreas)
            ? enrollment.form.painAreas.join(", ")
            : "",
          해결문제: String(enrollment.form.message || ""),
          클래스: String(enrollment.classSheetLabel || ""),
          회차: String(enrollment.sessionLabel || ""),
          레인: String(enrollment.lane || ""),
          날짜: String(enrollment.classDate || ""),
          특강지역: String(enrollment.region || ""),
          예약상태: "결제완료",
          ...(enrollment.traffic || {}),
        });
        if (!sheetResult.success) {
          sheetOk = false;
          console.error("[카드후처리] 시트 저장 실패:", sheetResult.error);
        } else {
          console.log("[카드후처리] 시트 저장 완료:", orderNumber);
        }
      }
    } else {
      console.warn(
        "[카드후처리] enrollment 없음 — 시트 저장 스킵 (결제는 승인됨)",
        { orderId, orderNumber },
      );
      sheetOk = false;
    }

    const enrollSaved = notionOk && (sheetOk || sheetSkippedDuplicate);

    return NextResponse.json({
      success: true,
      paymentApproved: true,
      enrollSaved,
      notionOk,
      sheetOk,
      sheetSkippedDuplicate,
      notionSkipped,
      orderId,
      orderNumber,
      paymentKey: paymentKey || meta.paymentKey || "",
      amount: meta.amount,
      // 저장만 실패한 경우 복구용
      recoveryHint:
        enrollSaved
          ? null
          : {
              message:
                "결제는 승인됐지만 신청 저장에 문제가 있을 수 있습니다. 주문번호를 보관해 주세요.",
              orderId,
              orderNumber,
              paymentKey: paymentKey || meta.paymentKey || "",
              amount: meta.amount,
            },
    });
  } catch (error) {
    console.error("[카드후처리] 예외:", error);
    return NextResponse.json(
      {
        success: false,
        error: "후처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
