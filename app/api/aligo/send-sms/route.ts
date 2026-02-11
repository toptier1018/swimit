import { NextRequest, NextResponse } from "next/server";

/**
 * 알리고 SMS 문자 발송 API
 * 
 * 알림톡 발송 실패 시 대체 수단으로 SMS 문자를 발송합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { customerName, customerPhone, className } = await request.json();

    console.log("[알리고 SMS] 발송 요청:", {
      customerName,
      customerPhone,
      className,
    });

    // 환경 변수 확인
    const apiKey = process.env.ALIGO_API_KEY;
    const userId = process.env.ALIGO_USER_ID;
    const senderPhone = process.env.ALIGO_SENDER_PHONE;

    if (!apiKey || !userId || !senderPhone) {
      console.error("[알리고 SMS] 환경 변수가 설정되지 않았습니다");
      return NextResponse.json(
        { success: false, error: "알리고 API 설정이 올바르지 않습니다." },
        { status: 500 }
      );
    }

    // 전화번호 형식 정리 (하이픈 제거)
    const receiverPhone = customerPhone.replace(/-/g, "");

    // SMS 메시지 내용
    const message = `안녕하세요, 스윔잇입니다 
${customerName} 회원님 ${className}
특강 신청해 주셔서 감사합니다.

스윔잇 특강은 결제하기 이후 
**실입금 완료 시 예약이 확정**
되는 방식이라 헛갈리실까 봐 
미리 안내드렸어요.

아래 계좌로 입금해 주시면  
**익일 오후 2시**
예약 확정과 함께 상세 안내를 
도와드리겠습니다.

놓치지 않도록  
저희가 잘 챙기고 있을게요 

 농협 302-1710-5277-51 장연성`;

    console.log("[알리고 SMS] API 호출 준비:", {
      apiKey: apiKey.substring(0, 10) + "...",
      userId,
      sender: senderPhone,
      receiver: receiverPhone,
    });

    // 알리고 SMS API 호출
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("user_id", userId);
    formData.append("sender", senderPhone);
    formData.append("receiver", receiverPhone);
    formData.append("msg", message);
    formData.append("msg_type", "LMS"); // 장문 문자 (LMS)
    formData.append("title", "입금 안내"); // LMS 제목

    const response = await fetch(
      "https://apis.aligo.in/send/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const result = await response.text();
    console.log("[알리고 SMS] API 응답 (원본):", result);

    // 알리고 API는 JSON 또는 텍스트로 응답할 수 있음
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
      console.log("[알리고 SMS] API 응답 (파싱):", JSON.stringify(parsedResult, null, 2));
    } catch {
      parsedResult = { raw: result };
      console.log("[알리고 SMS] JSON 파싱 실패, 원본 사용");
    }

    // 성공 여부 확인
    const isSuccess = 
      parsedResult.result_code === 1 || 
      parsedResult.message_id ||
      (typeof parsedResult.message === 'string' && parsedResult.message.includes("success"));

    if (isSuccess) {
      console.log("[알리고 SMS] 발송 성공:", customerName);
      return NextResponse.json({
        success: true,
        message: "SMS가 성공적으로 발송되었습니다.",
        data: parsedResult,
      });
    } else {
      console.error("[알리고 SMS] 발송 실패:", parsedResult);
      return NextResponse.json(
        {
          success: false,
          error: parsedResult.message || "SMS 발송에 실패했습니다.",
          data: parsedResult,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[알리고 SMS] 예외 발생:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
