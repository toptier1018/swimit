"use server";

import { checkGoogleSheetDuplicateForSameClass } from "@/lib/ops-sheet-enrollment";

/**
 * 모든 클래스의 중복 신청 기준은 구글 시트입니다.
 * 운영 시트를 정본으로 보고, 운영에 아직 없는 최근 신청만 수강자 시트에서 확인합니다.
 */
export async function checkDuplicateForSameClass(data: {
  name: string;
  phone: string;
  selectedClass: string;
}) {
  return checkGoogleSheetDuplicateForSameClass(data);
}
