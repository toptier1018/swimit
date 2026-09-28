"use client";

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
  showWaitlist?: boolean;
  onViewWaitlist?: () => void;
};

/**
 * 친구·가족 동반 신청 할인 프로모션 (UI 안내 · 각 5,000원)
 * — 실제 결제금액/Toss 자동 할인과 연결되지 않음. 고객센터 확인 후 수동 처리.
 */
export function CompanionDiscountPromo({
  className = "",
  showWaitlist = false,
  onViewWaitlist,
}: CompanionDiscountPromoProps) {
  return (
    <section
      id={COMPANION_DISCOUNT_SECTION_ID}
      className={`w-full scroll-mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="space-y-2.5">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            상시 혜택
          </div>
          <h3 className="break-keep text-xl font-bold leading-snug text-gray-950 sm:text-2xl">
            <span aria-hidden>🎁 </span>
            스윔잇 특강,
            <br />
            5,000원 할인받는 {showWaitlist ? "2가지 방법" : "방법"}
          </h3>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-gray-400 line-through">80,000원</span>
            <span className="text-3xl font-extrabold tracking-tight text-blue-800">
              75,000원
            </span>
          </p>
          <p className="text-sm leading-6 text-gray-600">
            원하는 방식으로 혜택을 받아보세요.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <span className="rounded-full border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-800">
              저항 진단 제외
            </span>
            <span className="rounded-full border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-800">
              할인 중복 적용 불가
            </span>
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-xl ${
            showWaitlist ? "md:grid md:grid-cols-2" : ""
          }`}
        >
          <div className="space-y-3 bg-blue-50/50 p-4">
            <p className="text-xs font-bold tracking-wide text-blue-700">
              <span aria-hidden>👥 </span>
              수친·가족과 함께
            </p>
            <p className="break-keep text-sm font-semibold leading-6 text-gray-950 sm:text-[15px]">
              같은 일정의 특강을 같이 신청하면
              <br />
              두 분 모두 각각 5,000원 할인
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-white px-2.5 py-1.5 text-sm text-gray-600 shadow-sm">
                본인{" "}
                <span className="font-extrabold text-blue-800">75,000원</span>
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1.5 text-sm text-gray-600 shadow-sm">
                동반인{" "}
                <span className="font-extrabold text-blue-800">75,000원</span>
              </span>
            </div>
            <Button asChild className="h-11 w-full font-bold">
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
            <p className="break-keep text-xs leading-5 text-gray-500">
              결제 전 고객센터에서
              <br />
              두 분의 성함과 신청 일정을 확인해주세요.
            </p>
          </div>

          {showWaitlist ? (
            <div className="space-y-3 border-t border-blue-100 bg-white p-4 md:border-l md:border-t-0">
              <p className="text-xs font-bold tracking-wide text-blue-700">
                <span aria-hidden>📅 </span>
                다음 달 특강을 미리 기다린다면
              </p>
              <p className="break-keep text-sm font-semibold leading-6 text-gray-950 sm:text-[15px]">
                전월 15일까지 예약대기 등록
                <br />
                → 16일 결제 안내 알림톡 + 5,000원 혜택
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800">
                  15일까지 등록
                </span>
                <span className="text-blue-300" aria-hidden>
                  →
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800">
                  16일 안내
                </span>
                <span className="text-blue-300" aria-hidden>
                  →
                </span>
                <span className="rounded-full bg-blue-800 px-2.5 py-1 font-bold text-white">
                  75,000원 결제
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-blue-200 font-bold text-blue-800"
                onClick={() => {
                  console.log("[예약대기할인] 일정으로 이동");
                  onViewWaitlist?.();
                }}
              >
                예약대기 일정 보기 ↓
              </Button>
              <p className="break-keep text-xs leading-5 text-gray-600">
                <span aria-hidden>✨ </span>
                지금은 결제하지 않아요.
                <br />
                안내 후 결제하면 예약이 확정됩니다.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-0.5 text-xs leading-5 text-gray-500">
          <p>※ 저항 진단 프로그램 제외</p>
          <p>※ 두 할인 및 다른 쿠폰 중복 적용 불가</p>
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
                      확인 후 각 75,000원으로 안내
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">카드 결제:</span>{" "}
                      각 80,000원 결제 후 각각 5,000원 부분취소
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
        수친·가족과 함께 신청하면 각각 5,000원 할인
        <span className="font-medium text-blue-700/80"> (진단 제외)</span>
      </span>
    </button>
  );
}
