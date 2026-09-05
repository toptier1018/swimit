/**
 * 카드결제 주문 메타
 * - 사람용 상태: Notion「가상계좌 입금 정보」→ 결제대기 / 결제완료
 * - 기계용 메타: Notion「카드결제 메타」→ orderId·금액·멱등키·관리자알림 등
 */

export type AdminNotifyStatus = "ADMIN_NOTIFYING" | "ADMIN_NOTIFIED";
export type SheetWriteStatus = "SHEET_WRITING" | "SHEET_WRITTEN";

export type CardPendingMeta = {
  status: "CARD_PENDING" | "CARD_DONE";
  tossOrderId: string;
  amount: number;
  /** 시트·노션 주문번호 — 신규 카드는 tossOrderId(CLASS-…)와 동일 */
  orderNumber: string;
  idempotencyKey: string;
  paymentKey?: string;
  /** 관리자 카카오 알림 중복 방지 */
  adminNotify?: AdminNotifyStatus;
  /** ADMIN_NOTIFYING 시작 또는 ADMIN_NOTIFIED 시각 (ISO) */
  adminNotifyAt?: string;
  /** 시트 중복 저장 방지 */
  sheetWrite?: SheetWriteStatus;
  /** 시트 쓰기 클레임 ID — 마지막 기록만 실제 append */
  sheetWriteClaim?: string;
  /** SHEET_WRITING 시작 시각 (ISO) */
  sheetWriteAt?: string;
  /** 저항 진단 촬영 콘텐츠 활용 동의 */
  contentConsent?: true;
  contentConsentAt?: string;
  contentConsentVersion?: string;
};

export const CARD_META_PROPERTY_NAME = "카드결제 메타";

const META_PREFIX = "SWIMIT_CARD";

/** ADMIN_NOTIFYING 소프트락 TTL — 이 시간이 지나면 재시도 허용 (영구 잠금 방지) */
export const ADMIN_NOTIFYING_TTL_MS = 90_000;
/** SHEET_WRITING 소프트락 TTL */
export const SHEET_WRITING_TTL_MS = 30_000;

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
  if (meta.sheetWrite) {
    parts.push(`sw=${meta.sheetWrite}`);
  }
  if (meta.sheetWriteClaim) {
    parts.push(`sc=${meta.sheetWriteClaim}`);
  }
  if (meta.sheetWriteAt) {
    parts.push(`swt=${meta.sheetWriteAt}`);
  }
  if (meta.contentConsent) {
    parts.push("cc=1");
  }
  if (meta.contentConsentAt) {
    parts.push(`cca=${meta.contentConsentAt}`);
  }
  if (meta.contentConsentVersion) {
    parts.push(`ccv=${meta.contentConsentVersion}`);
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
  const swRaw = text.match(/sw=([^|]+)/)?.[1]?.trim();
  const sc = text.match(/sc=([^|]+)/)?.[1]?.trim();
  const swt = text.match(/swt=([^|]+)/)?.[1]?.trim();
  const contentConsentRaw = text.match(/cc=([^|]+)/)?.[1]?.trim();
  const contentConsentAt = text.match(/cca=([^|]+)/)?.[1]?.trim();
  const contentConsentVersion = text.match(/ccv=([^|]+)/)?.[1]?.trim();
  const status: CardPendingMeta["status"] = text.includes("CARD_DONE")
    ? "CARD_DONE"
    : "CARD_PENDING";

  if (!toss || !ik || !Number.isFinite(amt) || amt <= 0) {
    console.warn("[카드주문] 메타 파싱 실패:", text.slice(0, 120));
    return null;
  }

  const adminNotify: AdminNotifyStatus | undefined =
    anRaw === "ADMIN_NOTIFIED" || anRaw === "ADMIN_NOTIFYING"
      ? anRaw
      : undefined;

  const sheetWrite: SheetWriteStatus | undefined =
    swRaw === "SHEET_WRITTEN" || swRaw === "SHEET_WRITING"
      ? swRaw
      : undefined;

  return {
    status,
    tossOrderId: toss,
    amount: amt,
    // 구버전: wc=WC-… / 신규: wc=CLASS-… 또는 wc 없음 → toss와 동일
    orderNumber: wc || toss,
    idempotencyKey: ik,
    paymentKey: pk || undefined,
    adminNotify,
    adminNotifyAt: ant || undefined,
    sheetWrite,
    sheetWriteClaim: sc || undefined,
    sheetWriteAt: swt || undefined,
    contentConsent: contentConsentRaw === "1" ? true : undefined,
    contentConsentAt: contentConsentAt || undefined,
    contentConsentVersion: contentConsentVersion || undefined,
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

/**
 * 시트에 이미 썼거나, 다른 프로세스가 쓰는 중이면 skip
 * WRITING이 TTL을 넘으면 재시도 허용
 */
export function shouldSkipSheetWrite(meta: CardPendingMeta): {
  skip: boolean;
  reason?: string;
} {
  if (meta.sheetWrite === "SHEET_WRITTEN") {
    return { skip: true, reason: "already_written" };
  }
  if (meta.sheetWrite === "SHEET_WRITING") {
    const started = meta.sheetWriteAt ? Date.parse(meta.sheetWriteAt) : NaN;
    if (Number.isFinite(started)) {
      const age = Date.now() - started;
      if (age >= 0 && age < SHEET_WRITING_TTL_MS) {
        return { skip: true, reason: "write_in_progress" };
      }
      console.warn("[카드후처리] SHEET_WRITING TTL 만료 — 재시도 허용:", {
        orderNumber: meta.orderNumber,
        ageMs: age,
      });
      return { skip: false, reason: "writing_stale" };
    }
    return { skip: false, reason: "writing_without_timestamp" };
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
