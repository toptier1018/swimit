/**
 * 스윔잇 — 계좌이체 입금완료 → 예약확정 알림톡
 * Google Apps Script용 샘플 (스프레드시트에 붙여 넣고 시크릿만 채우세요)
 *
 * API 성공 조건 (반드시 이 3가지 모두):
 *   1) HTTP 2xx
 *   2) result.ok === true
 *   3) result.sent === true
 *
 * 성공 시: R=예약확정, S=입금완료, T=예약확정 + T셀 clearNote()
 * 실패 시: R=예약확정, S=입금완료, T 빈칸 + T셀에 오류 메모
 *
 * ※ 서버도 동일하게 R/S/T·메모를 처리합니다. Apps Script는 이중 안전장치입니다.
 */

var SWIMIT_API_URL =
  "https://YOUR_DOMAIN/api/admin/send-bank-transfer-confirmation";
/** Vercel SHEET_AUTOMATION_SECRET 과 동일 값 */
var SWIMIT_AUTOMATION_SECRET = "REPLACE_ME";
var OPS_SHEET_NAME = "스윔잇 수강자 운영";

/**
 * onEdit 등에서 S열이 "입금완료"로 바뀌면 호출
 * @param {number} rowNumber 행 번호 (2 이상)
 */
function sendBankTransferConfirmation(rowNumber) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    OPS_SHEET_NAME,
  );
  if (!sheet) {
    Logger.log("시트 없음: " + OPS_SHEET_NAME);
    return;
  }

  var tCell = sheet.getRange(rowNumber, 20); // T열
  var rCell = sheet.getRange(rowNumber, 18); // R열
  var sCell = sheet.getRange(rowNumber, 19); // S열

  var payload = {
    sheetName: OPS_SHEET_NAME,
    rowNumber: Number(rowNumber),
  };

  var response;
  try {
    response = UrlFetchApp.fetch(SWIMIT_API_URL, {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-swimit-automation-secret": SWIMIT_AUTOMATION_SECRET,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (e) {
    rCell.setValue("예약확정");
    sCell.setValue("입금완료");
    tCell.setValue("");
    tCell.setNote("알림톡 발송 실패: " + String(e));
    return;
  }

  var code = response.getResponseCode();
  var bodyText = response.getContentText() || "";
  var result = {};
  try {
    result = JSON.parse(bodyText);
  } catch (parseErr) {
    result = {};
  }

  var httpOk = code >= 200 && code < 300;
  var apiOk = result.ok === true && result.sent === true;
  var success = httpOk && apiOk;

  Logger.log(
    "[입금확정] row=" +
      rowNumber +
      " HTTP=" +
      code +
      " ok=" +
      result.ok +
      " sent=" +
      result.sent +
      " success=" +
      success,
  );

  if (success) {
    rCell.setValue("예약확정");
    sCell.setValue("입금완료");
    tCell.setValue("예약확정");
    tCell.clearNote();
    return;
  }

  // 실패: 값은 유지 규칙, T는 빈칸 + 오류 메모만
  rCell.setValue("예약확정");
  sCell.setValue("입금완료");
  tCell.setValue("");
  var errMsg =
    (result && result.error) ||
    (result && result.reason) ||
    "알림톡 발송 실패: HTTP " + code;
  tCell.setNote(String(errMsg));
}
