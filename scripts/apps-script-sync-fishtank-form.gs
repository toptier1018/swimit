/**
 * ============================================================
 * 스윔잇 — 어항샷 Google Form 「참여 프로그램」 선택지 자동 갱신
 * ============================================================
 *
 * [초보용 설치 방법]
 * 1. 어항샷 폼을 연 뒤, 점 3개 메뉴 → 스크립트 편집기
 *    (또는 https://script.google.com 에서 새 프로젝트)
 * 2. 이 파일 내용을 전부 복사해 붙여넣기 → 저장
 * 3. 함수 syncFishtankFormPrograms 선택 → 실행
 *    (처음이면 권한 허용: 폼 수정 + 외부 URL 연결)
 * 4. 트리거: 왼쪽 시계 아이콘 → 트리거 추가
 *    - 실행할 함수: syncFishtankFormPrograms
 *    - 이벤트 소스: 시간 기반
 *    - 매일 1회 (예: 오전 9시)
 *
 * [동작]
 * 사이트 API에서 진단 일정 목록을 받아
 * 폼의 「참여 프로그램을 선택해주세요.」 선택지를 통째로 교체합니다.
 * 예: 2026.08.23 동탄
 *
 * Form ID: 11ONn_KIt4SFLXpcjbR3x840MgH3lOPPnFEVLd_3-PwU
 */

var FISHTANK_FORM_ID = "11ONn_KIt4SFLXpcjbR3x840MgH3lOPPnFEVLd_3-PwU";
var QUESTION_TITLE = "참여 프로그램을 선택해주세요.";
var OPTIONS_API_URL = "https://swimit.vercel.app/api/fishtank-form-programs";

function syncFishtankFormPrograms() {
  Logger.log("[어항샷폼동기화] 시작");

  var response = UrlFetchApp.fetch(OPTIONS_API_URL, {
    method: "get",
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  var bodyText = response.getContentText() || "";

  if (code < 200 || code >= 300) {
    throw new Error("API HTTP " + code + ": " + bodyText.slice(0, 300));
  }

  var data = JSON.parse(bodyText);
  if (!data || data.ok !== true || !data.options || !data.options.length) {
    throw new Error(
      "API 응답에 options가 없습니다: " + bodyText.slice(0, 300),
    );
  }

  var options = data.options;
  Logger.log(
    "[어항샷폼동기화] 옵션 " +
      options.length +
      "개 / 첫=" +
      options[0] +
      " / 끝=" +
      options[options.length - 1],
  );

  var form = FormApp.openById(FISHTANK_FORM_ID);
  var item = findProgramChoiceItem_(form);
  if (!item) {
    throw new Error(
      '문항을 찾지 못했습니다. 제목이 정확히 "' +
        QUESTION_TITLE +
        '" 인지 확인하세요.',
    );
  }

  var type = item.getType();
  if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
    item.asMultipleChoiceItem().setChoiceValues(options);
  } else if (type === FormApp.ItemType.LIST) {
    item.asListItem().setChoiceValues(options);
  } else if (type === FormApp.ItemType.CHECKBOX) {
    item.asCheckboxItem().setChoiceValues(options);
  } else {
    throw new Error("지원하지 않는 문항 유형: " + type);
  }

  Logger.log("[어항샷폼동기화] 완료 — 선택지 " + options.length + "개 반영");
}

function findProgramChoiceItem_(form) {
  var items = form.getItems();
  var titleNorm = String(QUESTION_TITLE || "")
    .replace(/\s+/g, "")
    .replace(/\.$/, "");

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var t = String(item.getTitle() || "")
      .replace(/\s+/g, "")
      .replace(/\.$/, "");
    if (t === titleNorm || t.indexOf("참여프로그램을선택") === 0) {
      return item;
    }
  }
  return null;
}

/** 트리거 없이 수동 테스트할 때 실행 */
function testSyncFishtankFormPrograms() {
  syncFishtankFormPrograms();
}
