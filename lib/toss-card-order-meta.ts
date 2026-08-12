/**
 * 카드결제 주문 메타
 * - 사람용 상태: Notion「가상계좌 입금 정보」→ 결제대기 / 결제완료
 * - 기계용 메타: Notion「카드결제 메타」→ orderId·금액·멱등키·관리자알림 등
 */

export type AdminNotifyStatus = "ADMIN_NOTIFYING" | "ADMIN_NOTIFIED";

export type CardPendingMeta = {
  status: "CARD_PENDING" | "CARD_DONE";
  tossOrderId: string;
  amount: number;
  orderNumber: string;
  idempotencyKey: string;
  paymentKey?: string;
  /** 관리자 카카오 알림 중복 방지 */
  adminNotify?: AdminNotifyStatus;
  /** ADMIN_NOTIFYING 시작 또는 ADMIN_NOTIFIED 시각 (ISO) */
  adminNotifyAt?: string;
};

export const CARD_META_PROPERTY_NAME = "카드결제 메타";

const META_PREFIX = "SWIMIT_CARD";

/** ADMIN_NOTIFYING 소프트락 TTL — 이 시간이 지나면 재시도 허용 (영구 잠금 방지) */
export const ADMIN_NOTIFYING_TTL_MS = 90_000;

/** 노션「가상계좌 입금 정보」에 넣을 짧은 상태 */
export function humanCardPaymentLabel(
  meta: Pick<CardPendingMeta, "status">,
): string {
  return meta.status === "CARD_DONE" ? "결제완료" : "결제대기";
}

/** 노션「카드결제 메타」에 넣을 기계용 문자열 */
export function encodeCardPendingStatus(meta: CardPendingMeta): string {
  const parts = [
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
  if (meta.adminNotify) {
    parts.push(`an=${meta.adminNotify}`);
  }
  if (meta.adminNotifyAt) {
    parts.push(`ant=${meta.adminNotifyAt}`);
  }
  return parts.join("|");
}

/** updatePaymentInNotion용 — 사람용 + 기계용 한 번에 */
export function toNotionCardStatusFields(meta: CardPendingMeta): {
  virtualAccountInfo: string;
  cardPaymentMeta: string;
} {
  return {
    virtualAccountInfo: humanCardPaymentLabel(meta),
    cardPaymentMeta: encodeCardPendingStatus(meta),
  };
}

/**
 * 새 컬럼(카드결제 메타) 우선, 없으면 예전처럼「가상계좌 입금 정보」에서 파싱
 */
export function resolveCardMetaRaw(
  cardPaymentMeta?: string | null,
  virtualAccountInfo?: string | null,
): string {
  const metaCol = String(cardPaymentMeta || "").trim();
  if (metaCol.includes(META_PREFIX)) return metaCol;
  const statusCol = String(virtualAccountInfo || "").trim();
  if (statusCol.includes(META_PREFIX)) return statusCol;
  return metaCol || statusCol;
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
  const anRaw = text.match(/an=([^|]+)/)?.[1]?.trim();
  const ant = text.match(/ant=([^|]+)/)?.[1]?.trim();
  const status: CardPendingMeta["status"] = text.includes("CARD_DONE")
    ? "CARD_DONE"
    : "CARD_PENDING";

  if (!toss || !wc || !ik || !Number.isFinite(amt) || amt <= 0) {
    console.warn("[카드주문] 메타 파싱 실패:", text.slice(0, 120));
    return null;
  }

  const adminNotify: AdminNotifyStatus | undefined =
    anRaw === "ADMIN_NOTIFIED" || anRaw === "ADMIN_NOTIFYING"
      ? anRaw
      : undefined;

  return {
    status,
    tossOrderId: toss,
    amount: amt,
    orderNumber: wc,
    idempotencyKey: ik,
    paymentKey: pk || undefined,
    adminNotify,
    adminNotifyAt: ant || undefined,
  };
}

/**
 * 이미 알림 완료이거나, 진행 중 소프트락이 유효하면 true (발송 skip)
 * NOTIFYING이 TTL을 넘으면 false → 재시도 허용 (영구 잠금 방지)
 */
export function shouldSkipAdminNotify(meta: CardPendingMeta): {
  skip: boolean;
  reason?: string;
} {
  if (meta.adminNotify === "ADMIN_NOTIFIED") {
    return { skip: true, reason: "already_notified" };
  }
  if (meta.adminNotify === "ADMIN_NOTIFYING") {
    const started = meta.adminNotifyAt
      ? Date.parse(meta.adminNotifyAt)
      : NaN;
    if (Number.isFinite(started)) {
      const age = Date.now() - started;
      if (age >= 0 && age < ADMIN_NOTIFYING_TTL_MS) {
        return { skip: true, reason: "notify_in_progress" };
      }
      console.warn(
        "[관리자알림] ADMIN_NOTIFYING TTL 만료 — 재시도 허용:",
        { orderNumber: meta.orderNumber, ageMs: age },
      );
      return { skip: false, reason: "notifying_stale" };
    }
    // 시각 없으면 안전하게 재시도 허용 (영구 잠금 방지)
    return { skip: false, reason: "notifying_without_timestamp" };
  }
  return { skip: false };
}

/** Notion rich_text → plain */
export function notionRichTextPlain(prop: unknown): string {
  const rich = (prop as { rich_text?: Array<{ plain_text?: string }> })
    ?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((t) => t.plain_text || "").join("").trim();
}
