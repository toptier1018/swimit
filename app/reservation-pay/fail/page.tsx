"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function FailContent() {
  const params = useSearchParams();
  const code = params.get("code") || "";
  const message = params.get("message") || "결제가 취소되었거나 실패했습니다.";

  console.log("[사전예약결제UI] 결제 실패 페이지:", { code, message });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-orange-50">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-orange-200">
          <h1 className="text-2xl font-bold text-gray-950">결제가 완료되지 않았습니다</h1>
          <p className="mt-3 text-sm leading-6 text-gray-700">{message}</p>
          {code ? (
            <p className="mt-2 text-xs text-gray-400">코드: {code}</p>
          ) : null}
          <Button asChild className="mt-6 h-12 w-full font-bold">
            <Link href="/reservation-pay">다시 결제하기</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function ReservationPayFailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
          불러오는 중...
        </div>
      }
    >
      <FailContent />
    </Suspense>
  );
}
