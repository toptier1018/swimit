/**
 * 특강 카드결제 금액 — 서버가 클래스 키로 결정 (클라이언트 amount 신뢰 금지)
 */

import {
  resolveClassScheduleFromEnrollmentKey,
  type SpecialClassInfo,
} from "@/lib/class-schedule-data";

const DIAGNOSIS_AMOUNT = 40000;
const ZERO_OR_SPECIAL_AMOUNT = 80000;
const LEGACY_SEOCHO_AMOUNT = 70000;

function specialOptionMatches(
  className: string,
  special: SpecialClassInfo,
): boolean {
  return special.classes.some(
    (option) =>
      className.includes(`특강 ${option.key}`) ||
      className.includes(option.name) ||
      new RegExp(`\\b${option.key}\\b`).test(className),
  );
}

/** 활성·과거 특강 키 패턴에 맞는 결제 금액 */
export function resolveClassPaymentAmount(className: string): number | null {
  const name = String(className || "").trim();
  if (!name) return null;

  // 저항 진단 프로그램
  if (/진단/.test(name)) {
    console.log("[금액검증] 진단 프로그램 금액:", {
      className: name,
      amount: DIAGNOSIS_AMOUNT,
    });
    return DIAGNOSIS_AMOUNT;
  }

  // 일정 정본의 specialClass 가격 (예: 목동 10/18 런칭 70,000)
  const resolved = resolveClassScheduleFromEnrollmentKey(name);
  const special = resolved?.schedule.specialClass;
  if (special && specialOptionMatches(name, special)) {
    console.log("[금액검증] 일정별 스페셜 클래스 금액:", {
      className: name,
      classId: resolved.schedule.id,
      specialType: special.specialType,
      amount: special.price,
    });
    return special.price;
  }

  // 서초 등 초기 특강(7만) — 키에 서초가 남은 경우
  if (/서초/.test(name)) {
    console.log("[금액검증] 서초 특강 금액:", {
      className: name,
      amount: LEGACY_SEOCHO_AMOUNT,
    });
    return LEGACY_SEOCHO_AMOUNT;
  }

  // 저항 제로 / 일반 특강
  if (/특강|저항\s*제로|저항제로/.test(name)) {
    console.log("[금액검증] 특강/제로 금액:", {
      className: name,
      amount: ZERO_OR_SPECIAL_AMOUNT,
    });
    return ZERO_OR_SPECIAL_AMOUNT;
  }

  console.warn("[금액검증] 알 수 없는 클래스 — 금액 거부:", name);
  return null;
}
