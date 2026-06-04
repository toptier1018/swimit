import { NextRequest, NextResponse } from "next/server";
import { appendRowToGoogleSheet, getSheetOrderNumbers } from "@/lib/google-sheets";
import {
  fetchAllNotionPaymentPages,
  notionPageToSheetRow,
} from "@/lib/notion-sheet-sync";

/**
 * Notion(주문번호 있음) → 구글 시트 누락분 일괄 복구
 * POST /api/admin/sync-sheets-from-notion
 * Header: x-sync-secret: SYNC_SHEETS_SECRET 환경변수와 동일
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SYNC_SHEETS_SECRET;
  const provided = req.headers.get("x-sync-secret") ?? "";

  if (!secret || provided !== secret) {
    console.warn("[시트복구] 인증 실패");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    console.log("[시트복구] 시작");

    const sheetKeys = await getSheetOrderNumbers();
    if (!sheetKeys.success) {
      return NextResponse.json(
        { success: false, error: sheetKeys.error },
        { status: 500 },
      );
    }

    const notionPages = await fetchAllNotionPaymentPages();
    const appended: string[] = [];
    const skipped: string[] = [];
    const failed: { orderNumber: string; error: string }[] = [];

    for (const page of notionPages) {
      const row = notionPageToSheetRow(page);
      if (!row) {
        skipped.push(page.id);
        continue;
      }

      if (sheetKeys.orderNumbers.has(row.신청번호)) {
        skipped.push(row.신청번호);
        continue;
      }

      const result = await appendRowToGoogleSheet(row);
      if (result.success) {
        sheetKeys.orderNumbers.add(row.신청번호);
        appended.push(`${row.신청번호} (${row.이름})`);
        console.log("[시트복구] 추가 완료:", row.신청번호, row.이름);
      } else {
        failed.push({ orderNumber: row.신청번호, error: result.error });
        console.error("[시트복구] 추가 실패:", row.신청번호, result.error);
      }
    }

    console.log("[시트복구] 완료:", {
      appended: appended.length,
      skipped: skipped.length,
      failed: failed.length,
    });

    return NextResponse.json({
      success: true,
      summary: {
        notionTotal: notionPages.length,
        appendedCount: appended.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
      },
      appended,
      failed,
    });
  } catch (error) {
    console.error("[시트복구] 예외:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
