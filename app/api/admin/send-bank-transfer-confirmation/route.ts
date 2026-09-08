import { NextRequest, NextResponse } from "next/server";
import { processBankTransferConfirmation } from "@/lib/bank-transfer-confirmation";

/**
 * 계좌이체 입금완료 → 예약확정 NHN 알림톡
 * Google Apps Script가 운영 시트 S열 "입금완료" 변경 시 호출
 *
 * POST /api/admin/send-bank-transfer-confirmation
 * Header: x-swimit-automation-secret: SHEET_AUTOMATION_SECRET
 * Body: { sheetName: "스윔잇 수강자 운영", rowNumber: 123 }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SHEET_AUTOMATION_SECRET?.trim() || "";
  const provided = req.headers.get("x-swimit-automation-secret") ?? "";

  if (!secret || provided !== secret) {
    console.warn("[입금확정API] 인증 실패");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { sheetName?: string; rowNumber?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const sheetName = String(body.sheetName || "").trim();
  const rowNumber = Number(body.rowNumber);

  if (!sheetName || !Number.isInteger(rowNumber) || rowNumber < 2) {
    return NextResponse.json(
      {
        success: false,
        error: "sheetName과 rowNumber(정수, 2 이상)가 필요합니다.",
      },
      { status: 400 },
    );
  }

  console.log("[입금확정API] 요청", { sheetName, rowNumber });

  try {
    const result = await processBankTransferConfirmation({
      sheetName,
      rowNumber,
    });

    console.log("[입금확정API] 결과", {
      sheetName: result.sheetName,
      rowNumber: result.rowNumber,
      success: result.success,
      skipped: result.skipped,
      alimtalkSent: result.alimtalkSent,
      reservationConfirmed: result.reservationConfirmed,
      templateCode: result.templateCode,
      reason: result.reason,
      error: result.error,
    });

    const status = result.success ? 200 : result.error?.includes("Unauthorized") ? 401 : 200;

    return NextResponse.json(
      {
        success: result.success,
        skipped: Boolean(result.skipped),
        reason: result.reason,
        rowNumber: result.rowNumber,
        sheetName: result.sheetName,
        reservationConfirmed: Boolean(result.reservationConfirmed),
        alimtalkSent: Boolean(result.alimtalkSent),
        templateCode: result.templateCode,
        requestId: result.requestId,
        error: result.error,
      },
      { status },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[입금확정API] 예외", { sheetName, rowNumber, message });
    return NextResponse.json(
      {
        success: false,
        skipped: false,
        sheetName,
        rowNumber,
        reservationConfirmed: false,
        alimtalkSent: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
