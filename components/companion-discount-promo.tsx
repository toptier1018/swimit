"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const COMPANION_DISCOUNT_SECTION_ID = "companion-discount-section";
export const COMPANION_DISCOUNT_KAKAO_URL =
  "http://pf.kakao.com/_dXUgn/chat";

type CompanionDiscountPromoProps = {
  className?: string;
};

/**
 * 친구·가족 동반 신청 할인 프로모션 (2026년 10월 기준 UI 안내)
 * — 실제 결제금액/Toss 자동 할인과 연결되지 않음. 고객센터 확인 후 수동 처리.
 */
export function CompanionDiscountPromo({
  className = "",
}: CompanionDiscountPromoProps) {
  return (
    <section
      id={COMPANION_DISCOUNT_SECTION_ID}
      className={`w-full scroll-mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        <div className="space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <Users className="h-3.5 w-3.5" aria-hidden />
            상시 이벤트
          </div>

          <h3 className="break-keep text-lg font-bold leading-7 text-gray-950 sm:text-xl sm:leading-8">
            <span className="mr-1" aria-hidden>
              👥
            </span>
            수친·가족과 함께 신청하면
            <br className="sm:hidden" /> 두 분 모두 각각 10,000원 할인
          </h3>

          <p className="break-keep text-sm leading-6 text-gray-700 sm:text-[15px] sm:leading-7">
            같은 일정의{" "}
            <span className="font-bold text-blue-800">저항 제로 특강</span>을
            함께 신청하면
            <br className="sm:hidden" />
            두 사람 모두 각각 10,000원 할인
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:max-w-md">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center sm:px-4 sm:py-3.5">
            <p className="text-xs font-bold text-blue-700 sm:text-sm">본인</p>
            <p className="mt-1 text-xl font-black tracking-tight text-blue-800 sm:text-2xl">
              -10,000원
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center sm:px-4 sm:py-3.5">
            <p className="text-xs font-bold text-blue-700 sm:text-sm">동반인</p>
            <p className="mt-1 text-xl font-black tracking-tight text-blue-800 sm:text-2xl">
              -10,000원
            </p>
          </div>
        </div>

        <p className="break-keep text-center text-sm font-bold leading-6 text-blue-900 sm:text-left sm:text-[15px] sm:leading-7">
          정상가 80,000원 → 각 70,000원
        </p>

        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700 sm:text-sm sm:leading-6">
          ※ 저항 진단 프로그램은 할인 대상이 아닙니다.
        </p>

        <p className="break-keep text-sm leading-6 text-gray-600 sm:text-[15px]">
          다른 할인·쿠폰과 중복 적용되지 않습니다.
        </p>

        <div className="space-y-2">
          <Button
            asChild
            size="lg"
            className="h-12 w-full text-[15px] font-bold sm:h-11 sm:max-w-md sm:text-base"
          >
            <a
              href={COMPANION_DISCOUNT_KAKAO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                console.log("[동반할인] CTA 클릭 → 카카오 상담");
              }}
            >
              동반 할인 신청하기
            </a>
          </Button>
          <p className="break-keep text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
            결제 전 고객센터에서 두 분의 성함과 신청 일정을 확인해주세요.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full border-t border-blue-100 pt-1">
          <AccordionItem value="companion-discount-details" className="border-0">
            <AccordionTrigger className="py-3 text-sm font-bold text-blue-800 hover:no-underline sm:text-[15px]">
              신청 방법 및 유의사항 보기
            </AccordionTrigger>
            <AccordionContent className="pb-1">
              <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3.5 text-sm leading-6 text-gray-800 sm:px-4 sm:py-4 sm:text-[15px] sm:leading-7">
                <div className="space-y-2">
                  <p className="font-bold text-blue-900">[신청 방법]</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-gray-800">
                    <li>함께 참여할 같은 특강 일정을 선택</li>
                    <li>결제 전 고객센터에 두 분의 성함과 신청 일정 전달</li>
                    <li>할인 안내 후 결제 (자동 할인 아님 · 고객센터 확인 후 수동 처리)</li>
                  </ol>
                  <ul className="mt-2 space-y-1 pl-1 text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">계좌이체:</span>{" "}
                      확인 후 각 70,000원으로 안내
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">카드 결제:</span>{" "}
                      각 80,000원 결제 후 각각 10,000원 부분취소
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 border-t border-blue-100/80 pt-3">
                  <p className="font-bold text-blue-900">[유의사항]</p>
                  <ul className="space-y-1.5 pl-1 text-gray-700">
                    <li>· 저항 진단 프로그램은 할인 대상이 아닙니다.</li>
                    <li>· 1인 1회 적용</li>
                    <li>· 다른 할인·쿠폰과 중복 적용되지 않습니다.</li>
                    <li>· 한 분이 취소 또는 이월하면 동반 할인 혜택도 취소</li>
                    <li>
                      · 공지 전 이미 결제한 고객도 같은 일정 동반 참여가 확인되면
                      적용 가능
                    </li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}

/** 일정/결제 근처용 한 줄 안내 (메인 카드 반복 금지) */
export function CompanionDiscountHint({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        console.log("[동반할인] 한 줄 안내 클릭");
        if (onNavigate) {
          onNavigate();
          return;
        }
        const el = document.getElementById(COMPANION_DISCOUNT_SECTION_ID);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-left text-xs font-semibold leading-5 text-blue-800 transition hover:bg-blue-50 sm:w-auto sm:text-sm sm:leading-6"
    >
      <span aria-hidden>👥</span>
      <span className="break-keep">
        수친·가족과 함께 신청하면 각각 10,000원 할인
        <span className="font-medium text-blue-700/80"> (진단 제외)</span>
      </span>
    </button>
  );
}
