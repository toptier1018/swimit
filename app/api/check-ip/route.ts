import { NextRequest, NextResponse } from "next/server";

/**
 * IP 확인 API
 * 
 * 서버에서 실제로 받는 요청자의 IP 주소를 확인합니다.
 * 알리고 같은 외부 서비스에 등록할 IP를 정확히 알 수 있습니다.
 */
export async function GET(request: NextRequest) {
  try {
    // 다양한 헤더에서 IP 정보 추출
    const xForwardedFor = request.headers.get("x-forwarded-for");
    const xRealIp = request.headers.get("x-real-ip");
    const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare
    const trueClientIp = request.headers.get("true-client-ip");
    
    // X-Forwarded-For는 여러 IP를 포함할 수 있음 (쉼표로 구분)
    // 첫 번째 IP가 실제 클라이언트 IP
    const clientIp = xForwardedFor?.split(",")[0].trim() || 
                     xRealIp || 
                     cfConnectingIp || 
                     trueClientIp || 
                     "IP를 찾을 수 없음";

    console.log("[IP 확인] 요청자 IP:", {
      clientIp,
      xForwardedFor,
      xRealIp,
      cfConnectingIp,
      trueClientIp,
    });

    return NextResponse.json({
      success: true,
      yourIP: clientIp,
      details: {
        "X-Forwarded-For": xForwardedFor || "없음",
        "X-Real-IP": xRealIp || "없음",
        "CF-Connecting-IP": cfConnectingIp || "없음",
        "True-Client-IP": trueClientIp || "없음",
      },
      message: `알리고에 등록해야 할 IP: ${clientIp}`,
    });
  } catch (error) {
    console.error("[IP 확인] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
