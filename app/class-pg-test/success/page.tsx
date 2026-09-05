"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearPendingCardEnrollment,
  loadPendingCardEnrollment,
} from "@/lib/card-enrollment";

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get("paymentKey") ?? "";
  const orderId = params.get("orderId") ?? "";
  const amountFromUrl = Number(params.get("amount") ?? "0");

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderName, setOrderName] = useState("");
  const [savedOrderNumber, setSavedOrderNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [enrollSaved, setEnrollSaved] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const ranRef = useRef(false);

  useEffect(() => {
    // React Strict Mode 등으로 effect가 두 번 돌어도 한 번만 실행
    if (ranRef.current) return;
    ranRef.current = true;

    if (!paymentKey || !orderId) {
      setStatus("error");
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    const run = async () => {
      console.log("[결제완료] success 콜백 — 승인 요청 (URL amount는 참고만):", {
        paymentKey: `${paymentKey.slice(0, 10)}…`,
        orderId,
        amountFromUrl: Number.isFinite(amountFromUrl) ? amountFromUrl : null,
      });

      // 1) Toss Confirm — 서버가 Notion 금액으로 승인
      const confirmRes = await fetch("/api/toss/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentKey,
          orderId,
          // amount는 서버에서 무시·대조만 (조작 방지)
          amount: Number.isFinite(amountFromUrl) ? amountFromUrl : undefined,
        }),
      });
      const confirmData = await confirmRes.json();

      if (!confirmData.success) {
        console.error("[결제완료] 승인 실패:", confirmData);
        setStatus("error");
        setErrorMsg(confirmData.error ?? "승인 처리 중 오류가 발생했습니다.");
        return;
      }

      const name =
        typeof confirmData.payment?.orderName === "string"
          ? confirmData.payment.orderName
          : "";
      const confirmedAmount = Number(
        confirmData.amount ?? confirmData.payment?.totalAmount ?? 0,
      );
      console.log("[결제완료] 결제 승인 완료:", {
        orderId: confirmData.payment?.orderId,
        status: confirmData.payment?.status,
        totalAmount: confirmData.payment?.totalAmount,
        alreadyConfirmed: confirmData.alreadyConfirmed,
      });
      setOrderName(name);
      setPaidAmount(confirmedAmount);
      setSavedOrderNumber(confirmData.orderNumber || "");

      // 2) 후처리 — sessionStorage는 편의용, 금액 검증은 이미 서버에서 끝남
      const pending = loadPendingCardEnrollment(orderId);
      const finalizeRes = await fetch("/api/toss/finalize-card-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentKey,
          enrollment: pending
            ? {
                sheetTimestamp: pending.sheetTimestamp,
                paymentStartedAt: pending.paymentStartedAt,
                form: pending.form,
                selectedClassName: pending.selectedClassName,
                timeSlot: pending.timeSlot,
                sessionLabel: pending.sessionLabel,
                lane: pending.lane,
                classSheetLabel: pending.classSheetLabel,
                classDate: pending.classDate,
                region: pending.region,
                traffic: pending.traffic,
                contentConsent: pending.contentConsent,
              }
            : null,
        }),
      });
      const finalizeData = await finalizeRes.json().catch(() => null);

      if (!finalizeRes.ok || !finalizeData?.success) {
        console.error("[결제완료] 후처리 실패(결제는 승인됨):", finalizeData);
        setEnrollSaved(false);
        setStorageWarning(
          finalizeData?.recoveryHint?.message ||
            "결제는 완료됐지만 신청 정보 저장을 확인하지 못했습니다. 주문번호를 캡처해 고객센터(@스윔잇)로 알려 주세요.",
        );
        if (finalizeData?.orderNumber) {
          setSavedOrderNumber(finalizeData.orderNumber);
        }
        setStatus("ok");
        return;
      }

      console.log("[결제완료] 후처리 결과:", {
        enrollSaved: finalizeData.enrollSaved,
        sheetSkippedDuplicate: finalizeData.sheetSkippedDuplicate,
        notionOk: finalizeData.notionOk,
        sheetOk: finalizeData.sheetOk,
      });

      setEnrollSaved(Boolean(finalizeData.enrollSaved));
      if (finalizeData.orderNumber) {
        setSavedOrderNumber(finalizeData.orderNumber);
      }
      if (finalizeData.amount) {
        setPaidAmount(Number(finalizeData.amount));
      }
      if (!finalizeData.enrollSaved && finalizeData.recoveryHint?.message) {
        setStorageWarning(finalizeData.recoveryHint.message);
      }

      // 로컬 정원 카운트 (중복 새로고침 시 session 없으면 스킵)
      if (pending?.selectedClassName && finalizeData.enrollSaved) {
        try {
          const raw = localStorage.getItem("class_enrollment_counts");
          const counts = raw ? (JSON.parse(raw) as Record<string, number>) : {};
          const className = pending.selectedClassName;
          const markerKey = `card_enrolled_${orderId}`;
          if (!sessionStorage.getItem(markerKey)) {
            counts[className] = (counts[className] || 0) + 1;
            localStorage.setItem(
              "class_enrollment_counts",
              JSON.stringify(counts),
            );
            sessionStorage.setItem(markerKey, "1");
            console.log("[결제완료] 로컬 정원 +1:", {
              className,
              count: counts[className],
            });
          }
        } catch (countError) {
          console.warn("[결제완료] 로컬 정원 갱신 실패:", countError);
        }
      }

      clearPendingCardEnrollment();
      setStatus("ok");
    };

    void run();
  }, [paymentKey, orderId, amountFromUrl]);

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <p className="text-gray-500 text-sm animate-pulse">
          결제 확인 중...
        </p>
      </div>
    );

  if (status === "error")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-gradient-to-br from-red-50 to-orange-50">
        <p className="text-red-600 font-bold text-lg text-center">{errorMsg}</p>
        <p className="text-xs text-gray-500 text-center max-w-sm">
          주문번호: <span className="font-mono">{orderId || "-"}</span>
        </p>
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
        {storageWarning ? (
          <p className="text-sm font-semibold text-amber-800 leading-relaxed">
            {storageWarning}
          </p>
        ) : null}
        <p className="text-gray-500 text-xs">
          {savedOrderNumber ? (
            <>
              신청번호:{" "}
              <span className="font-mono font-bold">{savedOrderNumber}</span>
              <br />
            </>
          ) : null}
          결제 주문번호: <span className="font-mono font-bold">{orderId}</span>
          <br />
          결제금액: ₩{(paidAmount || amountFromUrl || 0).toLocaleString()}
        </p>
      </div>
      <Button
        className="w-full max-w-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        onClick={() => {
          console.log("[결제완료] 홈으로 이동:", {
            orderId,
            savedOrderNumber,
            enrollSaved,
          });
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
