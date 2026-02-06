import { NextRequest, NextResponse } from "next/server";
import { updatePaymentInNotion } from "@/app/actions/notion";

/**
 * 토스페이먼츠 결제 완료 후 Notion 업데이트 API
 * 
 * 결제 정보를 Notion에 기록합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { pageId, orderNumber, selectedClass, timeSlot, region, paymentKey, paymentData } = await request.json();

    console.log("[Notion 업데이트] 요청:", {
      pageId,
      orderNumber,
      selectedClass,
      timeSlot,
      region,
      paymentKey,
    });

    if (!pageId) {
      throw new Error("pageId가 필요합니다.");
    }

    // 결제 정보를 Notion에 업데이트
    await updatePaymentInNotion({
      pageId,
      virtualAccountInfo: `입금완료 (토스페이먼츠)\n결제키: ${paymentKey}\n승인시간: ${paymentData?.approvedAt || new Date().toISOString()}`,
      orderNumber: orderNumber || "",
      selectedClass: selectedClass || "",
      timeSlot: timeSlot || "",
      region: region || "",
      paymentStartedAt: paymentData?.approvedAt || new Date().toISOString(),
    });

    console.log("[Notion 업데이트] 완료");

    return NextResponse.json({
      success: true,
      message: "Notion 업데이트 완료",
    });
  } catch (error) {
    console.error("[Notion 업데이트] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Notion 업데이트 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
