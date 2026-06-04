"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function FailContent() {
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const message = params.get("message") ?? "테스트 결제가 취소되었습니다.";

  console.log("[PG테스트] 결제 실패/취소:", { code, message });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-gradient-to-br from-red-50 to-orange-50">
      <XCircle className="h-16 w-16 text-red-400" />
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900">테스트 결제 실패</h1>
        <p className="text-gray-600 text-sm">{message}</p>
        {code && (
          <p className="text-gray-400 text-xs font-mono">오류코드: {code}</p>
        )}
      </div>
      <Button
        className="w-full max-w-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        onClick={() => (window.location.href = "/")}
      >
        홈으로 돌아가기
      </Button>
    </div>
  );
}

export default function ClassPgTestFailPage() {
  return (
    <Suspense>
      <FailContent />
    </Suspense>
  );
}
