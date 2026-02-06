"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

/**
 * 토스페이먼츠 결제 실패 페이지
 * 
 * 결제 실패 사유를 표시하고 홈으로 돌아갈 수 있게 합니다.
 */
export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorCode, setErrorCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const message = searchParams.get("message");

    console.log("[결제 실패] 오류 정보:", { code, message });

    setErrorCode(code || "UNKNOWN_ERROR");
    setErrorMessage(message || "결제 중 오류가 발생했습니다.");
  }, [searchParams]);

  const handleGoHome = () => {
    console.log("[결제 실패] 홈으로 이동");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle className="h-16 w-16 text-red-500" />
            <h2 className="text-xl font-semibold text-red-700">결제 실패</h2>
            <p className="text-sm text-gray-600">{errorMessage}</p>
            {errorCode && (
              <p className="text-xs text-gray-500">오류 코드: {errorCode}</p>
            )}
            <Button
              onClick={handleGoHome}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
