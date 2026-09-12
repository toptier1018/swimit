import "server-only";

import { getDiagnosisFishtankFormProgramOptions } from "@/lib/schedules";

/** 어항샷 영상 수령 신청 Google Form */
export const FISHTANK_FORM_ID =
  "11ONn_KIt4SFLXpcjbR3x840MgH3lOPPnFEVLd_3-PwU";

export const FISHTANK_FORM_QUESTION_TITLE =
  "참여 프로그램을 선택해주세요.";

/** 영상 수령은 특강 이후에도 신청하므로 과거 진단 유지 일수 */
export const FISHTANK_FORM_KEEP_PAST_DAYS = 90;

export type FishtankFormProgramsPayload = {
  ok: true;
  formId: string;
  questionTitle: string;
  keepPastDays: number;
  options: string[];
  count: number;
  items: {
    label: string;
    date: string;
    locationCode: string;
    enrollmentKey: string;
  }[];
};

/**
 * Apps Script / 관리자가 폼 선택지를 맞출 때 쓰는 진단 프로그램 목록
 */
export function buildFishtankFormProgramsPayload(): FishtankFormProgramsPayload {
  const items = getDiagnosisFishtankFormProgramOptions(
    FISHTANK_FORM_KEEP_PAST_DAYS,
  );
  const options = items.map((item) => item.label);

  console.log("[어항샷폼API] 페이로드", {
    count: options.length,
    first: options[0] ?? null,
    last: options[options.length - 1] ?? null,
  });

  return {
    ok: true,
    formId: FISHTANK_FORM_ID,
    questionTitle: FISHTANK_FORM_QUESTION_TITLE,
    keepPastDays: FISHTANK_FORM_KEEP_PAST_DAYS,
    options,
    count: options.length,
    items,
  };
}
