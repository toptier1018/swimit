/**
 * Toss Payment 조회 (웹훅 진위 확인용)
 * GET /v1/payments/{paymentKey}
 */

export type TossPaymentQueryResult = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  orderName?: string;
  method?: string;
  approvedAt?: string;
  raw?: Record<string, unknown>;
};

function getBasicAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function fetchTossPaymentByKey(
  paymentKey: string,
): Promise<
  | { success: true; payment: TossPaymentQueryResult }
  | { success: false; error: string; status?: number }
> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: "TOSS_SECRET_KEY 미설정" };
  }
  if (!paymentKey) {
    return { success: false, error: "paymentKey 누락" };
  }

  console.log("[Toss조회] paymentKey로 결제 조회:", {
    paymentKeyPrefix: `${paymentKey.slice(0, 10)}…`,
  });

  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    {
      method: "GET",
      headers: {
        Authorization: getBasicAuthHeader(secretKey),
      },
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[Toss조회] 실패:", {
      status: res.status,
      code: data?.code,
      message: data?.message,
    });
    return {
      success: false,
      error: data?.message || "결제 조회에 실패했습니다.",
      status: res.status,
    };
  }

  const payment: TossPaymentQueryResult = {
    paymentKey: String(data.paymentKey || paymentKey),
    orderId: String(data.orderId || ""),
    totalAmount: Number(data.totalAmount),
    status: String(data.status || ""),
    orderName: data.orderName ? String(data.orderName) : undefined,
    method: data.method ? String(data.method) : undefined,
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    raw: data as Record<string, unknown>,
  };

  console.log("[Toss조회] 성공:", {
    orderId: payment.orderId,
    status: payment.status,
    totalAmount: payment.totalAmount,
  });

  return { success: true, payment };
}
