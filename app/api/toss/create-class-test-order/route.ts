import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/** PG·카드 결제용 주문 생성 (결제 성공 시 Notion·시트 저장과 연동) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const orderName =
      typeof body.orderName === "string" && body.orderName.trim()
        ? body.orderName.trim().slice(0, 100)
        : "스윔잇 수영 특강";

    if (!Number.isFinite(amount) || amount < 1000 || amount > 10_000_000) {
      console.error("[카드결제] 유효하지 않은 금액:", body.amount);
      return NextResponse.json(
        { success: false, error: "결제 금액이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const orderId = `CLASS-TEST-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

    console.log("[카드결제] 주문 생성:", {
      orderId,
      amount,
      orderName,
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderName,
      amount,
      clientKey: process.env.TOSS_CLIENT_KEY ?? "",
    });
  } catch (error) {
    console.error("[카드결제] 주문 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "주문 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
