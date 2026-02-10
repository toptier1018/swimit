import { NextResponse } from "next/server";

/**
 * 서버의 실제 공인 IP 확인 API
 * 
 * Next.js 서버가 외부 API를 호출할 때 사용하는 실제 공인 IP 주소를 확인합니다.
 * 이 IP가 알리고 같은 외부 서비스에 등록해야 할 IP입니다.
 */
export async function GET() {
  try {
    console.log("[서버 IP 확인] 외부 서비스에 요청 중...");

    // 여러 IP 확인 서비스 사용 (하나가 실패해도 다른 것으로 확인)
    const services = [
      "https://api.ipify.org?format=json",
      "https://api64.ipify.org?format=json",
      "https://icanhazip.com",
    ];

    let serverIP = null;
    let service = null;

    for (const url of services) {
      try {
        console.log(`[서버 IP 확인] ${url} 시도 중...`);
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "SwimIt-Server-IP-Check/1.0",
          },
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          
          if (contentType?.includes("application/json")) {
            const data = await response.json();
            serverIP = data.ip;
          } else {
            serverIP = (await response.text()).trim();
          }

          service = url;
          console.log(`[서버 IP 확인] 성공:`, serverIP, `(from ${service})`);
          break;
        }
      } catch (error) {
        console.warn(`[서버 IP 확인] ${url} 실패:`, error);
        continue;
      }
    }

    if (!serverIP) {
      throw new Error("모든 IP 확인 서비스에 접속 실패");
    }

    console.log(`[서버 IP 확인] 최종 확인된 서버 공인 IP: ${serverIP}`);

    return NextResponse.json({
      success: true,
      serverIP: serverIP,
      service: service,
      message: `✅ 알리고에 이 IP를 등록하세요: ${serverIP}`,
      note: "이것이 Next.js 서버가 외부 API를 호출할 때 사용하는 실제 공인 IP입니다.",
      instructions: [
        "1. 알리고 관리자 페이지 로그인 (https://smartsms.aligo.in/)",
        `2. 발송 서버 IP에 ${serverIP} 등록`,
        "3. 5~10분 후 다시 테스트",
      ],
    });
  } catch (error) {
    console.error("[서버 IP 확인] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "서버 IP 확인 중 오류 발생",
        fallback: "브라우저에서 https://www.whatismyip.com/ 방문해서 확인하세요",
      },
      { status: 500 }
    );
  }
}
