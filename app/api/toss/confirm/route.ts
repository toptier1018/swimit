import { NextRequest, NextResponse } from "next/server";
import {
  findCardOrderByTossOrderId,
  updatePaymentInNotion,
} from "@/app/actions/notion";
import {
  parseCardPendingStatus,
  toNotionCardStatusFields,
} from "@/lib/toss-card-order-meta";

const DONE_STATUSES = new Set(["DONE"]);

/**
 * 토스 결제 승인
 * - CLASS-* 특강 카드결제: Notion에 저장된 금액으로만 승인
 * - ANTIFOG-* : 기존 안티포그 금액(클라이언트+고정) 유지
 * - Idempotency-Key 적용
 * - Secret Key는 응답에 포함하지 않음
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentKey =
      typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";
    const clientAmount = Number(body.amount);

    console.log("[결제승인] 요청 수신:", {
      orderId,
      paymentKeyPrefix: paymentKey ? `${paymentKey.slice(0, 10)}…` : "",
      clientAmount: Number.isFinite(clientAmount) ? clientAmount : null,
    });

    if (!paymentKey || !orderId) {
      return NextResponse.json(
        { success: false, error: "paymentKey와 orderId는 필수입니다." },
        { status: 400 },
      );
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error("[결제승인] TOSS_SECRET_KEY 미설정");
      return NextResponse.json(
        { success: false, error: "결제 서버 설정 오류입니다." },
        { status: 500 },
      );
    }

    const isClassCardOrder =
      orderId.startsWith("CLASS-") || orderId.startsWith("CLASS-TEST-");
    const isAntifog = orderId.startsWith("ANTIFOG-");

    let amountToConfirm = 0;
    let idempotencyKey = `confirm-${orderId}`;
    let notionPageId: string | undefined;
    let pendingMeta: ReturnType<typeof parseCardPendingStatus> = null;
    let notionFields:
      | {
          orderNumber: string;
          selectedClass: string;
          timeSlot: string;
          region: string;
        }
      | undefined;

    if (isClassCardOrder) {
      const found = await findCardOrderByTossOrderId(orderId);
      if (!found.success || !found.pageId || !found.cardMetaRaw) {
        console.error("[결제승인] Notion 주문 없음 — 승인 거부:", orderId);
        return NextResponse.json(
          {
            success: false,
            error: "유효하지 않은 주문입니다. 다시 결제를 진행해 주세요.",
            code: "ORDER_NOT_FOUND",
          },
          { status: 400 },
        );
      }

      pendingMeta = parseCardPendingStatus(found.cardMetaRaw);
      if (!pendingMeta || pendingMeta.tossOrderId !== orderId) {
        console.error("[결제승인] 주문 메타 파싱 실패:", found.cardMetaRaw);
        return NextResponse.json(
          { success: false, error: "주문 정보가 손상되었습니다.", code: "ORDER_META_INVALID" },
          { status: 400 },
        );
      }

      amountToConfirm = pendingMeta.amount;
      idempotencyKey = pendingMeta.idempotencyKey;
      notionPageId = found.pageId;
      notionFields = {
        orderNumber: pendingMeta.orderNumber,
        selectedClass: found.selectedClass || "",
        timeSlot: found.timeSlot || "",
        region: found.region || "",
      };

      if (
        Number.isFinite(clientAmount) &&
        clientAmount > 0 &&
        clientAmount !== amountToConfirm
      ) {
        console.warn("[결제승인] successUrl amount 불일치 — Notion 금액으로 승인:", {
          clientAmount,
          serverAmount: amountToConfirm,
          orderId,
        });
      }

      // 이미 결제완료로 표시된 경우: Confirm 재호출은 멱등키로 안전, 후처리 힌트 제공
      if (pendingMeta.status === "CARD_DONE") {
        console.log("[결제승인] 이미 CARD_DONE — Confirm 멱등 재시도 가능:", orderId);
      }
    } else if (isAntifog) {
      amountToConfirm = 8900;
      if (Number.isFinite(clientAmount) && clientAmount !== amountToConfirm) {
        return NextResponse.json(
          { success: false, error: "결제 금액이 올바르지 않습니다.", code: "AMOUNT_MISMATCH" },
          { status: 400 },
        );
      }
    } else {
      // 알 수 없는 주문 접두사 — 안전하게 거부
      return NextResponse.json(
        { success: false, error: "지원하지 않는 주문입니다.", code: "UNSUPPORTED_ORDER" },
        { status: 400 },
      );
    }

    const encoded = Buffer.from(`${secretKey}:`).toString("base64");
    const tossRes = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: amountToConfirm,
        }),
      },
    );

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      // 이미 승인된 결제 등
      const code = tossData?.code;
      console.error("[결제승인] 토스 승인 실패:", {
        code,
        message: tossData?.message,
        orderId,
      });

      // ALREADY_PROCESSED_PAYMENT 등이면 조회 API로 상태 확인
      if (
        code === "ALREADY_PROCESSED_PAYMENT" ||
        String(tossData?.message || "").includes("이미 처리")
      ) {
        const lookup = await fetch(
          `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
          {
            headers: {
              Authorization: `Basic ${encoded}`,
            },
          },
        );
        const looked = await lookup.json().catch(() => null);
        if (
          lookup.ok &&
          looked &&
          DONE_STATUSES.has(String(looked.status)) &&
          Number(looked.totalAmount) === amountToConfirm &&
          String(looked.orderId) === orderId
        ) {
          console.log("[결제승인] 기존 승인 건 확인 성공:", {
            orderId,
            status: looked.status,
          });
          return NextResponse.json({
            success: true,
            alreadyConfirmed: true,
            payment: {
              orderId: looked.orderId,
              paymentKey: looked.paymentKey ?? paymentKey,
              status: looked.status,
              totalAmount: looked.totalAmount,
              method: looked.method,
              orderName: looked.orderName,
            },
            orderNumber: notionFields?.orderNumber,
            pageId: notionPageId,
            amount: amountToConfirm,
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: tossData.message ?? "결제 승인에 실패했습니다.",
          code: tossData.code,
        },
        { status: tossRes.status },
      );
    }

    const status = String(tossData.status || "");
    const totalAmount = Number(tossData.totalAmount);
    const confirmedOrderId = String(tossData.orderId || "");

    if (confirmedOrderId !== orderId) {
      console.error("[결제승인] orderId 불일치:", {
        expected: orderId,
        got: confirmedOrderId,
      });
      return NextResponse.json(
        { success: false, error: "주문번호 검증에 실패했습니다.", code: "ORDER_ID_MISMATCH" },
        { status: 400 },
      );
    }

    if (totalAmount !== amountToConfirm) {
      console.error("[결제승인] 금액 불일치:", {
        expected: amountToConfirm,
        got: totalAmount,
      });
      return NextResponse.json(
        { success: false, error: "결제 금액 검증에 실패했습니다.", code: "AMOUNT_MISMATCH" },
        { status: 400 },
      );
    }

    if (!DONE_STATUSES.has(status)) {
      console.error("[결제승인] 비정상 상태:", status);
      return NextResponse.json(
        {
          success: false,
          error: `결제가 완료되지 않았습니다. (상태: ${status})`,
          code: "INVALID_STATUS",
        },
        { status: 400 },
      );
    }

    // Notion에 승인 완료 메타 기록 (멱등: 이미 DONE이어도 덮어씀)
    if (isClassCardOrder && notionPageId && pendingMeta && notionFields) {
      const doneMeta = {
        status: "CARD_DONE" as const,
        tossOrderId: orderId,
        amount: amountToConfirm,
        orderNumber: pendingMeta.orderNumber,
        idempotencyKey: pendingMeta.idempotencyKey,
        paymentKey,
      };
      const mark = await updatePaymentInNotion({
        pageId: notionPageId,
        ...toNotionCardStatusFields(doneMeta),
        orderNumber: pendingMeta.orderNumber,
        selectedClass:
          notionFields.selectedClass || pendingMeta.tossOrderId,
        timeSlot: notionFields.timeSlot || "",
        region: notionFields.region || "",
      });
      if (!mark.success) {
        console.error(
          "[결제승인] 토스 승인은 성공했으나 Notion CARD_DONE 표시 실패:",
          mark.error,
        );
      } else {
        console.log("[결제승인] Notion 결제완료 표시 완료:", orderId);
      }
    }

    console.log("[결제승인] 성공:", {
      orderId: tossData.orderId,
      status: tossData.status,
      totalAmount: tossData.totalAmount,
      method: tossData.method,
    });

    // Secret / 불필요 필드 제외한 최소 payment만 반환
    return NextResponse.json({
      success: true,
      payment: {
        orderId: tossData.orderId,
        paymentKey: tossData.paymentKey ?? paymentKey,
        status: tossData.status,
        totalAmount: tossData.totalAmount,
        method: tossData.method,
        orderName: tossData.orderName,
      },
      orderNumber: notionFields?.orderNumber ?? pendingMeta?.orderNumber,
      pageId: notionPageId,
      amount: amountToConfirm,
    });
  } catch (error) {
    console.error("[결제승인] 예외:", error);
    return NextResponse.json(
      { success: false, error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
