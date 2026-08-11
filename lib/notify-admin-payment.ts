/**
 * 관리자 결제 알림 — 다음 단계에서 카카오/문자 등 연결 지점
 * 현재는 서버 로그만 (실제 발송 없음, NOTIFIED 상태 저장 안 함)
 */

export type AdminPaymentNotifyPayload = {
  customerName: string;
  phone: string;
  location: string;
  classDate: string;
  className: string;
  amount: number;
  approvedAt: string;
  orderId: string;
  paymentKey: string;
};

export async function notifyAdminPayment(
  payload: AdminPaymentNotifyPayload,
): Promise<void> {
  // TODO(다음 단계): 카카오톡/문자/텔레그램 등 실제 알림 연동
  // 주의: 여기서 "알림 발송 완료"를 Notion에 저장하지 않음 (아직 미발송)
  console.log("[관리자알림] notifyAdminPayment (준비만, 실제 발송 없음):", {
    customerName: payload.customerName,
    phone: payload.phone ? `${payload.phone.slice(0, 3)}****` : "",
    location: payload.location,
    classDate: payload.classDate,
    className: payload.className,
    amount: payload.amount,
    approvedAt: payload.approvedAt,
    orderId: payload.orderId,
    paymentKeyPrefix: payload.paymentKey
      ? `${payload.paymentKey.slice(0, 10)}…`
      : "",
  });
}
