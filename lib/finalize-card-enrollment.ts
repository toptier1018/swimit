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
  type CardPendingMeta,
} from "@/lib/toss-card-order-meta";

export type FinalizeEnrollmentInput = {
  orderId: string;
  paymentKey?: string;
  /** success 경로: sessionStorage. 웹훅: null → Notion에서 복구 */
  enrollment?: {
    sheetTimestamp?: string;
    paymentStartedAt?: string;
    form?: {
      name?: string;
      phone?: string;
      email?: string;
      gender?: string;
      location?: string;
      swimmingExperience?: string;
      painAreas?: string[] | string;
      message?: string;
    };
    selectedClassName?: string;
    timeSlot?: string;
    sessionLabel?: string;
    lane?: string;
    classSheetLabel?: string;
    classDate?: string;
    region?: string;
    traffic?: Record<string, string>;
  } | null;
  /** 웹훅에서 CARD_PENDING → DONE 승격 허용 */
  allowMarkDoneFromWebhook?: boolean;
  approvedAt?: string;
};

export type FinalizeEnrollmentResult = {
  success: boolean;
  paymentApproved?: boolean;
  enrollSaved?: boolean;
  notionOk?: boolean;
  sheetOk?: boolean;
  sheetSkippedDuplicate?: boolean;
  notionSkipped?: boolean;
  markedDoneFromPending?: boolean;
  orderId: string;
  orderNumber?: string;
  paymentKey?: string;
  amount?: number;
  customerName?: string;
  phone?: string;
  location?: string;
  className?: string;
  classDate?: string;
  error?: string;
  code?: string;
  recoveryHint?: {
    message: string;
    orderId: string;
    orderNumber: string;
    paymentKey: string;
    amount: number;
  } | null;
};

/** 현재 create-class-test-order: CLASS-{uuid} / 구버전 CLASS-TEST- */
export function isSwimmitClassCardOrderId(orderId: string): boolean {
  const id = String(orderId || "").trim();
  return id.startsWith("CLASS-");
}

function painAreasToString(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return "";
}

function genderToSheet(gender: string): string {
  if (gender === "male" || gender === "남성") return "남성";
  if (gender === "female" || gender === "여성") return "여성";
  return gender || "";
}

function sessionFromTimeSlot(timeSlot: string): string {
  const matched = timeSlot.match(/\d+부/);
  return matched?.[0] ?? timeSlot;
}

function classSheetLabelFromSelected(selectedClass: string): string {
  if (/진단/.test(selectedClass)) return "진단";
  const stroke = selectedClass.match(/(자유형|평영|접영)/)?.[1];
  return stroke || selectedClass;
}

/**
 * Confirm 이후(또는 웹훅 DONE) Notion/시트 멱등 후처리
 * success·webhook 공통
 */
export async function finalizeCardEnrollmentCore(
  input: FinalizeEnrollmentInput,
): Promise<FinalizeEnrollmentResult> {
  const orderId = String(input.orderId || "").trim();
  const paymentKey = String(input.paymentKey || "").trim();

  console.log("[카드후처리] 코어 시작:", {
    orderId,
    paymentKeyPrefix: paymentKey ? `${paymentKey.slice(0, 10)}…` : "",
    hasEnrollment: Boolean(input.enrollment),
    allowMarkDoneFromWebhook: Boolean(input.allowMarkDoneFromWebhook),
  });

  if (!orderId) {
    return { success: false, orderId: "", error: "orderId가 필요합니다." };
  }

  const found = await findCardOrderByTossOrderId(orderId);
  if (!found.success || !found.pageId || !found.virtualAccountInfo) {
    return {
      success: false,
      orderId,
      paymentKey,
      error:
        "결제 승인 후 주문을 찾지 못했습니다. 고객센터에 주문번호를 알려 주세요.",
      code: "ORDER_NOT_FOUND",
    };
  }

  let meta = parseCardPendingStatus(found.virtualAccountInfo);
  if (!meta || meta.tossOrderId !== orderId) {
    return {
      success: false,
      orderId,
      paymentKey,
      error: "주문 메타 정보가 올바르지 않습니다.",
      code: "ORDER_META_INVALID",
    };
  }

  let markedDoneFromPending = false;

  // 웹훅: Toss DONE인데 Notion이 아직 PENDING이면 승격
  if (
    meta.status === "CARD_PENDING" &&
    input.allowMarkDoneFromWebhook &&
    paymentKey
  ) {
    const doneMeta: CardPendingMeta = {
      ...meta,
      status: "CARD_DONE",
      paymentKey,
    };
    const mark = await updatePaymentInNotion({
      pageId: found.pageId,
      virtualAccountInfo: encodeCardPendingStatus(doneMeta),
      orderNumber: meta.orderNumber,
      selectedClass: found.selectedClass || meta.tossOrderId,
      timeSlot: found.timeSlot || "",
      region: found.region || "",
    });
    if (!mark.success) {
      console.error("[카드후처리] PENDING→DONE 승격 실패:", mark.error);
      return {
        success: false,
        orderId,
        paymentKey,
        amount: meta.amount,
        orderNumber: meta.orderNumber,
        error: "Notion 결제완료 표시에 실패했습니다.",
        code: "MARK_DONE_FAILED",
      };
    }
    meta = doneMeta;
    markedDoneFromPending = true;
    console.log("[카드후처리] 웹훅으로 CARD_DONE 승격:", orderId);
  }

  if (meta.status !== "CARD_DONE") {
    console.warn("[카드후처리] CARD_DONE 아님:", meta.status);
    return {
      success: false,
      orderId,
      paymentKey,
      orderNumber: meta.orderNumber,
      amount: meta.amount,
      error: "아직 결제 승인이 완료되지 않았습니다.",
      code: "NOT_CONFIRMED",
    };
  }

  const orderNumber = meta.orderNumber;
  const enrollment = input.enrollment;
  const applicant = found.applicant;

  const customerName =
    enrollment?.form?.name?.trim() || applicant?.name || "";
  const phone =
    enrollment?.form?.phone?.trim() || applicant?.phone || "";
  const email =
    enrollment?.form?.email?.trim() || applicant?.email || "";
  const genderRaw =
    enrollment?.form?.gender?.trim() || applicant?.gender || "";
  const location =
    enrollment?.form?.location?.trim() ||
    applicant?.location ||
    found.region ||
    "";
  const swimmingExperience =
    enrollment?.form?.swimmingExperience?.trim() ||
    applicant?.swimmingExperience ||
    "";
  const painAreas = painAreasToString(
    enrollment?.form?.painAreas ?? applicant?.painAreas ?? "",
  );
  const message =
    enrollment?.form?.message?.trim() || applicant?.message || "";
  const selectedClassName =
    enrollment?.selectedClassName?.trim() ||
    found.selectedClass ||
    "";
  const timeSlot =
    enrollment?.timeSlot?.trim() || found.timeSlot || "";
  const region =
    enrollment?.region?.trim() || found.region || location || "";
  const classSheetLabel =
    enrollment?.classSheetLabel?.trim() ||
    classSheetLabelFromSelected(selectedClassName);
  const sessionLabel =
    enrollment?.sessionLabel?.trim() || sessionFromTimeSlot(timeSlot);
  const lane = enrollment?.lane?.trim() || "";
  const classDate = enrollment?.classDate?.trim() || "";
  const sheetTimestamp =
    enrollment?.sheetTimestamp?.trim() ||
    new Date().toISOString().replace("T", " ").slice(0, 19);
  const traffic = enrollment?.traffic || {};

  let notionOk = true;
  let sheetOk = true;
  let sheetSkippedDuplicate = false;
  let notionSkipped = false;

  if (selectedClassName) {
    const mark = await updatePaymentInNotion({
      pageId: found.pageId,
      virtualAccountInfo: encodeCardPendingStatus({
        ...meta,
        status: "CARD_DONE",
        paymentKey: paymentKey || meta.paymentKey,
      }),
      orderNumber,
      selectedClass: selectedClassName,
      timeSlot: timeSlot || found.timeSlot || "",
      region: region || found.region || "",
      paymentStartedAt: enrollment?.paymentStartedAt,
      traffic: Object.keys(traffic).length ? traffic : undefined,
    });
    if (!mark.success) {
      notionOk = false;
      console.error("[카드후처리] Notion 보강 실패:", mark.error);
    } else {
      console.log("[카드후처리] Notion 보강/유지 완료:", orderNumber);
    }
  } else {
    notionSkipped = true;
    console.log("[카드후처리] 클래스명 없음 — Notion 보강 스킵");
  }

  if (customerName && phone) {
    const existing = await getSheetOrderNumbers();
    if (existing.success && existing.orderNumbers.has(orderNumber)) {
      sheetSkippedDuplicate = true;
      sheetOk = true;
      console.log("[카드후처리] 시트 중복 스킵:", orderNumber);
    } else {
      const sheetResult = await appendRowToGoogleSheet({
        접수일시: sheetTimestamp,
        신청번호: orderNumber,
        이름: customerName,
        전화번호: "'" + phone.replace(/-/g, ""),
        이메일: email,
        성별: genderToSheet(genderRaw),
        거주지역: location,
        수영경력: swimmingExperience,
        통증부위: painAreas,
        해결문제: message,
        클래스: classSheetLabel,
        회차: sessionLabel,
        레인: lane,
        날짜: classDate,
        특강지역: region,
        예약상태: "결제완료",
        ...traffic,
      });
      if (!sheetResult.success) {
        sheetOk = false;
        console.error("[카드후처리] 시트 저장 실패:", sheetResult.error);
      } else {
        console.log("[카드후처리] 시트 저장 완료:", orderNumber);
      }
    }
  } else {
    console.warn("[카드후처리] 이름/전화 부족 — 시트 저장 스킵", {
      orderId,
      orderNumber,
    });
    sheetOk = false;
  }

  const enrollSaved = notionOk && (sheetOk || sheetSkippedDuplicate);

  return {
    success: true,
    paymentApproved: true,
    enrollSaved,
    notionOk,
    sheetOk,
    sheetSkippedDuplicate,
    notionSkipped,
    markedDoneFromPending,
    orderId,
    orderNumber,
    paymentKey: paymentKey || meta.paymentKey || "",
    amount: meta.amount,
    customerName,
    phone,
    location: region || location,
    className: selectedClassName,
    classDate,
    recoveryHint: enrollSaved
      ? null
      : {
          message:
            "결제는 승인됐지만 신청 저장에 문제가 있을 수 있습니다. 주문번호를 보관해 주세요.",
          orderId,
          orderNumber,
          paymentKey: paymentKey || meta.paymentKey || "",
          amount: meta.amount,
        },
  };
}
