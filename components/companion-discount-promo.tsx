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
 * 상시 혜택 안내 섹션 (UI 안내만)
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
      <div className="mx-auto max-w-4xl space-y-5">
        {/* 1. 상시 혜택 제목 */}
        <header className="space-y-3">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold tracking-wide text-blue-700 sm:text-xs">
            상시 혜택
          </div>
          <h3 className="break-keep text-[1.35rem] font-bold leading-[1.35] tracking-tight text-gray-950 sm:text-2xl sm:leading-snug">
            스윔잇 특강
            <br />
            <span className="text-blue-800">5,000원 할인</span>받는{" "}
            {showWaitlist ? "2가지 방법" : "방법"}
          </h3>
          <p className="break-keep text-[13px] leading-6 text-gray-700 sm:text-sm sm:leading-6">
            2시간 특강도, 3시간 집중 특강도
            <br />
            결제 금액에서{" "}
            <span className="font-bold text-blue-800">5,000원 할인</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-[11px] font-medium leading-4 text-blue-800 sm:text-xs">
              저항 진단 제외
            </span>
            <span className="rounded-md border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-[11px] font-medium leading-4 text-blue-800 sm:text-xs">
              할인 중복 적용 불가
            </span>
          </div>
        </header>

        {/* 2~4. 동반 할인 / 예약대기 — 모바일은 세로로 자연스럽게 */}
        <div
          className={`overflow-hidden rounded-xl border border-blue-100 ${
            showWaitlist ? "md:grid md:grid-cols-2" : ""
          }`}
        >
          {/* ① 동반 할인 */}
          <article className="space-y-3.5 bg-blue-50/50 p-4 sm:p-5">
            <p className="text-[11px] font-bold tracking-wide text-blue-700 sm:text-xs">
              ① 수친·가족과 함께
            </p>
            <p className="break-keep text-[13px] font-semibold leading-6 text-gray-950 sm:text-[15px] sm:leading-7">
              같은 일정의 특강을 같이 신청하면
              <br />
              두 분 모두 각각{" "}
              <span className="text-blue-800">5,000원 할인</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white px-2.5 py-2.5 text-center shadow-sm">
                <p className="text-[11px] text-gray-500 sm:text-xs">본인</p>
                <p className="mt-0.5 text-base font-extrabold text-blue-800 sm:text-lg">
                  -5,000원
                </p>
              </div>
              <div className="rounded-lg bg-white px-2.5 py-2.5 text-center shadow-sm">
                <p className="text-[11px] text-gray-500 sm:text-xs">동반인</p>
                <p className="mt-0.5 text-base font-extrabold text-blue-800 sm:text-lg">
                  -5,000원
                </p>
              </div>
            </div>

            <Button asChild className="h-12 w-full text-[15px] font-bold sm:h-11 sm:text-base">
              <a
                href={COMPANION_DISCOUNT_KAKAO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  console.log("[상시혜택] 동반 할인 CTA → 카카오 상담");
                }}
              >
                동반 할인 신청하기
              </a>
            </Button>

            <p className="break-keep text-[11px] leading-5 text-gray-500 sm:text-xs sm:leading-5">
              결제 전 고객센터에서
              <br />
              <span className="font-semibold text-gray-700">
                두 분의 성함과 신청 일정
              </span>
              을 확인해주세요.
            </p>
          </article>

          {/* ② 예약대기 할인 */}
          {showWaitlist ? (
            <article className="space-y-3.5 border-t border-blue-100 bg-white p-4 sm:p-5 md:border-l md:border-t-0">
              <p className="text-[11px] font-bold tracking-wide text-blue-700 sm:text-xs">
                ② 다음 달 특강을 미리 기다린다면
              </p>
              <p className="break-keep text-[13px] font-semibold leading-6 text-gray-950 sm:text-[15px] sm:leading-7">
                전월 15일까지
                <br className="sm:hidden" />
                사전 예약대기 등록 하시면
                <br />
                <span className="text-blue-800">5,000원 할인 혜택</span>
              </p>

              {/* 모바일: 세로 3단계 / 데스크톱: 가로 */}
              <ol className="space-y-2 sm:hidden">
                {[
                  { n: "1", label: "15일까지 등록" },
                  { n: "2", label: "16일 안내" },
                  { n: "3", label: "5,000원 할인 적용", strong: true },
                ].map((step) => (
                  <li
                    key={step.n}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold ${
                      step.strong
                        ? "bg-blue-800 text-white"
                        : "bg-blue-50 text-blue-900"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        step.strong
                          ? "bg-white/20 text-white"
                          : "bg-white text-blue-700"
                      }`}
                    >
                      {step.n}
                    </span>
                    {step.label}
                  </li>
                ))}
              </ol>
              <div className="hidden flex-wrap items-center gap-1.5 text-xs sm:flex">
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
                  5,000원 할인 적용
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-blue-200 text-[15px] font-bold text-blue-800 sm:h-11 sm:text-base"
                onClick={() => {
                  console.log("[상시혜택] 예약대기 일정 보기 → 11월 일정");
                  onViewWaitlist?.();
                }}
              >
                예약대기 일정 보기 ↓
              </Button>

              <p className="break-keep text-[11px] leading-5 text-gray-600 sm:text-xs sm:leading-5">
                지금은 결제하지 않아요.
                <br />
                <span className="font-semibold text-gray-800">
                  할인 안내 톡 보내드리면 예약이 확정됩니다.
                </span>
              </p>
            </article>
          ) : null}
        </div>

        <div className="space-y-1 border-t border-blue-50 pt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
          <p>※ 저항 진단 프로그램 제외</p>
          <p>※ 두 할인 및 다른 쿠폰 중복 적용 불가</p>
        </div>

        {/* 5. 신청 방법 및 유의사항 */}
        <Accordion
          type="single"
          collapsible
          className="w-full border-t border-blue-100 pt-0.5"
        >
          <AccordionItem value="companion-discount-details" className="border-0">
            <AccordionTrigger className="py-3.5 text-[13px] font-bold text-blue-800 hover:no-underline sm:text-[15px]">
              신청 방법 및 유의사항 보기
            </AccordionTrigger>
            <AccordionContent className="pb-1">
              <div className="space-y-5 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-4 text-[13px] leading-6 text-gray-800 sm:px-4 sm:py-4 sm:text-[15px] sm:leading-7">
                <div className="space-y-2.5">
                  <p className="font-bold text-blue-900">[신청 방법]</p>
                  <ol className="list-decimal space-y-2 pl-5 text-gray-800">
                    <li className="break-keep pl-0.5">
                      함께 참여할 같은 특강 일정을 선택
                    </li>
                    <li className="break-keep pl-0.5">
                      결제 전 고객센터에
                      <br className="sm:hidden" />
                      두 분의 성함과 신청 일정 전달
                    </li>
                    <li className="break-keep pl-0.5">
                      할인 안내 후 결제
                      <br />
                      <span className="font-semibold text-gray-900">
                        (자동 할인 아님 · 고객센터 확인 후 수동 처리)
                      </span>
                    </li>
                  </ol>
                  <ul className="mt-1 space-y-2 border-t border-blue-100/70 pt-3">
                    <li className="break-keep">
                      <span className="font-semibold text-gray-900">
                        계좌이체
                      </span>
                      <br />
                      <span className="text-gray-700">
                        확인 후 정상가에서 각각 5,000원을 뺀 금액으로 안내
                      </span>
                    </li>
                    <li className="break-keep">
                      <span className="font-semibold text-gray-900">
                        카드 결제
                      </span>
                      <br />
                      <span className="text-gray-700">
                        정상가 결제 후 각각 5,000원 부분취소
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5 border-t border-blue-100/80 pt-4">
                  <p className="font-bold text-blue-900">[유의사항]</p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="break-keep">
                      · 저항 진단 프로그램은 할인 대상이 아닙니다.
                    </li>
                    <li>· 1인 1회 적용</li>
                    <li className="break-keep">
                      · 다른 할인·쿠폰과 중복 적용되지 않습니다.
                    </li>
                    <li className="break-keep">
                      · 한 분이 취소 또는 이월하면
                      <br className="sm:hidden" />
                      동반 할인 혜택도 취소됩니다.
                    </li>
                    <li className="break-keep">
                      · 공지 전 이미 결제한 고객도
                      <br className="sm:hidden" />
                      같은 일정 동반 참여가 확인되면 적용 가능합니다.
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
        console.log("[상시혜택] 한 줄 안내 클릭");
        if (onNavigate) {
          onNavigate();
          return;
        }
        const el = document.getElementById(COMPANION_DISCOUNT_SECTION_ID);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-left text-[12px] font-semibold leading-5 text-blue-800 transition hover:bg-blue-50 sm:w-auto sm:text-sm sm:leading-6"
    >
      <span aria-hidden>👥</span>
      <span className="break-keep">
        수친·가족과 함께 신청하면 각각 5,000원 할인
        <span className="font-medium text-blue-700/80"> (진단 제외)</span>
      </span>
    </button>
  );
}
