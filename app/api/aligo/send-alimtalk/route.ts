import { NextRequest, NextResponse } from "next/server";

/**
 * 알리고 알림톡 발송 API
 * 
 * 입금대기 상태인 고객에게 알림톡을 자동으로 발송합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { customerName, customerPhone, className } = await request.json();

    console.log("[알리고 알림톡] 발송 요청:", {
      customerName,
      customerPhone,
      className,
    });

    // 환경 변수 확인
    const apiKey = process.env.ALIGO_API_KEY;
    const userId = process.env.ALIGO_USER_ID;
    const senderKey = process.env.ALIGO_SENDER_KEY;
    const senderPhone = process.env.ALIGO_SENDER_PHONE;
    const templateCode = process.env.ALIGO_TEMPLATE_CODE;

    if (!apiKey || !userId || !senderKey || !senderPhone || !templateCode) {
      console.error("[알리고 알림톡] 환경 변수가 설정되지 않았습니다");
      return NextResponse.json(
        { success: false, error: "알리고 API 설정이 올바르지 않습니다." },
        { status: 500 }
      );
    }

    // 전화번호 형식 정리 (하이픈 제거)
    const receiverPhone = customerPhone.replace(/-/g, "");

    console.log("[알리고 알림톡] API 호출 준비:", {
      apiKey: apiKey.substring(0, 10) + "...",
      userId,
      senderKey: senderKey.substring(0, 10) + "...",
      templateCode,
      receiver: receiverPhone,
    });

    // 알리고 알림톡 API 호출
    const formData = new URLSearchParams();
    formData.append("apikey", apiKey);
    formData.append("userid", userId);
    formData.append("senderkey", senderKey);
    formData.append("tpl_code", templateCode); // UF_4507
    formData.append("sender", senderPhone);
    formData.append("receiver_1", receiverPhone);
    
    // 템플릿 제목
    formData.append("subject_1", "입금 안내");
    
    // 템플릿 전체 내용 (변수 포함)
    formData.append("message_1", `안녕하세요, 스윔잇입니다 😊  
#{고객명} 회원님 특강 신청해 주셔서 감사합니다.

스윔잇 특강은 결제하기 이후 
**실입금 완료 시 예약이 확정**
되는 방식이라 헛갈리실까 봐 
미리 안내드렸어요.

아래 계좌로 입금해 주시면  
**익일 오후 2시**
예약 확정과 함께 상세 안내를 
도와드리겠습니다.

놓치지 않도록  
저희가 잘 챙기고 있을게요 🙂

👉 농협 302-1710-5277-51 장연성`);
    
    // 템플릿 변수 값 (#{고객명})
    formData.append("emtitle_1", customerName); // #{고객명}
    
    // 채널추가 버튼 (템플릿에 정의된 버튼)
    formData.append("button_1", JSON.stringify({
      button: [{
        name: "채널추가",
        type: "AC"
      }]
    }));

    const response = await fetch(
      "https://kakaoapi.aligo.in/akv10/alimtalk/send/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const result = await response.text();
    console.log("[알리고 알림톡] API 응답 (원본):", result);

    // 알리고 API는 JSON 또는 텍스트로 응답할 수 있음
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
      console.log("[알리고 알림톡] API 응답 (파싱):", JSON.stringify(parsedResult, null, 2));
    } catch {
      parsedResult = { raw: result };
      console.log("[알리고 알림톡] JSON 파싱 실패, 원본 사용");
    }
    
    // 전송한 데이터 로그 (디버깅용)
    console.log("[알리고 알림톡] 전송한 데이터:", {
      subject: formData.get("subject_1"),
      message_preview: formData.get("message_1")?.substring(0, 100) + "...",
      emtitle_1: formData.get("emtitle_1"),
      receiver: formData.get("receiver_1"),
    });

    // 성공 여부 확인
    // 알리고는 result_code: 1 또는 message에 "성공" 포함 시 성공
    const isSuccess = 
      parsedResult.result_code === 1 || 
      parsedResult.code === "0" ||
      parsedResult.code === 0 ||
      (typeof parsedResult.message === 'string' && 
       (parsedResult.message.includes("성공") || 
        parsedResult.message.includes("전송요청")));

    if (isSuccess) {
      console.log("[알리고 알림톡] 발송 성공:", customerName, "-", parsedResult.message);
      return NextResponse.json({
        success: true,
        message: "알림톡이 성공적으로 발송되었습니다.",
        data: parsedResult,
      });
    } else {
      console.error("[알리고 알림톡] 발송 실패:", parsedResult);
      return NextResponse.json(
        {
          success: false,
          error: parsedResult.message || "알림톡 발송에 실패했습니다.",
          data: parsedResult,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[알리고 알림톡] 예외 발생:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
