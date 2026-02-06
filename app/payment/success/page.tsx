"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * 토스페이먼츠 결제 성공 페이지
 * 
 * 결제 승인을 처리하고 4단계(대기 페이지)로 리디렉션합니다.
 */
export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("결제를 처리하고 있습니다...");

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // URL 파라미터에서 결제 정보 가져오기
        const paymentKey = searchParams.get("paymentKey");
        const orderId = searchParams.get("orderId");
        const amount = searchParams.get("amount");
        const pageId = searchParams.get("pageId");
        const region = searchParams.get("region");
        const className = searchParams.get("className");
        const timeSlot = searchParams.get("timeSlot");

        console.log("[결제 성공] 결제 승인 시작:", {
          paymentKey,
          orderId,
          amount,
          pageId,
          region,
          className,
          timeSlot,
        });

        if (!paymentKey || !orderId || !amount) {
          throw new Error("결제 정보가 올바르지 않습니다.");
        }

        // 서버에 결제 승인 요청
        const response = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "결제 승인에 실패했습니다.");
        }

        console.log("[결제 성공] 결제 승인 완료:", result.data);

        // Notion에 결제 정보 업데이트
        if (pageId) {
          console.log("[결제 성공] Notion 업데이트 시작");
          
          const updateResponse = await fetch("/api/payment/update-notion", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pageId,
              orderNumber: orderId,
              selectedClass: className,
              timeSlot,
              region,
              paymentKey,
              paymentData: result.data,
            }),
          });

          const updateResult = await updateResponse.json();
          
          if (!updateResult.success) {
            console.warn("[결제 성공] Notion 업데이트 실패:", updateResult.error);
          } else {
            console.log("[결제 성공] Notion 업데이트 완료");
          }
        }

        setStatus("success");
        setMessage("결제가 완료되었습니다!");

        // 1초 후 홈페이지로 리디렉션 (4단계로 이동하도록 파라미터 전달)
        setTimeout(() => {
          console.log("[결제 성공] 홈페이지로 리디렉션");
          router.push("/?payment=success&step=4");
        }, 1500);
      } catch (error) {
        console.error("[결제 성공] 오류 발생:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.");

        // 3초 후 홈페이지로 리디렉션
        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {status === "processing" && (
              <>
                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                <h2 className="text-xl font-semibold">{message}</h2>
                <p className="text-sm text-gray-600">잠시만 기다려주세요...</p>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h2 className="text-xl font-semibold text-green-700">{message}</h2>
                <p className="text-sm text-gray-600">잠시 후 페이지가 이동됩니다.</p>
              </>
            )}
            {status === "error" && (
              <>
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-semibold text-red-700">결제 처리 실패</h2>
                <p className="text-sm text-gray-600">{message}</p>
                <p className="text-xs text-gray-500 mt-2">잠시 후 메인 페이지로 이동합니다.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
