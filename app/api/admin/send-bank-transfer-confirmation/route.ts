import { NextRequest, NextResponse } from "next/server";
import { processBankTransferConfirmation } from "@/lib/bank-transfer-confirmation";

/**
 * 계좌이체 입금완료 → 예약확정 NHN 알림톡
 * Google Apps Script가 운영 시트 S열 "입금완료" 변경 시 호출
 *
 * POST /api/admin/send-bank-transfer-confirmation
 * Header: x-swimit-automation-secret: SHEET_AUTOMATION_SECRET
 * Body: { sheetName: "스윔잇 수강자 운영", rowNumber: 123 }
 *
 * Apps Script 성공 조건:
 *   HTTP 2xx AND result.ok === true AND result.sent === true
 *
 * 성공 예: { "ok": true, "sent": true }
 * 실패 예: { "ok": false, "sent": false, "error": "..." }  (NHN 실패 시 HTTP 502)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SHEET_AUTOMATION_SECRET?.trim() || "";
  const provided = req.headers.get("x-swimit-automation-secret") ?? "";

  if (!secret || provided !== secret) {
    console.warn("[입금확정API] 인증 실패");
    return NextResponse.json(
      { ok: false, sent: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { sheetName?: string; rowNumber?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, sent: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const sheetName = String(body.sheetName || "").trim();
  const rowNumber = Number(body.rowNumber);

  if (!sheetName || !Number.isInteger(rowNumber) || rowNumber < 2) {
    return NextResponse.json(
      {
        ok: false,
        sent: false,
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

    const ok = Boolean(result.ok);
    const sent = Boolean(result.sent);

    console.log("[입금확정API] 결과", {
      sheetName: result.sheetName,
      rowNumber: result.rowNumber,
      reservationId: result.reservationId,
      ok,
      sent,
      alreadySent: result.alreadySent,
      skipped: result.skipped,
      nhnSendFailed: result.nhnSendFailed,
      templateCode: result.templateCode,
      idempotencyKey: result.idempotencyKey,
      reason: result.reason,
      error: result.error,
    });

    // NHN 발송 실패는 HTTP 200으로 위장하지 않음
    let status = 200;
    if (ok && sent) {
      status = 200;
    } else if (result.nhnSendFailed) {
      status = 502;
    } else if (!ok) {
      // 스킵·검증 실패 등: JSON으로 구분 (Apps Script는 ok/sent로 판정)
      status = 422;
    }

    return NextResponse.json(
      {
        ok,
        sent,
        alreadySent: Boolean(result.alreadySent),
        skipped: Boolean(result.skipped),
        reason: result.reason,
        rowNumber: result.rowNumber,
        sheetName: result.sheetName,
        reservationId: result.reservationId,
        reservationConfirmed: Boolean(result.reservationConfirmed),
        templateCode: result.templateCode,
        requestId: result.requestId,
        error: result.error,
        // 하위 호환 (구 Apps Script가 success/alimtalkSent를 보던 경우)
        success: ok,
        alimtalkSent: sent,
      },
      { status },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[입금확정API] 예외", { sheetName, rowNumber, message });
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        skipped: false,
        sheetName,
        rowNumber,
        reservationConfirmed: false,
        error: message,
        success: false,
        alimtalkSent: false,
      },
      { status: 500 },
    );
  }
}
