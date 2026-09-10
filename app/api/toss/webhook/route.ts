import { NextRequest, NextResponse } from "next/server";
import {
  findCardOrderByTossOrderId,
  updatePaymentInNotion,
} from "@/app/actions/notion";
import {
  finalizeCardEnrollmentCore,
  isSwimmitClassCardOrderId,
} from "@/lib/finalize-card-enrollment";
import { notifyAdminPayment } from "@/lib/notify-admin-payment";
import { sendReservationConfirmationAlimtalk } from "@/lib/nhn-reservation-confirm-alimtalk";
import {
  parseCardPendingStatus,
  shouldSkipAdminNotify,
  shouldSkipCustomerAlimtalk,
  toNotionCardStatusFields,
  type CardPendingMeta,
} from "@/lib/toss-card-order-meta";
import { fetchTossPaymentByKey } from "@/lib/toss-payment-query";

/** Toss 재조회 method — 카드 결제만 NHN 예약확정 대상 */
function isTossCardPaymentMethod(method: string | undefined): boolean {
  const value = String(method || "").trim();
  // Toss Payments 조회 응답: 카드 결제는 보통 "카드"
  return value === "카드" || value.toUpperCase() === "CARD";
}

/**
 * Notion 카드 메타의 관리자/고객 알림 상태만 갱신 (결제/시트와 분리)
 */
async function patchNotifyMeta(params: {
  pageId: string;
  meta: CardPendingMeta;
  selectedClass: string;
  timeSlot: string;
  region: string;
  adminNotify?: CardPendingMeta["adminNotify"];
  adminNotifyAt?: string;
  clearAdminNotify?: boolean;
  customerAlimtalk?: CardPendingMeta["customerAlimtalk"];
  customerAlimtalkAt?: string;
  clearCustomerAlimtalk?: boolean;
}): Promise<boolean> {
  const next: CardPendingMeta = { ...params.meta };

  if (params.clearAdminNotify) {
    delete next.adminNotify;
    delete next.adminNotifyAt;
  } else if (params.adminNotify) {
    next.adminNotify = params.adminNotify;
    next.adminNotifyAt = params.adminNotifyAt;
  }

  if (params.clearCustomerAlimtalk) {
    delete next.customerAlimtalk;
    delete next.customerAlimtalkAt;
  } else if (params.customerAlimtalk) {
    next.customerAlimtalk = params.customerAlimtalk;
    next.customerAlimtalkAt = params.customerAlimtalkAt;
  }

  const mark = await updatePaymentInNotion({
    pageId: params.pageId,
    ...toNotionCardStatusFields(next),
    orderNumber: next.orderNumber,
    selectedClass: params.selectedClass || next.tossOrderId,
    timeSlot: params.timeSlot || "",
    region: params.region || "",
  });

  if (!mark.success) {
    console.error("[웹훅] 알림 메타 저장 실패:", mark.error);
    return false;
  }
  return true;
}

/**
 * Toss Payments 웹훅
 * - PAYMENT_STATUS_CHANGED
 * - 본문 미신뢰 → paymentKey로 GET /v1/payments/{paymentKey} 재조회
 * - 서명 헤더 검증 없음 (일반 결제 웹훅에는 해당 서명 방식 없음)
 * - 관리자 카카오 알림 + 고객 예약확정 알림톡은 이 라우트에서만
 */
export async function POST(req: NextRequest) {
  const started = Date.now();

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      console.warn("[웹훅] 잘못된 JSON body");
      // 재전송 의미 없음
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const eventType = String((body as { eventType?: string }).eventType || "");
    const createdAt = String((body as { createdAt?: string }).createdAt || "");
    const data = (body as { data?: Record<string, unknown> }).data;

    console.log("[웹훅] 수신:", {
      eventType,
      createdAt,
      elapsedMsHint: "processing",
    });

    if (eventType !== "PAYMENT_STATUS_CHANGED") {
      console.log("[웹훅] 미처리 이벤트 — 200 반환:", eventType);
      return NextResponse.json({ received: true, ignored: true, eventType });
    }

    if (!data || typeof data !== "object") {
      console.warn("[웹훅] data 없음");
      return NextResponse.json({ received: true, ignored: true });
    }

    const webhookPaymentKey = String(data.paymentKey || "").trim();
    const webhookOrderId = String(data.orderId || "").trim();
    const webhookStatus = String(data.status || "").trim();

    console.log("[웹훅] PAYMENT_STATUS_CHANGED 요약(미검증):", {
      webhookOrderId,
      webhookStatus,
      paymentKeyPrefix: webhookPaymentKey
        ? `${webhookPaymentKey.slice(0, 10)}…`
        : "",
    });

    if (!webhookPaymentKey) {
      console.warn("[웹훅] paymentKey 없음 — 무시");
      return NextResponse.json({ received: true, ignored: true });
    }

    // 1) Toss 재조회 (본문 미신뢰)
    const queried = await fetchTossPaymentByKey(webhookPaymentKey);
    if (!queried.success) {
      console.error("[웹훅] Toss 재조회 실패 — 재시도 유도:", queried.error);
      return NextResponse.json(
        { received: false, error: queried.error },
        { status: 500 },
      );
    }

    const payment = queried.payment;
    const orderId = payment.orderId;
    const status = payment.status;
    const totalAmount = payment.totalAmount;
    const paymentKey = payment.paymentKey;

    console.log("[웹훅] Toss 재조회 결과:", {
      orderId,
      status,
      totalAmount,
      method: payment.method || "",
      paymentKeyPrefix: `${paymentKey.slice(0, 10)}…`,
      hasApprovedAt: Boolean(payment.approvedAt),
    });

    // 2) 특강 카드 주문만
    if (!isSwimmitClassCardOrderId(orderId)) {
      console.log("[웹훅] 특강 카드 주문 아님 — 무시:", orderId);
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "not_class_card_order",
      });
    }

    // 3) DONE만 후처리
    if (status !== "DONE") {
      console.log("[웹훅] DONE 아님 — 후처리/알림 스킵:", status);
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "status_not_done",
        status,
      });
    }

    // 4) Notion 주문·금액 검증
    const found = await findCardOrderByTossOrderId(orderId);
    if (!found.success || !found.cardMetaRaw || !found.pageId) {
      console.error("[웹훅] Notion 주문 없음 — 재시도:", orderId);
      return NextResponse.json(
        { received: false, error: "notion_order_not_found" },
        { status: 500 },
      );
    }

    const meta = parseCardPendingStatus(found.cardMetaRaw);
    if (!meta || meta.tossOrderId !== orderId) {
      console.error("[웹훅] 주문 메타 불일치 — 후처리 중단");
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "meta_mismatch",
      });
    }

    if (Number(meta.amount) !== Number(totalAmount)) {
      console.error("[웹훅] 금액 불일치 — 후처리/알림 중단:", {
        notionAmount: meta.amount,
        tossAmount: totalAmount,
        orderId,
      });
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "amount_mismatch",
      });
    }

    // 5) 멱등 후처리 (sessionStorage 없이 Notion 복구)
    //    approvedAt: 후처리 보조용 — 알림 표시는 payment.approvedAt만 사용
    const finalize = await finalizeCardEnrollmentCore({
      orderId,
      paymentKey,
      enrollment: null,
      allowMarkDoneFromWebhook: true,
      approvedAt: payment.approvedAt || createdAt || undefined,
    });

    console.log("[웹훅] 후처리 결과:", {
      success: finalize.success,
      enrollSaved: finalize.enrollSaved,
      sheetSkippedDuplicate: finalize.sheetSkippedDuplicate,
      markedDoneFromPending: finalize.markedDoneFromPending,
      code: finalize.code,
      elapsedMs: Date.now() - started,
    });

    // 6) 관리자 카카오 알림 (부가 기능 — 실패해도 웹훅 200, 결제 성공 유지)
    let adminNotify: "sent" | "skipped" | "failed" | "not_attempted" =
      "not_attempted";
    // 7) 고객 예약확정 알림톡 (센터+프로그램 템플릿 — 실패해도 결제 성공 유지)
    let customerAlimtalk: "sent" | "skipped" | "failed" | "not_attempted" =
      "not_attempted";

    if (finalize.success && status === "DONE") {
      try {
        // finalize가 메타를 다시 쓸 수 있으므로 최신 Notion 재조회
        const latest = await findCardOrderByTossOrderId(orderId);
        if (
          !latest.success ||
          !latest.pageId ||
          !latest.cardMetaRaw
        ) {
          console.error("[웹훅] 알림 전 Notion 재조회 실패 — 알림만 스킵");
          adminNotify = "failed";
          customerAlimtalk = "failed";
        } else {
          let latestMeta = parseCardPendingStatus(latest.cardMetaRaw);
          if (!latestMeta || latestMeta.tossOrderId !== orderId) {
            console.error("[웹훅] 알림 전 메타 파싱 실패 — 알림만 스킵");
            adminNotify = "failed";
            customerAlimtalk = "failed";
          } else {
            const selectedClass =
              latest.selectedClass ||
              finalize.className ||
              latestMeta.tossOrderId;
            const timeSlot = latest.timeSlot || "";
            const region =
              latest.region || finalize.location || "";

            // --- 관리자 알림 ---
            const skipCheck = shouldSkipAdminNotify(latestMeta);
            if (skipCheck.skip) {
              console.log("[웹훅] 관리자 알림 스킵:", {
                reason: skipCheck.reason,
                orderId,
                orderNumber: latestMeta.orderNumber,
              });
              adminNotify = "skipped";
            } else {
              const notifyingAt = new Date().toISOString();
              const locked = await patchNotifyMeta({
                pageId: latest.pageId,
                meta: latestMeta,
                selectedClass,
                timeSlot,
                region,
                adminNotify: "ADMIN_NOTIFYING",
                adminNotifyAt: notifyingAt,
              });

              if (!locked) {
                console.error(
                  "[웹훅] ADMIN_NOTIFYING 기록 실패 — 발송은 시도하지 않음(중복 위험 완화)",
                );
                adminNotify = "failed";
              } else {
                const classDate = (finalize.classDate || "").trim();

                const notifyResult = await notifyAdminPayment({
                  customerName:
                    finalize.customerName ||
                    latest.applicant?.name ||
                    "",
                  phone:
                    finalize.phone || latest.applicant?.phone || "",
                  location:
                    finalize.location ||
                    latest.region ||
                    latest.applicant?.location ||
                    "",
                  classDate,
                  className:
                    finalize.className || latest.selectedClass || "",
                  amount: totalAmount,
                  approvedAt: payment.approvedAt || "",
                  orderId,
                  paymentKey,
                  orderNumber: latestMeta.orderNumber,
                });

                if (notifyResult.success) {
                  const notifiedAt = new Date().toISOString();
                  const saved = await patchNotifyMeta({
                    pageId: latest.pageId,
                    meta: {
                      ...latestMeta,
                      paymentKey:
                        paymentKey || latestMeta.paymentKey,
                    },
                    selectedClass,
                    timeSlot,
                    region,
                    adminNotify: "ADMIN_NOTIFIED",
                    adminNotifyAt: notifiedAt,
                  });
                  if (!saved) {
                    console.error(
                      "[웹훅] 카카오는 성공했지만 ADMIN_NOTIFIED 저장 실패 — 재전송 시 중복 알림 가능",
                      { orderId, orderNumber: latestMeta.orderNumber },
                    );
                  } else {
                    latestMeta = {
                      ...latestMeta,
                      paymentKey:
                        paymentKey || latestMeta.paymentKey,
                      adminNotify: "ADMIN_NOTIFIED",
                      adminNotifyAt: notifiedAt,
                    };
                  }
                  adminNotify = "sent";
                } else {
                  await patchNotifyMeta({
                    pageId: latest.pageId,
                    meta: latestMeta,
                    selectedClass,
                    timeSlot,
                    region,
                    clearAdminNotify: true,
                  });
                  console.error(
                    "[웹훅] 관리자 알림 실패 (결제는 성공 유지):",
                    notifyResult.error,
                  );
                  adminNotify = "failed";
                }
              }
            }

            // --- 고객 예약확정 알림톡 (카드결제 + NHN Cloud 전용) ---
            // 입금 안내받기(NHN v1)와 분리: CLASS- 주문 + Toss method=카드 + DONE 만
            // Aligo 미사용
            if (!isTossCardPaymentMethod(payment.method)) {
              console.log("[웹훅] 예약확정 알림톡 스킵 — 카드 결제 아님:", {
                orderId,
                method: payment.method || "",
              });
              customerAlimtalk = "skipped";
            } else {
            const refreshed = await findCardOrderByTossOrderId(orderId);
            if (
              refreshed.success &&
              refreshed.pageId &&
              refreshed.cardMetaRaw
            ) {
              const caMeta =
                parseCardPendingStatus(refreshed.cardMetaRaw) ||
                latestMeta;
              const caSkip = shouldSkipCustomerAlimtalk(caMeta);
              if (caSkip.skip) {
                console.log("[웹훅] 예약확정 알림톡 스킵:", {
                  reason: caSkip.reason,
                  orderId,
                  orderNumber: caMeta.orderNumber,
                });
                customerAlimtalk = "skipped";
              } else {
                const caLockAt = new Date().toISOString();
                const caLocked = await patchNotifyMeta({
                  pageId: refreshed.pageId,
                  meta: caMeta,
                  selectedClass:
                    refreshed.selectedClass || selectedClass,
                  timeSlot: refreshed.timeSlot || timeSlot,
                  region: refreshed.region || region,
                  customerAlimtalk: "CA_NOTIFYING",
                  customerAlimtalkAt: caLockAt,
                });

                if (!caLocked) {
                  console.error(
                    "[웹훅] CA_NOTIFYING 기록 실패 — 고객 알림톡 미발송(중복 완화)",
                  );
                  customerAlimtalk = "failed";
                } else {
                  const sendResult =
                    await sendReservationConfirmationAlimtalk({
                    orderId,
                    customerName:
                      finalize.customerName ||
                      refreshed.applicant?.name ||
                      "",
                    phone:
                      finalize.phone ||
                      refreshed.applicant?.phone ||
                      "",
                    region: refreshed.region || region,
                    center: refreshed.region || region,
                    selectedClass:
                      refreshed.selectedClass || selectedClass,
                    className:
                      finalize.className ||
                      refreshed.selectedClass ||
                      selectedClass,
                    classDate: finalize.classDate || "",
                    timeSlot: refreshed.timeSlot || timeSlot,
                    session: refreshed.timeSlot || timeSlot,
                  });

                  if (sendResult.success) {
                    const caDoneAt = new Date().toISOString();
                    const caSaved = await patchNotifyMeta({
                      pageId: refreshed.pageId,
                      meta: {
                        ...caMeta,
                        paymentKey:
                          paymentKey || caMeta.paymentKey,
                      },
                      selectedClass:
                        refreshed.selectedClass || selectedClass,
                      timeSlot: refreshed.timeSlot || timeSlot,
                      region: refreshed.region || region,
                      customerAlimtalk: "CA_NOTIFIED",
                      customerAlimtalkAt: caDoneAt,
                    });
                    if (!caSaved) {
                      console.error(
                        "[웹훅] 고객 알림톡은 성공했지만 CA_NOTIFIED 저장 실패 — 재전송 시 중복 가능",
                        { orderId, orderNumber: caMeta.orderNumber },
                      );
                    }
                    customerAlimtalk = "sent";
                  } else {
                    await patchNotifyMeta({
                      pageId: refreshed.pageId,
                      meta: caMeta,
                      selectedClass:
                        refreshed.selectedClass || selectedClass,
                      timeSlot: refreshed.timeSlot || timeSlot,
                      region: refreshed.region || region,
                      clearCustomerAlimtalk: true,
                    });
                    console.error(
                      "[웹훅] 예약확정 알림톡 실패 (결제는 성공 유지):",
                      sendResult.error,
                    );
                    customerAlimtalk = "failed";
                  }
                }
              }
            } else {
              console.error(
                "[웹훅] 고객 알림톡 전 Notion 재조회 실패 — 알림톡만 스킵",
              );
              customerAlimtalk = "failed";
            }
            }
          }
        }
      } catch (notifyError) {
        console.error(
          "[웹훅] 알림 처리 예외 (결제는 성공 유지):",
          notifyError,
        );
        if (adminNotify === "not_attempted") adminNotify = "failed";
        if (customerAlimtalk === "not_attempted") {
          customerAlimtalk = "failed";
        }
      }
    }

    return NextResponse.json({
      received: true,
      processed: Boolean(finalize.success),
      orderId,
      status,
      enrollSaved: finalize.enrollSaved,
      adminNotify,
      customerAlimtalk,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error("[웹훅] 예외 — 재시도 유도:", error);
    return NextResponse.json(
      { received: false, error: "webhook_handler_error" },
      { status: 500 },
    );
  }
}
