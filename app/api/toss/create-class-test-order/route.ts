import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/** PG 심사용 특강 테스트 결제 (실제 신청·Notion·시트와 무관) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const orderName =
      typeof body.orderName === "string" && body.orderName.trim()
        ? body.orderName.trim().slice(0, 100)
        : "스윔잇 수영 특강 (PG심사용)";

    if (!Number.isFinite(amount) || amount < 1000 || amount > 10_000_000) {
      console.error("[PG테스트] 유효하지 않은 금액:", body.amount);
      return NextResponse.json(
        { success: false, error: "결제 금액이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const orderId = `CLASS-TEST-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    const clientKey = process.env.TOSS_CLIENT_KEY ?? "";

    if (!clientKey) {
      console.error("[PG테스트] TOSS_CLIENT_KEY 환경 변수 미설정");
      return NextResponse.json(
        {
          success: false,
          error:
            "TOSS_CLIENT_KEY가 없습니다. Vercel 환경변수에 test_ck_ 키를 추가한 뒤 재배포하세요.",
        },
        { status: 500 },
      );
    }

    console.log("[PG테스트] 특강 테스트 주문 생성:", {
      orderId,
      amount,
      orderName,
      clientKeyPrefix: clientKey.slice(0, 10),
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderName,
      amount,
      clientKey,
    });
  } catch (error) {
    console.error("[PG테스트] 주문 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "테스트 주문 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
