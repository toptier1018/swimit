/**
 * 신규 센터(대구/은평힐스/송파) 예약확정 알림톡 매핑 dry-run
 * - 실제 NHN 발송 없음
 * - 템플릿 선택 + 변수 치환 + 중복키 + 오매칭 방지만 검증
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { getNhnBankConfirmTemplateCode } from "../lib/nhn-bank-confirm-templates";
import { resolveClassScheduleFromEnrollmentKey } from "../lib/class-schedule-data";

try {
  const envText = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v.replace(/\\n/g, "\n");
  }
} catch {
  // .env 없어도 매핑 테스트는 진행
}

/** server-only 모듈 회피 — 운영 formatAlimtalkClassDateLabel과 동일 규칙 */
function formatAlimtalkClassDateLabel(input: {
  classDate?: string;
  selectedClass?: string;
}): string {
  const raw = String(input.classDate || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}년 ${Number(iso[2])}월 ${Number(iso[3])}일`;
  }
  const fromKey = String(input.selectedClass || "").match(
    /\[(?:[^\]]*?)\s+(\d{1,2})\/(\d{1,2})\]/,
  );
  if (fromKey) {
    return `2026년 ${Number(fromKey[1])}월 ${Number(fromKey[2])}일`;
  }
  return raw;
}

type Case = {
  label: string;
  path: "toss-card" | "sheet-S";
  center: string;
  selectedClass?: string;
  className: string;
  program?: string;
  expectedTemplate: string;
  expectedKakao?: string;
  orderId: string;
};

const EXPECTED_VARS = ["고객명", "특강일", "장소", "클래스명", "타임"] as const;

const cases: Case[] = [
  {
    label: "대구 · 특강 · 카드",
    path: "toss-card",
    center: "대구 · 올스위머 상인점",
    selectedClass: "[대구 12/5] 1부 특강 평영",
    className: "평영",
    expectedTemplate: "SWIMIT_DA_V1",
    expectedKakao: "SWIMIT_DA_V1_TuD9DsrEY",
    orderId: "TEST-DA-CARD-001",
  },
  {
    label: "대구 · 특강 · S열",
    path: "sheet-S",
    center: "대구 · 올스위머 상인점",
    className: "접영",
    expectedTemplate: "SWIMIT_DA_V1",
    expectedKakao: "SWIMIT_DA_V1_TuD9DsrEY",
    orderId: "NR-TEST-DA-001",
  },
  {
    label: "은평힐스 · 특강 · 카드",
    path: "toss-card",
    center: "서울 은평 · 북한산힐스테이트3차",
    selectedClass: "[은평 12/12] 1부 특강 자유형",
    className: "자유형",
    expectedTemplate: "SWIMIT_HS_V1",
    expectedKakao: "SWIMIT_HS_V1_Ihhs30ird",
    orderId: "TEST-HS-CARD-001",
  },
  {
    label: "은평힐스 · 스타트 · S열",
    path: "sheet-S",
    center: "서울 은평 · 북한산힐스테이트3차",
    className: "스타트",
    expectedTemplate: "SWIMIT_HS_V1",
    expectedKakao: "SWIMIT_HS_V1_Ihhs30ird",
    orderId: "NR-TEST-HS-001",
  },
  {
    label: "송파 · 특강 · 카드",
    path: "toss-card",
    center: "서울 송파 · 헬스보이짐",
    selectedClass: "[송파 12/19] 1부 특강 접영",
    className: "접영",
    expectedTemplate: "SWIMIT_SH_V1",
    expectedKakao: "SWIMIT_SH_V1_zhsCdsrPj",
    orderId: "TEST-SH-CARD-001",
  },
  {
    label: "송파 · 진단 · S열",
    path: "sheet-S",
    center: "서울 송파 · 헬스보이짐",
    className: "진단",
    program: "진단",
    expectedTemplate: "SWIMIT_SH_V1",
    expectedKakao: "SWIMIT_SH_V1_zhsCdsrPj",
    orderId: "NR-TEST-SH-001",
  },
];

const antiCases: Array<{ center: string; mustNot: string; label: string }> = [
  {
    label: "송파는 강남 KM 미사용",
    center: "서울 송파 · 헬스보이짐",
    mustNot: "SWIMIT_KM_V1",
  },
  {
    label: "힐스테이트는 삼정 EP 미사용",
    center: "서울 은평 · 북한산힐스테이트3차",
    mustNot: "SWIMIT_EP_V1",
  },
  {
    label: "강남은 KM 유지",
    center: "강남 · 와이키키 링크&스윔",
    mustNot: "SWIMIT_SH_V1",
  },
];

function buildParams(c: Case) {
  const schedule = c.selectedClass
    ? resolveClassScheduleFromEnrollmentKey(c.selectedClass)?.schedule
    : null;
  const place = schedule?.location || c.center;
  const classDateLabel = formatAlimtalkClassDateLabel({
    classDate: schedule
      ? `${schedule.year}-${String(schedule.month).padStart(2, "0")}-${String(schedule.dateNum).padStart(2, "0")}`
      : undefined,
    selectedClass: c.selectedClass,
  });
  const session =
    c.selectedClass?.match(/(\d+부)/)?.[1] ||
    "1부";
  const params = {
    고객명: "테스트고객",
    특강일: classDateLabel || "2026년 12월 5일",
    장소: place,
    클래스명: c.className,
    타임: session,
  };
  return params;
}

function cardIdempotencyKey(orderId: string) {
  return `SWIMIT-CARD-CONFIRM-${orderId.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100)}`;
}

async function probeNhnTemplate(templateCode: string) {
  const appKey = process.env.NHN_APPKEY?.trim();
  const secretKey = process.env.NHN_SECRET_KEY?.trim();
  const senderKey = process.env.NHN_SENDER_KEY?.trim();
  if (!appKey || !secretKey || !senderKey) {
    return {
      checked: false as const,
      reason: "NHN env 없음 — 승인 상태 미확인",
    };
  }

  // NHN 템플릿 조회 (발송 아님). 실패해도 매핑 테스트와 분리 보고.
  const urls = [
    `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/senders/${senderKey}/templates/${templateCode}`,
    `https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/${appKey}/senders/${senderKey}/templates/${templateCode}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "X-Secret-Key": secretKey },
      });
      const body = await res.json().catch(() => ({}));
      const template = body?.template || {};
      const messageText = String(
        template.templateContent || template.message || template.content || "",
      );
      const vars = [
        ...new Set(
          [...messageText.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]),
        ),
      ];
      return {
        checked: true as const,
        httpStatus: res.status,
        isSuccessful: Boolean(body?.header?.isSuccessful),
        resultCode: body?.header?.resultCode,
        resultMessage: body?.header?.resultMessage,
        status: template.status ?? body?.message?.status,
        statusName: template.statusName,
        kakaoTemplateCode: template.kakaoTemplateCode,
        vars,
        sendable: template.status === "TSC03",
      };
    } catch (error) {
      return {
        checked: true as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { checked: false as const, reason: "조회 URL 없음" };
}

async function main() {
  console.log("=== 신규 센터 알림톡 매핑 dry-run (실발송 없음) ===\n");

  let failed = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const c of cases) {
    const picked = getNhnBankConfirmTemplateCode({
      center: c.center,
      className: c.className,
      program: c.program,
    });
    const params = buildParams(c);
    const missing = EXPECTED_VARS.filter((k) => {
      const v = params[k];
      return !v || /#\{/.test(v);
    });
    const okTemplate = picked.templateCode === c.expectedTemplate;
    const okKakao =
      !c.expectedKakao || picked.kakaoTemplateCode === c.expectedKakao;
    const okVars = missing.length === 0;
    const pass = okTemplate && okKakao && okVars;
    if (!pass) failed += 1;

    const row = {
      label: c.label,
      path: c.path,
      templateCode: picked.templateCode,
      kakaoTemplateCode: picked.kakaoTemplateCode ?? null,
      expectedTemplate: c.expectedTemplate,
      params,
      idempotencyKey:
        c.path === "toss-card"
          ? cardIdempotencyKey(c.orderId)
          : `bank-confirm:${c.orderId}`,
      duplicateGuard:
        c.path === "toss-card"
          ? "Notion CA_NOTIFIED / CA_NOTIFYING + X-NC-API-IDEMPOTENCY-KEY"
          : "운영시트 T=예약확정 또는 예약확정 발송중 + idempotencyKey",
      pass,
      missingVars: missing,
    };
    results.push(row);
    console.log(pass ? "PASS" : "FAIL", c.label, {
      templateCode: picked.templateCode,
      kakao: picked.kakaoTemplateCode,
      params,
    });
  }

  console.log("\n--- 오매칭 방지 ---");
  for (const a of antiCases) {
    const picked = getNhnBankConfirmTemplateCode({
      center: a.center,
      className: "자유형",
    });
    const pass = picked.templateCode !== a.mustNot;
    if (!pass) failed += 1;
    console.log(pass ? "PASS" : "FAIL", a.label, {
      got: picked.templateCode,
      mustNot: a.mustNot,
    });
  }

  // 짧은 '은평'만으로는 템플릿을 고르지 않아야 함 (삼정/힐스 혼동 방지)
  console.log("\n--- 짧은 지역명 거절 ---");
  try {
    getNhnBankConfirmTemplateCode({ center: "은평", className: "자유형" });
    console.log("FAIL 짧은 '은평'이 매칭됨 (거절해야 함)");
    failed += 1;
  } catch {
    console.log("PASS 짧은 '은평' 거절");
  }

  console.log("\n--- NHN 템플릿 승인 조회 (가능 시) ---");
  const uniqueCodes = [...new Set(cases.map((c) => c.expectedTemplate))];
  for (const code of uniqueCodes) {
    const probe = await probeNhnTemplate(code);
    console.log(code, probe);
    results.push({ nhnProbe: code, ...probe });
  }

  console.log("\n=== 요약 ===");
  console.log({
    caseCount: cases.length,
    failed,
    note: "실고객 발송 없음. 승인/발송가능은 nhnProbe 결과만 신뢰.",
  });

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
