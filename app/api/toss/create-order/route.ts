import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// 안티포그 상품 정보 (추후 DB로 이동 가능)
const ANTIFOG_PRODUCT = {
  name: "스윔잇 안티포그",
  amount: 8900, // 원 단위, 실제 금액으로 수정하세요
};

export async function POST() {
  try {
    const orderId = `ANTIFOG-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;

    console.log("[안티포그] 주문 생성:", {
      orderId,
      amount: ANTIFOG_PRODUCT.amount,
      name: ANTIFOG_PRODUCT.name,
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderName: ANTIFOG_PRODUCT.name,
      amount: ANTIFOG_PRODUCT.amount,
      clientKey: process.env.TOSS_CLIENT_KEY ?? "",
    });
  } catch (error) {
    console.error("[안티포그] 주문 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "주문 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
