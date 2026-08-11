"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePaymentInNotion } from "@/app/actions/notion";
import {
  clearPendingCardEnrollment,
  loadPendingCardEnrollment,
} from "@/lib/card-enrollment";

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get("paymentKey") ?? "";
  const orderId = params.get("orderId") ?? "";
  const amount = Number(params.get("amount") ?? "0");

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderName, setOrderName] = useState("");
  const [savedOrderNumber, setSavedOrderNumber] = useState("");
  const [enrollSaved, setEnrollSaved] = useState(false);

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

      if (!data.success) {
        console.error("[결제완료] 승인 실패:", data.error);
        setStatus("error");
        setErrorMsg(data.error ?? "승인 처리 중 오류가 발생했습니다.");
        return;
      }

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

      const pending = loadPendingCardEnrollment(orderId);
      if (!pending) {
        console.warn(
          "[카드신청] 결제 승인은 됐지만 신청 임시 데이터가 없어 Notion/시트 저장을 건너뜁니다.",
        );
        setEnrollSaved(false);
        setStatus("ok");
        return;
      }

      try {
        console.log("[카드신청] Notion·시트 저장 시작:", {
          pageId: pending.pageId,
          orderNumber: pending.orderNumber,
          className: pending.selectedClassName,
        });

        const notionUpdate = await updatePaymentInNotion({
          pageId: pending.pageId,
          virtualAccountInfo: "결제완료",
          orderNumber: pending.orderNumber,
          selectedClass: pending.selectedClassName,
          timeSlot: pending.timeSlot,
          region: pending.region,
          paymentStartedAt: pending.paymentStartedAt,
          traffic: pending.traffic,
        });

        if (!notionUpdate.success) {
          console.error("[카드신청] Notion 업데이트 실패:", notionUpdate.error);
          setEnrollSaved(false);
          setSavedOrderNumber(pending.orderNumber);
          setStatus("ok");
          setErrorMsg("");
          // 결제는 됐으므로 ok로 두되 안내
          console.warn("[카드신청] 결제는 완료, Notion 저장만 실패");
        } else {
          console.log("[카드신청] Notion 결제완료 반영:", pending.orderNumber);
        }

        const sheetResponse = await fetch("/api/sheets/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            접수일시: pending.sheetTimestamp,
            신청번호: pending.orderNumber,
            이름: pending.form.name,
            전화번호: "'" + pending.form.phone.replace(/-/g, ""),
            이메일: pending.form.email || "",
            성별: pending.form.gender === "male" ? "남성" : "여성",
            거주지역: pending.form.location,
            수영경력: pending.form.swimmingExperience || "",
            통증부위: (pending.form.painAreas || []).join(", "),
            해결문제: pending.form.message || "",
            클래스: pending.classSheetLabel,
            회차: pending.sessionLabel,
            레인: pending.lane,
            날짜: pending.classDate,
            특강지역: pending.region,
            예약상태: "결제완료",
            ...pending.traffic,
          }),
        });
        const sheetResult = await sheetResponse.json().catch(() => null);

        if (!sheetResponse.ok || !sheetResult?.success) {
          console.error(
            "[카드신청] 구글시트 저장 실패:",
            sheetResult?.error || sheetResponse.status,
          );
          setEnrollSaved(Boolean(notionUpdate.success));
        } else {
          console.log("[카드신청] 구글시트 저장 완료:", pending.orderNumber);
          setEnrollSaved(true);
        }

        // 정원 카운터(로컬) 증가 — 메인과 동일 키
        try {
          const raw = localStorage.getItem("class_enrollment_counts");
          const counts = raw ? (JSON.parse(raw) as Record<string, number>) : {};
          const className = pending.selectedClassName;
          counts[className] = (counts[className] || 0) + 1;
          localStorage.setItem(
            "class_enrollment_counts",
            JSON.stringify(counts),
          );
          console.log("[카드신청] 로컬 정원 카운트 +1:", {
            className,
            count: counts[className],
          });
        } catch (countError) {
          console.warn("[카드신청] 로컬 정원 카운트 갱신 실패:", countError);
        }

        setSavedOrderNumber(pending.orderNumber);
        clearPendingCardEnrollment();
        setStatus("ok");
      } catch (error) {
        console.error("[카드신청] Notion/시트 저장 예외:", error);
        setEnrollSaved(false);
        setSavedOrderNumber(pending.orderNumber);
        setStatus("ok");
      }
    };

    confirm();
  }, [paymentKey, orderId, amount]);

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <p className="text-gray-500 text-sm animate-pulse">
          결제 확인 및 신청 저장 중...
        </p>
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
          {savedOrderNumber ? (
            <>
              신청번호:{" "}
              <span className="font-mono font-bold">{savedOrderNumber}</span>
              <br />
            </>
          ) : null}
          결제 주문번호: <span className="font-mono font-bold">{orderId}</span>
          <br />
          결제금액: ₩{amount.toLocaleString()}
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
