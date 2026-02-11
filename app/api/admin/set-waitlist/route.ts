import { NextRequest, NextResponse } from "next/server";

/**
 * 관리자용 예약대기 설정 API (Notion 기반)
 * 
 * 개발자 모드에서 예약대기 버튼 클릭 시 Notion에 저장하여
 * 모든 사용자에게 예약대기 상태를 영구적으로 적용합니다.
 */

/**
 * Notion에서 예약대기 클래스 목록 조회
 */
async function getWaitlistFromNotion() {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CLASS_SETTINGS_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  const response = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          property: "수동 예약대기",
          checkbox: {
            equals: true
          }
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Notion 조회 실패");
  }

  const result = await response.json();
  const pages = result.results || [];

  const waitlistClasses = pages.map((page: any) => {
    return page.properties["클래스명"]?.title?.[0]?.plain_text || "";
  }).filter((name: string) => name);

  console.log("[Notion 조회] 예약대기 클래스:", waitlistClasses);
  return waitlistClasses;
}

/**
 * Notion에서 특정 클래스의 예약대기 상태 업데이트
 */
async function updateWaitlistInNotion(className: string, isWaitlist: boolean) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CLASS_SETTINGS_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  console.log("[Notion 업데이트] 클래스 검색:", className);

  // 먼저 해당 클래스 페이지 찾기
  const queryResponse = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          property: "클래스명",
          title: {
            equals: className
          }
        }
      }),
    }
  );

  if (!queryResponse.ok) {
    throw new Error("Notion 클래스 검색 실패");
  }

  const queryResult = await queryResponse.json();
  const pages = queryResult.results || [];

  if (pages.length === 0) {
    throw new Error(`클래스를 찾을 수 없습니다: ${className}`);
  }

  const pageId = pages[0].id;
  console.log("[Notion 업데이트] 클래스 찾음:", { className, pageId });

  // 체크박스 업데이트
  const updateResponse = await fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          "수동 예약대기": {
            checkbox: isWaitlist
          }
        }
      }),
    }
  );

  if (!updateResponse.ok) {
    throw new Error("Notion 업데이트 실패");
  }

  console.log("[Notion 업데이트] 완료:", { className, isWaitlist });
}

export async function POST(request: NextRequest) {
  try {
    const { className, action } = await request.json();

    console.log("[관리자 API] 예약대기 설정 요청:", { className, action });

    if (!className || !action) {
      return NextResponse.json(
        { success: false, error: "className과 action이 필요합니다." },
        { status: 400 }
      );
    }

    const isWaitlist = action === "add";

    // Notion에 업데이트
    await updateWaitlistInNotion(className, isWaitlist);

    // 최신 목록 조회
    const waitlistClasses = await getWaitlistFromNotion();

    console.log("[관리자 API] 현재 예약대기 클래스:", waitlistClasses);

    return NextResponse.json({
      success: true,
      manualWaitlistClasses: waitlistClasses,
    });
  } catch (error) {
    console.error("[관리자 API] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[관리자 API] 예약대기 클래스 조회");
    
    const waitlistClasses = await getWaitlistFromNotion();
    
    return NextResponse.json({
      success: true,
      manualWaitlistClasses: waitlistClasses,
    });
  } catch (error) {
    console.error("[관리자 API] 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
