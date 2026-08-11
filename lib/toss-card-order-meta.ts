/**
 * 카드결제 대기 주문을 Notion「가상계좌 입금 정보」에 안전하게 인코딩
 * (스키마 추가 없이 orderId·금액·멱등키를 서버에서 다시 읽기 위함)
 */

export type CardPendingMeta = {
  status: "CARD_PENDING" | "CARD_DONE";
  tossOrderId: string;
  amount: number;
  orderNumber: string;
  idempotencyKey: string;
  paymentKey?: string;
};

const META_PREFIX = "SWIMIT_CARD";

export function encodeCardPendingStatus(meta: CardPendingMeta): string {
  // 사람이 읽기 쉬운 앞부분 + 파싱용 토큰
  const label =
    meta.status === "CARD_DONE" ? "결제완료" : "결제대기(카드)";
  const parts = [
    label,
    META_PREFIX,
    meta.status,
    `toss=${meta.tossOrderId}`,
    `amt=${meta.amount}`,
    `wc=${meta.orderNumber}`,
    `ik=${meta.idempotencyKey}`,
  ];
  if (meta.paymentKey) {
    parts.push(`pk=${meta.paymentKey}`);
  }
  return parts.join("|");
}

export function parseCardPendingStatus(
  raw: string | null | undefined,
): CardPendingMeta | null {
  const text = String(raw || "").trim();
  if (!text || !text.includes(META_PREFIX)) return null;

  const toss = text.match(/toss=([^|]+)/)?.[1]?.trim();
  const amt = Number(text.match(/amt=([^|]+)/)?.[1]);
  const wc = text.match(/wc=([^|]+)/)?.[1]?.trim();
  const ik = text.match(/ik=([^|]+)/)?.[1]?.trim();
  const pk = text.match(/pk=([^|]+)/)?.[1]?.trim();
  const status: CardPendingMeta["status"] = text.includes("CARD_DONE")
    ? "CARD_DONE"
    : "CARD_PENDING";

  if (!toss || !wc || !ik || !Number.isFinite(amt) || amt <= 0) {
    console.warn("[카드주문] 메타 파싱 실패:", text.slice(0, 120));
    return null;
  }

  return {
    status,
    tossOrderId: toss,
    amount: amt,
    orderNumber: wc,
    idempotencyKey: ik,
    paymentKey: pk || undefined,
  };
}

/** Notion rich_text → plain */
export function notionRichTextPlain(prop: unknown): string {
  const rich = (prop as { rich_text?: Array<{ plain_text?: string }> })
    ?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((t) => t.plain_text || "").join("").trim();
}
