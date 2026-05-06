import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    console.log("[안티포그] 결제 승인 요청:", { paymentKey, orderId, amount });

    if (!paymentKey || !orderId || !amount) {
      console.error("[안티포그] 결제 승인 파라미터 누락:", {
        paymentKey,
        orderId,
        amount,
      });
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error("[안티포그] TOSS_SECRET_KEY 환경 변수 미설정");
      return NextResponse.json(
        { success: false, error: "결제 서버 설정 오류입니다." },
        { status: 500 },
      );
    }

    // 토스페이먼츠 승인 API 호출
    const encoded = Buffer.from(`${secretKey}:`).toString("base64");
    const tossRes = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      },
    );

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error("[안티포그] 토스 승인 실패:", tossData);
      return NextResponse.json(
        {
          success: false,
          error: tossData.message ?? "결제 승인에 실패했습니다.",
          code: tossData.code,
        },
        { status: tossRes.status },
      );
    }

    console.log("[안티포그] 결제 승인 성공:", {
      orderId: tossData.orderId,
      status: tossData.status,
      method: tossData.method,
      totalAmount: tossData.totalAmount,
    });

    return NextResponse.json({ success: true, payment: tossData });
  } catch (error) {
    console.error("[안티포그] 결제 승인 예외:", error);
    return NextResponse.json(
      { success: false, error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
