"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ReservationItem = {
  orderNumber: string;
  label: string;
  customerName: string;
  phoneMasked: string;
  className: string;
  date: string;
  region: string;
  session: string;
  amount: number;
  status: "unpaid" | "paid";
  statusLabel: string;
};

type Step = "phone" | "fullPhone" | "select" | "pay";

type WindowStatus = {
  open: boolean;
  message: string;
  windowLabel: string;
  targetLabel: string;
  targetYear: number;
  targetMonth: number;
};

export default function ReservationPayPage() {
  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null);
  const [windowLoading, setWindowLoading] = useState(true);
  const [step, setStep] = useState<Step>("phone");
  const [last4, setLast4] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const selected = useMemo(
    () => items.find((item) => item.orderNumber === selectedOrder) || null,
    [items, selectedOrder],
  );

  const unpaidItems = useMemo(
    () => items.filter((item) => item.status === "unpaid"),
    [items],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setWindowLoading(true);
      try {
        const res = await fetch("/api/reservation-pay/status", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) {
          console.error("[사전예약결제UI] 기간 상태 조회 실패:", data);
          setWindowStatus({
            open: false,
            message:
              "결제 기간을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            windowLabel: "",
            targetLabel: "",
            targetYear: 0,
            targetMonth: 0,
          });
          return;
        }
        console.log("[사전예약결제UI] 서버 기간 상태:", {
          open: data.open,
          kst: data.kst,
          target: data.targetLabel,
        });
        setWindowStatus({
          open: Boolean(data.open),
          message: String(data.message || ""),
          windowLabel: String(data.windowLabel || ""),
          targetLabel: String(data.targetLabel || ""),
          targetYear: Number(data.targetYear) || 0,
          targetMonth: Number(data.targetMonth) || 0,
        });
      } catch (err) {
        console.error("[사전예약결제UI] 기간 상태 오류:", err);
        if (!cancelled) {
          setWindowStatus({
            open: false,
            message:
              "결제 기간을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            windowLabel: "",
            targetLabel: "",
            targetYear: 0,
            targetMonth: 0,
          });
        }
      } finally {
        if (!cancelled) setWindowLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = async (mode: "last4" | "full") => {
    setError("");
    setLoading(true);
    try {
      const body =
        mode === "full"
          ? { phoneFull: fullPhone }
          : { phoneLast4: last4 };

      console.log("[사전예약결제UI] 조회 시작:", {
        mode,
        last4Hint:
          mode === "full"
            ? fullPhone.replace(/\D/g, "").slice(-4)
            : last4.replace(/\D/g, "").slice(-4),
      });

      const res = await fetch("/api/reservation-pay/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (data?.code === "WINDOW_CLOSED") {
        setWindowStatus((prev) => ({
          open: false,
          message:
            data.error ||
            "이번 달 사전예약 결제 기간이 종료되었습니다.\n\n사전예약 결제는 매월 13일~15일에 진행됩니다.",
          windowLabel: prev?.windowLabel || "",
          targetLabel: prev?.targetLabel || "",
          targetYear: prev?.targetYear || 0,
          targetMonth: prev?.targetMonth || 0,
        }));
        setItems([]);
        return;
      }

      if (!res.ok || !data?.success) {
        setError(data?.error || "예약을 찾지 못했습니다.");
        setItems([]);
        return;
      }

      if (data.needFullPhone) {
        setItems([]);
        setSelectedOrder("");
        setStep("fullPhone");
        setError(data.message || "전체 휴대폰 번호를 입력해 주세요.");
        return;
      }

      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      const firstUnpaid = list.find(
        (item: ReservationItem) => item.status === "unpaid",
      );
      setSelectedOrder(firstUnpaid?.orderNumber || list[0]?.orderNumber || "");
      setStep("select");
      console.log("[사전예약결제UI] 조회 완료:", {
        count: list.length,
        unpaid: list.filter((i: ReservationItem) => i.status === "unpaid")
          .length,
        targetYear: data.targetYear,
        targetMonth: data.targetMonth,
      });
    } catch (err) {
      console.error("[사전예약결제UI] 조회 오류:", err);
      setError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const startPayment = async () => {
    if (!selected || selected.status !== "unpaid") return;
    setError("");
    setPaying(true);
    setStep("pay");
    try {
      console.log("[사전예약결제UI] 결제 시작:", {
        orderNumber: selected.orderNumber,
        amount: selected.amount,
      });

      const res = await fetch("/api/reservation-pay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: selected.orderNumber,
          phoneLast4: last4,
          phoneFull: fullPhone || undefined,
        }),
      });
      const data = await res.json().catch(() => null);

      if (data?.code === "WINDOW_CLOSED") {
        setWindowStatus((prev) => ({
          open: false,
          message:
            data.error ||
            "이번 달 사전예약 결제 기간이 종료되었습니다.\n\n사전예약 결제는 매월 13일~15일에 진행됩니다.",
          windowLabel: prev?.windowLabel || "",
          targetLabel: prev?.targetLabel || "",
          targetYear: prev?.targetYear || 0,
          targetMonth: prev?.targetMonth || 0,
        }));
        return;
      }

      if (!res.ok || !data?.success) {
        if (data?.code === "NEED_FULL_PHONE") {
          setStep("fullPhone");
        } else {
          setStep("select");
        }
        setError(data?.error || "결제를 시작할 수 없습니다.");
        return;
      }

      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setStep("select");
        setError("결제 금액이 올바르지 않습니다.");
        return;
      }

      const { loadTossPayments } = await import(
        "@tosspayments/tosspayments-sdk"
      );
      const tossPayments = await loadTossPayments(data.clientKey);
      const payment = tossPayments.payment({ customerKey: "ANONYMOUS" });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId: data.tossOrderId,
        orderName: data.orderName,
        successUrl: `${window.location.origin}/reservation-pay/success`,
        failUrl: `${window.location.origin}/reservation-pay/fail`,
        customerName: data.customerName || undefined,
        customerMobilePhone:
          String(data.customerPhone || "").replace(/\D/g, "").length >= 10
            ? String(data.customerPhone).replace(/\D/g, "")
            : undefined,
      });
    } catch (err) {
      console.error("[사전예약결제UI] 결제창 오류:", err);
      setStep("select");
      setError("결제창을 열지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
        <header className="mb-6">
          <p className="text-xs font-bold tracking-wide text-blue-700">
            SWIMIT
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">
            사전예약 결제
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            예약 시 등록한 휴대폰으로 내 예약을 확인한 뒤 결제합니다.
          </p>
        </header>

        {windowLoading ? (
          <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-gray-600">결제 기간 확인 중...</p>
          </section>
        ) : null}

        {!windowLoading && windowStatus && !windowStatus.open ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold text-slate-500">결제 기간 종료</p>
            <p className="mt-3 whitespace-pre-line text-base font-semibold leading-7 text-gray-900">
              {windowStatus.message ||
                "이번 달 사전예약 결제 기간이 종료되었습니다.\n\n사전예약 결제는 매월 13일~15일에 진행됩니다."}
            </p>
          </section>
        ) : null}

        {!windowLoading && windowStatus?.open ? (
          <>
            <p className="mb-4 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
              {windowStatus.windowLabel} · {windowStatus.targetLabel} 일정
              사전예약 결제
            </p>

            <ol className="mb-6 grid grid-cols-4 gap-1 text-center text-[11px] font-semibold text-gray-500">
              {[
                { key: "phone", label: "번호" },
                { key: "select", label: "예약" },
                { key: "pay", label: "결제" },
                { key: "done", label: "완료" },
              ].map((item, index) => {
                const active =
                  (step === "phone" && index === 0) ||
                  (step === "fullPhone" && index === 0) ||
                  (step === "select" && index <= 1) ||
                  (step === "pay" && index <= 2);
                return (
                  <li
                    key={item.key}
                    className={`rounded-lg px-1 py-2 ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {index + 1}. {item.label}
                  </li>
                );
              })}
            </ol>

            {step === "phone" ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-bold text-gray-950">
                  휴대폰 뒤 4자리
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  예: 010-4454-9986 → <strong>9986</strong>
                </p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={last4}
                  onChange={(e) =>
                    setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="0000"
                  className="mt-4 h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-bold tracking-[0.35em] text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <Button
                  className="mt-4 h-12 w-full text-base font-bold"
                  disabled={last4.length !== 4 || loading}
                  onClick={() => void lookup("last4")}
                >
                  {loading ? "조회 중..." : "내 예약 찾기"}
                </Button>
              </section>
            ) : null}

            {step === "fullPhone" ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-bold text-gray-950">
                  휴대폰 전체 번호
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                  동일한 번호가 있습니다.
                  {"\n"}
                  예약 시 입력한 휴대폰 전체 번호를 입력해주세요.
                </p>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  value={fullPhone}
                  onChange={(e) =>
                    setFullPhone(
                      e.target.value.replace(/[^\d-]/g, "").slice(0, 13),
                    )
                  }
                  placeholder="010-0000-0000"
                  className="mt-4 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-lg font-semibold text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      setError("");
                      setFullPhone("");
                      setStep("phone");
                    }}
                  >
                    뒤로
                  </Button>
                  <Button
                    className="h-12 font-bold"
                    disabled={
                      fullPhone.replace(/\D/g, "").length < 10 || loading
                    }
                    onClick={() => void lookup("full")}
                  >
                    {loading ? "조회 중..." : "확인"}
                  </Button>
                </div>
              </section>
            ) : null}

            {step === "select" || step === "pay" ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-bold text-gray-950">내 사전예약</h2>
                {items[0] ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {items[0].customerName} · {items[0].phoneMasked}
                  </p>
                ) : null}

                <ul className="mt-4 space-y-2">
                  {items.map((item) => {
                    const selectable = item.status === "unpaid";
                    const isSelected = selectedOrder === item.orderNumber;
                    return (
                      <li key={item.orderNumber}>
                        <button
                          type="button"
                          disabled={!selectable}
                          onClick={() => {
                            if (!selectable) return;
                            setSelectedOrder(item.orderNumber);
                            setError("");
                          }}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            !selectable
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-80"
                              : isSelected
                                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                                : "border-slate-200 bg-white hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-950">
                              {item.label}
                            </p>
                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                item.status === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {item.statusLabel}
                            </span>
                          </div>
                          {item.status === "unpaid" ? (
                            <p className="mt-2 text-base font-extrabold text-blue-800">
                              {item.amount.toLocaleString()}원
                              <span className="ml-1 text-xs font-semibold text-gray-500">
                                (사전예약 혜택 적용)
                              </span>
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500">
                              다시 결제할 수 없습니다.
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {selected && selected.status === "unpaid" ? (
                  <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">
                      결제 금액
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-gray-950">
                      {selected.amount.toLocaleString()}
                      <span className="text-base">원</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      금액은 변경할 수 없습니다.
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-12"
                    disabled={paying}
                    onClick={() => {
                      setError("");
                      setItems([]);
                      setSelectedOrder("");
                      setStep(fullPhone ? "fullPhone" : "phone");
                    }}
                  >
                    다시 조회
                  </Button>
                  <Button
                    className="h-12 font-bold"
                    disabled={
                      paying ||
                      !selected ||
                      selected.status !== "unpaid" ||
                      unpaidItems.length === 0
                    }
                    onClick={() => void startPayment()}
                  >
                    {paying ? "결제창 여는 중..." : "결제하기"}
                  </Button>
                </div>
              </section>
            ) : null}

            {error ? (
              <p className="mt-4 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </p>
            ) : null}
          </>
        ) : null}

        <p className="mt-auto pt-8 text-center text-xs leading-5 text-gray-400">
          결제 문의 · 고객센터 @스윔잇
        </p>
      </main>
    </div>
  );
}
