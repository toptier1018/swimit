"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get("paymentKey") ?? "";
  const orderId = params.get("orderId") ?? "";

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!paymentKey || !orderId) {
      setStatus("error");
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    const run = async () => {
      console.log("[사전예약결제UI] 승인 요청:", {
        orderId,
        paymentKeyPrefix: `${paymentKey.slice(0, 10)}…`,
      });

      const res = await fetch("/api/reservation-pay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentKey,
          tossOrderId: orderId,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        console.error("[사전예약결제UI] 승인 실패:", data);
        setStatus("error");
        setErrorMsg(data?.error || "결제 확인에 실패했습니다.");
        return;
      }

      console.log("[사전예약결제UI] 승인·확정 완료:", {
        orderNumber: data.orderNumber,
        amount: data.amount,
        alreadyConfirmed: data.alreadyConfirmed,
      });

      setOrderNumber(data.orderNumber || "");
      setLabel(data.label || "");
      setAmount(Number(data.amount) || 0);
      setCustomerName(data.customerName || "");
      setStatus("ok");
    };

    void run();
  }, [paymentKey, orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        {status === "loading" ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold text-gray-950">결제 확인 중...</p>
            <p className="mt-2 text-sm text-gray-600">
              예약을 확정하고 있습니다. 잠시만 기다려 주세요.
            </p>
          </div>
        ) : null}

        {status === "ok" ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-emerald-200">
            <p className="text-xs font-bold text-emerald-700">결제완료 / 예약확정</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-950">
              결제가 완료되었습니다
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              {customerName ? `${customerName}님, ` : ""}
              사전예약이 확정되었습니다.
            </p>
            <div className="mt-5 space-y-2 rounded-xl bg-slate-50 px-4 py-4 text-left text-sm">
              {label ? (
                <p>
                  <span className="text-gray-500">예약</span>
                  <span className="ml-2 font-bold text-gray-950">{label}</span>
                </p>
              ) : null}
              <p>
                <span className="text-gray-500">결제금액</span>
                <span className="ml-2 font-bold text-gray-950">
                  {amount.toLocaleString()}원
                </span>
              </p>
              {orderNumber ? (
                <p className="break-all text-xs text-gray-500">
                  신청번호 {orderNumber}
                </p>
              ) : null}
            </div>
            <Button asChild className="mt-6 h-12 w-full font-bold">
              <Link href="/">홈으로</Link>
            </Button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-red-200">
            <h1 className="text-2xl font-bold text-gray-950">확인 필요</h1>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-red-700">
              {errorMsg}
            </p>
            <p className="mt-3 text-xs text-gray-500">
              결제 내역이 있다면 주문번호를 캡처해 고객센터(@스윔잇)로 알려
              주세요.
            </p>
            <Button asChild className="mt-6 h-12 w-full font-bold">
              <Link href="/reservation-pay">다시 시도</Link>
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function ReservationPaySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
          결제 확인 중...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
