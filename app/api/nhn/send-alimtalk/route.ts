import { NextRequest, NextResponse } from "next/server";

async function updateAlimtalkLogInNotion(params: {
  pageId: string;
  alimtalkSent: boolean;
  failureReason?: string;
}) {
  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  const nowIso = new Date().toISOString();
  const safeReason =
    params.failureReason && params.failureReason.length > 1800
      ? params.failureReason.slice(0, 1800) + "…"
      : params.failureReason;

  const properties: Record<string, any> = {
    "알림톡 발송": { checkbox: params.alimtalkSent },
    "발송 시간": { date: { start: nowIso } },
    "SMS 대체 발송": { checkbox: false },
  };

  if (params.alimtalkSent) {
    properties["발송 실패 사유"] = { rich_text: [] };
  } else {
    properties["발송 실패 사유"] = {
      rich_text: safeReason
        ? [{ text: { content: safeReason } }]
        : [{ text: { content: "알림톡 발송 실패" } }],
    };
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${params.pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Notion 알림톡 기록 실패 (${response.status}): ${text}`);
  }
}

/**
 * NHN Cloud 알림톡 발송 API
 * 
 * 입금대기 상태인 고객에게 알림톡을 자동으로 발송합니다.
 * IP 제한이 없어 Vercel 같은 서버리스 환경에 최적화되어 있습니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { customerName, customerPhone, className, pageId } = await request.json();

    console.log("[NHN Cloud 알림톡] 발송 요청:", {
      customerName,
      customerPhone,
      className,
      pageId,
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

    // NHN Cloud 알림톡 API 호출 (/messages: 템플릿 치환 발송)
    // - 템플릿 본문/버튼은 NHN 콘솔에 등록된 "v1" 템플릿 그대로 사용
    // - 여기서는 templateParameter(가변 인자)만 전달해야 합니다.
    const requestBody = {
      senderKey,
      templateCode,
      recipientList: [
        {
          recipientNo: receiverPhone,
          templateParameter: {
            고객명: customerName,
            클래스명: className,
          },
        },
      ],
    };

    console.log("[NHN Cloud 알림톡] 요청 본문:", {
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
      if (pageId) {
        try {
          console.log("[NHN Cloud 알림톡] Notion 기록 시작(성공):", pageId);
          await updateAlimtalkLogInNotion({ pageId, alimtalkSent: true });
          console.log("[NHN Cloud 알림톡] Notion 기록 완료(성공):", pageId);
        } catch (e) {
          console.error("[NHN Cloud 알림톡] Notion 기록 실패(성공 케이스):", e);
        }
      } else {
        console.log("[NHN Cloud 알림톡] pageId 없음 - Notion 기록 생략");
      }
      return NextResponse.json({
        success: true,
        message: "알림톡이 성공적으로 발송되었습니다.",
        data: result,
      });
    } else {
      console.error("[NHN Cloud 알림톡] 발송 실패:", result);
      if (pageId) {
        const reason =
          result.header?.resultMessage || result.message || "알림톡 발송에 실패했습니다.";
        try {
          console.log("[NHN Cloud 알림톡] Notion 기록 시작(실패):", {
            pageId,
            reason,
          });
          await updateAlimtalkLogInNotion({
            pageId,
            alimtalkSent: false,
            failureReason: reason,
          });
          console.log("[NHN Cloud 알림톡] Notion 기록 완료(실패):", pageId);
        } catch (e) {
          console.error("[NHN Cloud 알림톡] Notion 기록 실패(실패 케이스):", e);
        }
      } else {
        console.log("[NHN Cloud 알림톡] pageId 없음 - Notion 기록 생략");
      }
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
