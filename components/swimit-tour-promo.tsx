"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SWIMIT_TOUR_URL = "https://swimit-tour.vercel.app/tour";
export const SWIMIT_TOUR_SECTION_ID = "swimit-tour-section";

type SwimitTourPromoProps = {
  className?: string;
};

/**
 * 확정 일정이 없는 지역 → 전국투어 요청 사이트 안내
 * (기존 예약/결제 흐름은 건드리지 않는 보조 섹션)
 */
export function SwimitTourPromo({ className = "" }: SwimitTourPromoProps) {
  return (
    <section
      id={SWIMIT_TOUR_SECTION_ID}
      className={`w-full scroll-mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-700">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            SWIMIT TOUR
          </div>

          <h3 className="break-keep text-lg font-bold leading-7 text-gray-950 sm:text-xl sm:leading-8">
            <span className="mr-1" aria-hidden>
              📍
            </span>
            원하는 지역 특강이 없나요?
          </h3>

          <p className="break-keep text-sm leading-6 text-gray-700 sm:text-[15px] sm:leading-7">
            다음 스윔잇 전국투어 지역에 한 표를 남겨주세요.
            <br className="hidden sm:block" />
            요청이 많이 모인 지역부터 스윔잇이 찾아갑니다.
          </p>

          <p className="break-keep text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
            지역과 원하는 영법을 남겨주시면
            <br className="sm:hidden" />
            해당 지역 일정이 확정될 때 가장 먼저 알려드립니다.
          </p>
        </div>

        <div className="w-full shrink-0 sm:w-auto sm:max-w-xs">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full border-blue-300 bg-blue-50 text-[15px] font-bold text-blue-800 hover:bg-blue-100 hover:text-blue-900 sm:h-11 sm:min-w-[220px] sm:text-base"
          >
            <a
              href={SWIMIT_TOUR_URL}
              onClick={() => {
                console.log("[전국투어] CTA 클릭 →", SWIMIT_TOUR_URL);
              }}
            >
              우리 지역 특강 요청하기 →
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
