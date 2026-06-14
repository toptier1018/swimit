import "server-only";
import type { GoogleSheetRowInput } from "@/lib/google-sheets";

type NotionRichText = { plain_text?: string };
type NotionPage = {
  id: string;
  properties: Record<string, unknown>;
};

function richText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const arr = (prop as { rich_text?: NotionRichText[] }).rich_text;
  if (!Array.isArray(arr)) return "";
  return arr.map((t) => t.plain_text ?? "").join("").trim();
}

function titleText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const arr = (prop as { title?: NotionRichText[] }).title;
  if (!Array.isArray(arr)) return "";
  return arr.map((t) => t.plain_text ?? "").join("").trim();
}

function dateStart(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const start = (prop as { date?: { start?: string } }).date?.start;
  return start ?? "";
}

/** Notion 결제 진행 시간 → 시트 접수일시 형식 (KST) */
export function formatNotionDateForSheet(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = get("hour");
    const minute = get("minute");
    const second = get("second");
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch {
    return iso.slice(0, 19).replace("T", " ");
  }
}

/** `[김포] 1부 특강 1레인 평영 A (초급)` 파싱 */
export function parseSelectedClassFull(full: string): {
  회차: string;
  레인: string;
  클래스: string;
} {
  const m = full.match(/^\[[^\]]+\]\s+(\d+부\s*특강)\s+(\d+레인)\s+(.+)$/);
  if (m) {
    const 회차 = m[1].replace(/\s+/g, " ").match(/\d+부/)?.[0] ?? m[1];
    return { 회차, 레인: m[2], 클래스: m[3].trim() };
  }
  return { 회차: "", 레인: "", 클래스: full };
}

/** 지역명 + classes 목록으로 특강 날짜 추정 */
const CLASS_DATES_BY_REGION: Record<string, string> = {
  서초: "2026-05-31",
  김포: "2026-06-14",
  화성: "2026-06-21",
  목동: "2026-06-28",
  "목동7/26": "2026-07-26",
  은평: "2026-07-05",
  삼정: "2026-07-05",
  인천: "2026-07-12",
  청라: "2026-07-12",
};

function guessClassDate(region: string, selectedClass: string): string {
  for (const [key, date] of Object.entries(CLASS_DATES_BY_REGION)) {
    if (region.includes(key) || selectedClass.includes(key)) return date;
  }
  if (selectedClass.includes("서초")) return CLASS_DATES_BY_REGION["서초"];
  if (selectedClass.includes("김포")) return CLASS_DATES_BY_REGION["김포"];
  if (selectedClass.includes("화성")) return CLASS_DATES_BY_REGION["화성"];
  if (selectedClass.includes("목동")) return CLASS_DATES_BY_REGION["목동"];
  if (selectedClass.includes("은평") || selectedClass.includes("삼정"))
    return CLASS_DATES_BY_REGION["은평"];
  if (selectedClass.includes("인천") || selectedClass.includes("청라"))
    return CLASS_DATES_BY_REGION["인천"];
  return "";
}

export function notionPageToSheetRow(page: NotionPage): GoogleSheetRowInput | null {
  const p = page.properties;
  const orderNumber = richText(p["주문번호"]);
  if (!orderNumber) return null;

  const name = titleText(p["이름"]);
  const phoneRaw = richText(p["전화번호"]);
  const selectedClass = richText(p["선택된 클래스"]);
  const region = richText(p["지역"]);
  const status = richText(p["가상계좌 입금 정보"]) || "입금대기";
  const parsed = parseSelectedClassFull(selectedClass);

  const paymentIso = dateStart(p["결제 진행 시간"]);

  return {
    접수일시: formatNotionDateForSheet(paymentIso),
    신청번호: orderNumber,
    이름: name,
    전화번호: phoneRaw ? `'${phoneRaw.replace(/-/g, "")}` : "",
    이메일: richText(p["이메일 (특강/ 수영 제품 할인 정보를 제공합니다)"]),
    성별: richText(p["성별"]),
    거주지역: richText(p["거주지역"]),
    수영경력: richText(p["수영을 배우신 지 얼마나 되셨나요?"]),
    통증부위: richText(
      p["수영 후 통증이 느껴지거나 불편한 부위가 있나요? (중복 선택 가능)"],
    ),
    해결문제: richText(p["이번 특강을 통해 가장 해결하고 싶은 단 하나는 무엇인가요?"]),
    클래스: parsed.클래스,
    회차: parsed.회차,
    레인: parsed.레인,
    날짜: guessClassDate(region, selectedClass),
    특강지역: region,
    예약상태: status,
  };
}

export async function fetchAllNotionPaymentPages(): Promise<NotionPage[]> {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!notionApiKey || !databaseId) {
    throw new Error("NOTION_API_KEY 또는 NOTION_DATABASE_ID가 없습니다.");
  }

  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
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
          filter: {
            property: "주문번호",
            rich_text: { is_not_empty: true },
          },
          sorts: [
            {
              property: "결제 진행 시간",
              direction: "ascending",
            },
          ],
          start_cursor: cursor,
          page_size: 100,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        `Notion 조회 실패: ${(err as { message?: string }).message ?? response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    pages.push(...data.results);
    cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
  } while (cursor);

  console.log("[시트복구] Notion 결제 건 조회:", pages.length);
  return pages;
}
