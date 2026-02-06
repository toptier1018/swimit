import { NextRequest, NextResponse } from "next/server";

/**
 * 토스페이먼츠 결제 승인 API
 * 
 * 결제창에서 결제 완료 후 서버에서 결제를 최종 승인합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await request.json();

    console.log("[토스페이먼츠] 결제 승인 요청:", { paymentKey, orderId, amount });

    // 토스페이먼츠 결제 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
    }

    // Base64 인코딩 (토스페이먼츠 인증 방식)
    const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[토스페이먼츠] 결제 승인 실패:", result);
      return NextResponse.json(
        { success: false, error: result.message || "결제 승인에 실패했습니다." },
        { status: response.status }
      );
    }

    console.log("[토스페이먼츠] 결제 승인 성공:", result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[토스페이먼츠] 결제 승인 중 오류 발생:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "결제 승인 중 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}
