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
    
    // 템플릿 변수 (#{고객명}, #{강의명})
    formData.append("emtitle_1", customerName); // #{고객명}
    formData.append("emtitle_2", className || "수영 특강"); // #{강의명}
    
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
    console.log("[알리고 알림톡] API 응답:", result);

    // 알리고 API는 JSON 또는 텍스트로 응답할 수 있음
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch {
      parsedResult = { raw: result };
    }

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
