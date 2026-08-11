/** 카드 결제 후 노션·시트 저장용 (결제창 리다이렉트 사이 임시 보관) */

export const CARD_ENROLLMENT_STORAGE_KEY = "swimit_card_enrollment_pending";

export type PendingCardEnrollment = {
  tossOrderId: string;
  orderNumber: string;
  pageId: string;
  amount: number;
  paymentStartedAt: string;
  sheetTimestamp: string;
  form: {
    name: string;
    phone: string;
    email: string;
    gender: string;
    location: string;
    swimmingExperience: string;
    painAreas: string[];
    message: string;
  };
  selectedClassName: string;
  timeSlot: string;
  sessionLabel: string;
  lane: string;
  classSheetLabel: string;
  classDate: string;
  region: string;
  traffic: Record<string, string>;
};

export function savePendingCardEnrollment(data: PendingCardEnrollment) {
  try {
    sessionStorage.setItem(CARD_ENROLLMENT_STORAGE_KEY, JSON.stringify(data));
    console.log("[카드신청] 임시 저장 완료:", {
      tossOrderId: data.tossOrderId,
      orderNumber: data.orderNumber,
      pageId: data.pageId,
      className: data.selectedClassName,
    });
    return true;
  } catch (error) {
    console.error("[카드신청] 임시 저장 실패:", error);
    return false;
  }
}

export function loadPendingCardEnrollment(
  tossOrderId: string,
): PendingCardEnrollment | null {
  try {
    const raw = sessionStorage.getItem(CARD_ENROLLMENT_STORAGE_KEY);
    if (!raw) {
      console.warn("[카드신청] 임시 저장 데이터 없음");
      return null;
    }
    const parsed = JSON.parse(raw) as PendingCardEnrollment;
    if (parsed.tossOrderId !== tossOrderId) {
      console.warn("[카드신청] 주문번호 불일치:", {
        expected: tossOrderId,
        stored: parsed.tossOrderId,
      });
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("[카드신청] 임시 저장 읽기 실패:", error);
    return null;
  }
}

export function clearPendingCardEnrollment() {
  try {
    sessionStorage.removeItem(CARD_ENROLLMENT_STORAGE_KEY);
    console.log("[카드신청] 임시 저장 삭제");
  } catch (error) {
    console.error("[카드신청] 임시 저장 삭제 실패:", error);
  }
}
