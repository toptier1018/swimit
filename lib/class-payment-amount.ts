/**
 * 특강 카드결제 금액 — 서버가 클래스 키로 결정 (클라이언트 amount 신뢰 금지)
 */

import {
  isStartTurnEnrollmentKey,
  matchesSpecialClassOption,
  resolveClassScheduleFromEnrollmentKey,
} from "@/lib/class-schedule-data";
import { resolveNovemberOpenBenefit } from "@/lib/november-reservation";

/** 저항 진단 프로그램 정상가 (사전예약 할인은 december-reservation에서 처리) */
export const DIAGNOSIS_BASE_AMOUNT = 40000;
const ZERO_OR_SPECIAL_AMOUNT = 80000;
const LEGACY_SEOCHO_AMOUNT = 70000;

/** 정상가(이벤트 할인 전) */
export function resolveClassBasePaymentAmount(
  className: string,
): number | null {
  const name = String(className || "").trim();
  if (!name) return null;

  // 저항 진단 프로그램 — 정상가 40,000원 (사전예약 할인은 별도 플로우)
  if (/진단/.test(name)) {
    return DIAGNOSIS_BASE_AMOUNT;
  }

  const resolved = resolveClassScheduleFromEnrollmentKey(name);
  const specialCandidates = [
    resolved?.schedule.specialClass,
    resolved?.schedule.addonSpecialClass,
  ].filter(Boolean);
  for (const special of specialCandidates) {
    if (!special || !matchesSpecialClassOption(name, special)) continue;
    return special.price;
  }

  if (/서초/.test(name)) return LEGACY_SEOCHO_AMOUNT;

  if (/특강|저항\s*제로|저항제로/.test(name)) {
    return ZERO_OR_SPECIAL_AMOUNT;
  }

  return null;
}

/** 활성·과거 특강 키 패턴에 맞는 결제 금액 (11월 오픈 한정 할인 반영) */
export function resolveClassPaymentAmount(className: string): number | null {
  const name = String(className || "").trim();
  if (!name) return null;

  const base = resolveClassBasePaymentAmount(name);
  if (base == null) {
    console.warn("[금액검증] 알 수 없는 클래스 — 금액 거부:", name);
    return null;
  }

  if (/진단/.test(name)) {
    console.log("[금액검증] 진단 프로그램 금액:", {
      className: name,
      amount: base,
    });
    return base;
  }

  const benefit = resolveNovemberOpenBenefit(name, base);
  const amount = benefit ? benefit.expectedAmount : base;
  console.log("[금액검증] 클래스 결제 금액:", {
    className: name,
    base,
    openDiscount: benefit?.discountAmount ?? 0,
    amount,
    startTurn: isStartTurnEnrollmentKey(name),
  });
  return amount;
}
