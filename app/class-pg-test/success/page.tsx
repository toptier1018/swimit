"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get("paymentKey") ?? "";
  const orderId = params.get("orderId") ?? "";
  const amount = Number(params.get("amount") ?? "0");

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderName, setOrderName] = useState("");

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    const confirm = async () => {
      console.log("[결제완료] 성공 콜백 도착, 승인 요청:", {
        paymentKey,
        orderId,
        amount,
      });

      const res = await fetch("/api/toss/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      const data = await res.json();

      if (data.success) {
        const name =
          typeof data.payment?.orderName === "string"
            ? data.payment.orderName
            : "";
        console.log("[결제완료] 결제 승인 완료:", {
          orderId: data.payment?.orderId,
          status: data.payment?.status,
          method: data.payment?.method,
          totalAmount: data.payment?.totalAmount,
          orderName: name,
        });
        setOrderName(name);
        setStatus("ok");
      } else {
        console.error("[결제완료] 승인 실패:", data.error);
        setStatus("error");
        setErrorMsg(data.error ?? "승인 처리 중 오류가 발생했습니다.");
      }
    };

    confirm();
  }, [paymentKey, orderId, amount]);

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <p className="text-gray-500 text-sm animate-pulse">결제 확인 중...</p>
      </div>
    );

  if (status === "error")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-gradient-to-br from-red-50 to-orange-50">
        <p className="text-red-600 font-bold text-lg text-center">{errorMsg}</p>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          홈으로 돌아가기
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-gradient-to-br from-teal-50 to-blue-50">
      <CheckCircle2 className="h-16 w-16 text-teal-500" />
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-2xl font-extrabold text-gray-900">결제 완료!</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          결제가 정상적으로 완료되었습니다.
          {orderName ? (
            <>
              <br />
              <span className="font-semibold text-gray-800">{orderName}</span>
            </>
          ) : null}
        </p>
        <p className="text-gray-500 text-xs">
          주문번호: <span className="font-mono font-bold">{orderId}</span>
          <br />
          결제금액: ₩{amount.toLocaleString()}
        </p>
      </div>
      <Button
        className="w-full max-w-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        onClick={() => {
          console.log("[결제완료] 홈으로 이동:", orderId);
          window.location.href = "/";
        }}
      >
        홈으로 돌아가기
      </Button>
    </div>
  );
}

export default function ClassPgTestSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
