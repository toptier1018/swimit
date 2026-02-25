import { NextRequest, NextResponse } from "next/server";

/**
 * NHN Cloud 알림톡 발송 API
 * 
 * 입금대기 상태인 고객에게 알림톡을 자동으로 발송합니다.
 * IP 제한이 없어 Vercel 같은 서버리스 환경에 최적화되어 있습니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { customerName, customerPhone, className } = await request.json();

    console.log("[NHN Cloud 알림톡] 발송 요청:", {
      customerName,
      customerPhone,
      className,
    });

    // 환경 변수 확인
    const appKey = process.env.NHN_APPKEY;
    const secretKey = process.env.NHN_SECRET_KEY;
    const senderKey = process.env.NHN_SENDER_KEY;
    const templateCode = process.env.NHN_TEMPLATE_CODE;

    if (!appKey || !secretKey || !senderKey || !templateCode) {
      console.error("[NHN Cloud 알림톡] 환경 변수가 설정되지 않았습니다");
      return NextResponse.json(
        { success: false, error: "NHN Cloud API 설정이 올바르지 않습니다." },
        { status: 500 }
      );
    }

    // 전화번호 형식 정리 (하이픈 제거)
    const receiverPhone = customerPhone.replace(/-/g, "");

    console.log("[NHN Cloud 알림톡] API 호출 준비:", {
      appKey: appKey.substring(0, 10) + "...",
      secretKey: secretKey.substring(0, 10) + "...",
      senderKey: senderKey.substring(0, 10) + "...",
      templateCode,
      receiver: receiverPhone,
    });

    // NHN Cloud 알림톡 API 호출
    const requestBody = {
      plusFriendId: "@스윔잇",
      senderKey: senderKey,
      templateCode: templateCode,
      recipientList: [
        {
          recipientNo: receiverPhone,
          content: `안녕하세요, 스윔잇입니다 😊  
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
저희가 잘 챙기고 있을게요 🙂

👉 농협 302-1710-5277-51 장연성`,
          templateParameter: {
            "고객명": customerName,
            "클래스명": className
          },
          buttons: [
            {
              name: "채널추가",
              type: "AC"
            }
          ]
        }
      ]
    };

    console.log("[NHN Cloud 알림톡] 요청 본문:", {
      plusFriendId: "@스윔잇",
      templateCode,
      recipient: receiverPhone,
      parameters: requestBody.recipientList[0].templateParameter,
    });

    const response = await fetch(
      `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Secret-Key": secretKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();
    console.log("[NHN Cloud 알림톡] API 응답:", JSON.stringify(result, null, 2));

    // 성공 여부 확인
    // NHN Cloud는 header.isSuccessful === true이면 성공
    if (result.header?.isSuccessful) {
      console.log("[NHN Cloud 알림톡] 발송 성공:", customerName);
      return NextResponse.json({
        success: true,
        message: "알림톡이 성공적으로 발송되었습니다.",
        data: result,
      });
    } else {
      console.error("[NHN Cloud 알림톡] 발송 실패:", result);
      return NextResponse.json(
        {
          success: false,
          error: result.header?.resultMessage || result.message || "알림톡 발송에 실패했습니다.",
          data: result,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[NHN Cloud 알림톡] 예외 발생:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
