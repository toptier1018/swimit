/**
 * 수동 계좌이체(BANK_MANUAL) 전용 할인.
 * Toss CARD/간편결제·TRANSFER에는 절대 적용하지 않는다.
 */

export const BANK_TRANSFER_DISCOUNT_AMOUNT = 5000;
export const BANK_TRANSFER_BENEFIT_NAME = "계좌이체 할인 혜택";

export type BankTransferDiscountInput = {
  /** 클래스 정상가(런칭특가 반영 후 판매가) */
  originalAmount: number;
  /** 결제수단이 수동 계좌이체인지 */
  isBankManual: boolean;
  /** 저항 진단 등 할인 제외 상품 */
  isDiagnosis: boolean;
  /** 런칭특가 등 추가 할인 불가 상품 */
  noExtraDiscount: boolean;
};

export type BankTransferDiscountResult = {
  originalAmount: number;
  discountAmount: number;
  expectedAmount: number;
  benefitName: string;
  applied: boolean;
};

/** 계좌이체 선택 시에만 할인액을 계산한다. 카드/간편결제는 항상 정상가. */
export function resolveBankTransferDiscount(
  input: BankTransferDiscountInput,
): BankTransferDiscountResult {
  const originalAmount = Math.max(0, Number(input.originalAmount) || 0);
  const eligible =
    input.isBankManual &&
    !input.isDiagnosis &&
    !input.noExtraDiscount &&
    originalAmount > BANK_TRANSFER_DISCOUNT_AMOUNT;

  const discountAmount = eligible ? BANK_TRANSFER_DISCOUNT_AMOUNT : 0;
  const expectedAmount = originalAmount - discountAmount;

  console.log("[계좌이체할인] 금액 계산:", {
    isBankManual: input.isBankManual,
    isDiagnosis: input.isDiagnosis,
    noExtraDiscount: input.noExtraDiscount,
    originalAmount,
    discountAmount,
    expectedAmount,
    applied: discountAmount > 0,
  });

  return {
    originalAmount,
    discountAmount,
    expectedAmount,
    benefitName: discountAmount > 0 ? BANK_TRANSFER_BENEFIT_NAME : "",
    applied: discountAmount > 0,
  };
}
