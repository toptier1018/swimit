"use client";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DECEMBER_BENEFIT_AMOUNT,
  DECEMBER_DIAGNOSIS_BASE_AMOUNT,
} from "@/lib/december-reservation";
import { DIAGNOSIS_BASE_AMOUNT } from "@/lib/class-payment-amount";

export const DIAGNOSIS_ADVANCE_PRICE =
  DECEMBER_DIAGNOSIS_BASE_AMOUNT - DECEMBER_BENEFIT_AMOUNT;

type DiagnosisProgramSectionProps = {
  onReserveDiagnosis: () => void;
  onViewSpecialSchedule: () => void;
  advanceOpen?: boolean;
  showVideo?: boolean;
  showCompare?: boolean;
  showFaq?: boolean;
  embedUrl?: string;
  className?: string;
  /** 섹션 id — 스크롤 앵커 */
  id?: string;
};

const BENEFIT_CARDS = [
  {
    number: "4가지",
    title: "영법 모두 촬영",
    detail: "자유형·배영·평영·접영",
  },
  {
    number: "2가지",
    title: "어항샷 촬영",
    detail: "4가지 영법 중 2가지",
  },
  {
    number: "1가지",
    title: "저항분석리포트",
    detail: "한 가지 영법 집중 분석",
  },
  {
    number: "2시간",
    title: "자유수영",
    detail: "개인 촬영 가능",
  },
] as const;

/** 사전예약/정상가 표시 — 화면 금액과 결제 정책이 같아야 함 */
export function DiagnosisPriceBlock({
  advanceOpen = false,
  className = "",
}: {
  advanceOpen?: boolean;
  className?: string;
}) {
  if (advanceOpen) {
    console.log("[저항진단] 사전예약가 표시", {
      list: DIAGNOSIS_BASE_AMOUNT,
      advance: DIAGNOSIS_ADVANCE_PRICE,
      discount: DECEMBER_BENEFIT_AMOUNT,
    });
    return (
      <div
        className={`rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3.5 ${className}`}
      >
        <p className="text-xs font-bold tracking-wide text-blue-700">
          사전예약 혜택
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm text-gray-500 line-through">
            {DIAGNOSIS_BASE_AMOUNT.toLocaleString()}원
          </span>
          <span className="text-xl font-extrabold text-blue-800 sm:text-2xl">
            {DIAGNOSIS_ADVANCE_PRICE.toLocaleString()}원
          </span>
        </div>
        <p className="mt-1 text-sm font-bold text-blue-700">
          {DECEMBER_BENEFIT_AMOUNT.toLocaleString()}원 할인
        </p>
      </div>
    );
  }

  console.log("[저항진단] 정상가 표시", { list: DIAGNOSIS_BASE_AMOUNT });
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3.5 ${className}`}
    >
      <p className="text-xs font-bold tracking-wide text-slate-600">정상가</p>
      <p className="mt-1 text-xl font-extrabold text-gray-950 sm:text-2xl">
        {DIAGNOSIS_BASE_AMOUNT.toLocaleString()}원
      </p>
    </div>
  );
}

export function DiagnosisBenefitCards({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 ${className}`}
    >
      {BENEFIT_CARDS.map((card) => (
        <div
          key={card.number}
          className="rounded-xl border border-blue-100 bg-white px-2.5 py-3 text-center shadow-sm sm:px-3 sm:py-3.5"
        >
          <p className="text-[1.35rem] font-black leading-none tracking-tight text-blue-700 sm:text-2xl">
            {card.number}
          </p>
          <p className="mt-1.5 break-keep text-[13px] font-bold leading-5 text-gray-950 sm:text-sm">
            {card.title}
          </p>
          <p className="mt-0.5 break-keep text-[11px] leading-4 text-gray-600 sm:text-xs sm:leading-5">
            {card.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DiagnosisCompareBlock({
  onReserveDiagnosis,
  onViewSpecialSchedule,
  className = "",
}: {
  onReserveDiagnosis: () => void;
  onViewSpecialSchedule: () => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
        <p className="text-xs font-bold tracking-wide text-slate-600">
          수영 특강
        </p>
        <p className="mt-1 text-[15px] font-bold text-gray-950 sm:text-base">
          스윔잇 수영 특강
        </p>
        <p className="mt-1.5 break-keep text-sm leading-6 text-gray-700">
          코치와 함께 수영 자세를 배우고 교정하는 수업
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          목적 · 기술 개선 및 자세 교정
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-3 h-11 w-full shrink-0 text-sm font-bold sm:mt-auto"
          onClick={() => {
            console.log("[저항진단] 비교 CTA → 수영 특강 일정");
            onViewSpecialSchedule();
          }}
        >
          수영 특강 일정 보기
        </Button>
      </div>
      <div className="flex flex-col rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 sm:p-4">
        <p className="text-xs font-bold tracking-wide text-blue-700">
          저항 진단
        </p>
        <p className="mt-1 text-[15px] font-bold text-gray-950 sm:text-base">
          저항 진단 프로그램
        </p>
        <p className="mt-1.5 break-keep text-sm leading-6 text-gray-700">
          4가지 영법 촬영과 어항샷, 저항분석리포트로 현재 자세를 확인
        </p>
        <p className="mt-2 text-xs font-semibold text-blue-800">
          목적 · 수영 자세 기록 및 저항 분석
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-3 h-11 w-full shrink-0 text-sm font-bold sm:mt-auto"
          onClick={() => {
            console.log("[저항진단] 비교 CTA → 진단 일정");
            onReserveDiagnosis();
          }}
        >
          저항 진단 일정 보기
        </Button>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "4가지 영법을 모두 촬영하나요?",
    a: "네. 자유형, 배영, 평영, 접영 4가지 영법을 모두 촬영합니다.",
  },
  {
    q: "어항샷도 4가지 영법 모두 촬영하나요?",
    a: "어항샷은 4가지 영법 중 2가지 영법을 촬영합니다.",
  },
  {
    q: "수영 특강과 같은 프로그램인가요?",
    a: "아닙니다. 저항 진단은 촬영과 분석에 초점을 둔 별도 프로그램이며, 현장 자세 교정 수업은 포함되지 않습니다.",
  },
] as const;

/**
 * 저항 진단 프로그램 소개 — 5초 안에 구성·가격·특강과의 차이를 이해하도록 구성
 */
export function DiagnosisProgramSection({
  onReserveDiagnosis,
  onViewSpecialSchedule,
  advanceOpen = false,
  showVideo = true,
  showCompare = true,
  showFaq = true,
  embedUrl,
  className = "",
  id = "diagnosis-intro-section",
}: DiagnosisProgramSectionProps) {
  console.log("[저항진단] 소개 섹션 렌더", {
    advanceOpen,
    showVideo,
    showCompare,
    showFaq,
  });

  return (
    <section
      id={id}
      className={`w-full scroll-mt-4 space-y-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:space-y-5 sm:p-5 ${className}`}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-[0.08em] text-blue-700 sm:text-xs">
          SWIMIT RESISTANCE DIAGNOSIS
        </p>
        <p className="text-xs font-bold text-blue-800 sm:text-sm">
          촬영 및 분석 프로그램
        </p>
        <h3 className="break-keep text-[1.35rem] font-bold leading-[1.4] tracking-tight text-gray-950 sm:text-[1.75rem] sm:leading-tight">
          내 수영을 직접 보고,
          <br />
          저항이 생기는 이유를 찾아보세요.
        </h3>
        <p className="break-keep text-sm leading-6 text-gray-700 sm:text-[15px] sm:leading-7">
          자유형·배영·평영·접영, 4가지 영법을 모두 촬영합니다.
          <br />
          그중 2가지 영법은 어항샷으로 촬영하고, 1가지 영법은
          저항분석리포트를 제공합니다.
        </p>
      </div>

      <DiagnosisBenefitCards />

      <DiagnosisPriceBlock advanceOpen={advanceOpen} />

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3.5">
        <p className="break-keep text-sm font-bold leading-6 text-gray-950">
          본 프로그램은 촬영 및 저항 분석 중심으로 진행되며, 현장 자세 교정
          수업은 포함되지 않습니다.
        </p>
        <p className="break-keep text-sm leading-6 text-gray-700">
          수영 특강과 별도로 신청하는 프로그램입니다.
        </p>
      </div>

      {showVideo && embedUrl ? (
        <div
          className="relative w-full overflow-hidden rounded-xl shadow-md"
          style={{ paddingBottom: "56.25%" }}
        >
          <iframe
            src={embedUrl}
            title="스윔잇 어항샷 샘플"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
            onLoad={() => console.log("[저항진단] 샘플 영상 로드")}
          />
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-[15px] font-bold sm:h-12 sm:text-base"
        onClick={() => {
          console.log("[저항진단] CTA → 진단 예약");
          onReserveDiagnosis();
        }}
      >
        저항 진단 프로그램 예약하기
      </Button>

      {showCompare ? (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-950">특강과 진단, 무엇이 다른가요?</p>
          <DiagnosisCompareBlock
            onReserveDiagnosis={onReserveDiagnosis}
            onViewSpecialSchedule={onViewSpecialSchedule}
          />
        </div>
      ) : null}

      {showFaq ? (
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-950">자주 묻는 질문</p>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
                <AccordionTrigger className="break-keep text-left text-sm font-semibold text-gray-900">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="break-keep text-sm leading-6 text-gray-700">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : null}
    </section>
  );
}
