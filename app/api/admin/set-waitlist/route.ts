import { NextRequest, NextResponse } from "next/server";

function extractPlainTextFromNotionTextArray(arr: any): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((t) => String(t?.plain_text || ""))
    .join("")
    .trim();
}

function getClassNameFromPage(page: any): string {
  const prop = page?.properties?.["클래스명"];
  const titleText = extractPlainTextFromNotionTextArray(prop?.title);
  if (titleText) return titleText;
  const richText = extractPlainTextFromNotionTextArray(prop?.rich_text);
  return richText;
}

function getCheckboxProp(page: any, candidates: string[]): boolean | null {
  for (const key of candidates) {
    const v = page?.properties?.[key]?.checkbox;
    if (typeof v === "boolean") return v;
  }
  return null;
}

function getNumberProp(page: any, candidates: string[]): number | null {
  for (const key of candidates) {
    const v = page?.properties?.[key]?.number;
    if (typeof v === "number") return v;
  }
  return null;
}

/**
 * 관리자용 예약대기 설정 API (Notion 기반)
 *
 * 개발자 모드에서 예약대기 버튼 클릭 시 Notion에 저장하여
 * 모든 사용자에게 예약대기 상태를 영구적으로 적용합니다.
 */

/**
 * Notion에서 클래스 설정 전체 조회
 */
async function getClassSettingsFromNotion() {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CLASS_SETTINGS_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  const waitlistClasses: string[] = [];
  const thresholds: Record<string, number> = {};

  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          page_size: 100,
          start_cursor: startCursor,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[Notion 조회] 실패:", response.status, text);
      throw new Error("Notion 조회 실패");
    }

    const result = await response.json();
    const pages = result.results || [];

    for (const page of pages) {
      const className: string = getClassNameFromPage(page);
      if (!className) continue;

      const manualWaitlist =
        getCheckboxProp(page, ["수동 예약대기", "수동예약대기"]) === true;
      if (manualWaitlist) waitlistClasses.push(className);

      const thresholdVal = getNumberProp(page, [
        "예약대기 기준",
        "예약대기 기준 인원",
        "기준 인원",
      ]);
      if (typeof thresholdVal === "number") thresholds[className] = thresholdVal;
    }

    hasMore = result.has_more === true;
    startCursor = result.next_cursor || undefined;
  }

  console.log("[Notion 조회] 예약대기 클래스:", waitlistClasses);
  console.log("[Notion 조회] 예약대기 기준(thresholds):", thresholds);
  return { waitlistClasses, thresholds };
}

/**
 * Notion에서 특정 클래스 설정 페이지 찾기
 */
async function findClassPageIdByName(className: string) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CLASS_SETTINGS_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  console.log("[Notion 조회] 클래스 검색(스캔):", className);

  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const queryResponse = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          page_size: 100,
          start_cursor: startCursor,
        }),
      }
    );

    if (!queryResponse.ok) {
      const text = await queryResponse.text().catch(() => "");
      console.error("[Notion 조회] 클래스 스캔 실패:", queryResponse.status, text);
      throw new Error("Notion 클래스 검색 실패");
    }

    const queryResult = await queryResponse.json();
    const pages = queryResult.results || [];

    for (const page of pages) {
      const name = getClassNameFromPage(page);
      if (name && name === className) {
        const pageId: string = page.id;
        console.log("[Notion 조회] 클래스 찾음:", { className, pageId });
        return pageId;
      }
    }

    hasMore = queryResult.has_more === true;
    startCursor = queryResult.next_cursor || undefined;
  }

  return null;
}

/**
 * Notion에 클래스 설정 페이지 생성 (없으면 자동 생성)
 */
async function ensureClassSettingsPage(className: string) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CLASS_SETTINGS_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  const existing = await findClassPageIdByName(className);
  if (existing) return existing;

  console.log("[Notion 생성] 클래스 설정 페이지 생성:", className);

  const baseHeaders = {
    Authorization: `Bearer ${notionApiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  const tryCreate = async (properties: Record<string, any>) => {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text, json: text ? JSON.parse(text) : null };
  };

  // 1) 가장 이상적인 케이스: 클래스명(title) + 수동 예약대기 + 예약대기 기준
  // 2) 예약대기 기준 컬럼이 없으면 1)이 실패할 수 있으므로, 기준 없이 재시도
  // 3) 클래스명이 title이 아니라 rich_text인 경우도 있어서 그 케이스로 재시도
  const attempts: Array<Record<string, any>> = [
    {
      클래스명: { title: [{ text: { content: className } }] },
      "수동 예약대기": { checkbox: false },
      "예약대기 기준": { number: 10 },
    },
    {
      클래스명: { title: [{ text: { content: className } }] },
      "수동 예약대기": { checkbox: false },
    },
    {
      클래스명: { rich_text: [{ text: { content: className } }] },
      "수동 예약대기": { checkbox: false },
      "예약대기 기준": { number: 10 },
    },
    {
      클래스명: { rich_text: [{ text: { content: className } }] },
      "수동 예약대기": { checkbox: false },
    },
  ];

  for (const props of attempts) {
    const { ok, status, text, json } = await tryCreate(props);
    if (ok && json?.id) return json.id as string;
    console.error("[Notion 생성] 시도 실패:", status, text);
  }

  throw new Error(
    "클래스 설정 행을 만들 수 없습니다. Notion DB에 '클래스명'(제목 또는 텍스트), '수동 예약대기'(체크박스) 컬럼이 있는지 확인해주세요."
  );
}

/**
 * Notion에서 특정 클래스의 예약대기 상태 업데이트
 */
async function updateWaitlistInNotion(className: string, isWaitlist: boolean) {
  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  const pageId = await ensureClassSettingsPage(className);
  console.log("[Notion 업데이트] 예약대기 업데이트:", { className, pageId, isWaitlist });

  // 체크박스 업데이트
  const updateResponse = await fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          "수동 예약대기": {
            checkbox: isWaitlist,
          },
        },
      }),
    }
  );

  if (!updateResponse.ok) {
    const text = await updateResponse.text().catch(() => "");
    console.error("[Notion 업데이트] 실패:", updateResponse.status, text);
    throw new Error("Notion 업데이트 실패");
  }

  console.log("[Notion 업데이트] 완료:", { className, isWaitlist });
}

async function updateThresholdInNotion(className: string, threshold: number) {
  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    throw new Error("Notion 환경 변수가 설정되지 않았습니다");
  }

  const pageId = await ensureClassSettingsPage(className);
  console.log("[Notion 업데이트] 예약대기 기준 업데이트:", { className, pageId, threshold });

  const updateResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      properties: {
        "예약대기 기준": {
          number: threshold,
        },
      },
    }),
  });

  if (!updateResponse.ok) {
    const text = await updateResponse.text().catch(() => "");
    console.error("[Notion 업데이트] 기준 업데이트 실패:", updateResponse.status, text);
    throw new Error(
      "예약대기 기준을 저장할 수 없습니다. Notion DB에 '예약대기 기준'(숫자) 컬럼이 있는지 확인해주세요."
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { className, classNames, action, threshold } = await request.json();

    console.log("[관리자 API] 요청:", { className, action, threshold, classNamesCount: Array.isArray(classNames) ? classNames.length : undefined });

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action이 필요합니다." },
        { status: 400 }
      );
    }

    if (action === "ensure") {
      if (!Array.isArray(classNames) || classNames.length === 0) {
        return NextResponse.json(
          { success: false, error: "classNames 배열이 필요합니다." },
          { status: 400 }
        );
      }
      for (const name of classNames) {
        await ensureClassSettingsPage(String(name));
      }
      const settings = await getClassSettingsFromNotion();
      return NextResponse.json({
        success: true,
        manualWaitlistClasses: settings.waitlistClasses,
        thresholds: settings.thresholds,
      });
    }

    if (action === "bulkAdd" || action === "bulkRemove") {
      if (!Array.isArray(classNames) || classNames.length === 0) {
        return NextResponse.json(
          { success: false, error: "classNames 배열이 필요합니다." },
          { status: 400 }
        );
      }
      const isWaitlist = action === "bulkAdd";
      for (const name of classNames) {
        await updateWaitlistInNotion(String(name), isWaitlist);
      }
      const settings = await getClassSettingsFromNotion();
      return NextResponse.json({
        success: true,
        manualWaitlistClasses: settings.waitlistClasses,
        thresholds: settings.thresholds,
      });
    }

    if (action === "setThreshold") {
      if (!className || typeof threshold !== "number") {
        return NextResponse.json(
          { success: false, error: "className과 threshold(number)가 필요합니다." },
          { status: 400 }
        );
      }
      await updateThresholdInNotion(String(className), threshold);
      const settings = await getClassSettingsFromNotion();
      return NextResponse.json({
        success: true,
        manualWaitlistClasses: settings.waitlistClasses,
        thresholds: settings.thresholds,
      });
    }

    if (!className) {
      return NextResponse.json(
        { success: false, error: "className이 필요합니다." },
        { status: 400 }
      );
    }

    const isWaitlist = action === "add";

    // Notion에 업데이트 (없으면 자동 생성)
    await updateWaitlistInNotion(String(className), isWaitlist);

    // 최신 목록 조회
    const settings = await getClassSettingsFromNotion();

    console.log("[관리자 API] 현재 예약대기 클래스:", settings.waitlistClasses);

    return NextResponse.json({
      success: true,
      manualWaitlistClasses: settings.waitlistClasses,
      thresholds: settings.thresholds,
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

    const settings = await getClassSettingsFromNotion();

    return NextResponse.json({
      success: true,
      manualWaitlistClasses: settings.waitlistClasses,
      thresholds: settings.thresholds,
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
