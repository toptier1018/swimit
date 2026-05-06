import { NextRequest, NextResponse } from "next/server";
import { getFunnelDailyTotals, upsertFunnelDailyTotals } from "@/app/actions/notion";

type FunnelTotals = Record<0 | 1 | 2 | 3 | 4, number>;

type FunnelStore = {
  ipDaily: Set<string>;
  totalsByKey: Record<string, FunnelTotals>;
};

const createEmptyTotals = (): FunnelTotals => ({
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
});

const getStore = () => {
  const globalForFunnel = globalThis as unknown as { funnelStore?: FunnelStore };
  if (!globalForFunnel.funnelStore) {
    globalForFunnel.funnelStore = {
      ipDaily: new Set<string>(),
      totalsByKey: {},
    };
  }
  return globalForFunnel.funnelStore;
};

const getTotalsKey = (dateKey: string, video: string) => `${dateKey}|${video || "__default__"}`;

const getStoreTotals = (store: FunnelStore, key: string) => {
  if (!store.totalsByKey[key]) {
    store.totalsByKey[key] = createEmptyTotals();
  }
  return store.totalsByKey[key];
};

const getKoreanDateString = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date()
  );
};

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
};

export async function GET(req: NextRequest) {
  const dateKey = getKoreanDateString();
  const video = req.nextUrl.searchParams.get("video")?.trim() || "";
  const result = await getFunnelDailyTotals(dateKey, video);
  if (result.success) {
    return NextResponse.json({ totals: result.totals });
  }
  const store = getStore();
  return NextResponse.json({ totals: getStoreTotals(store, getTotalsKey(dateKey, video)) });
}

export async function POST(req: NextRequest) {
  const store = getStore();
  const body = await req.json().catch(() => ({}));
  const video = String(body?.video || "").trim();
  const dateKey = getKoreanDateString();
  const totalsKey = getTotalsKey(dateKey, video);
  const currentStoreTotals = getStoreTotals(store, totalsKey);

  if (body?.action === "reset") {
    store.ipDaily.clear();
    store.totalsByKey[totalsKey] = createEmptyTotals();
    console.log("[퍼널 API] 카운터 초기화 완료:", { dateKey, video });
    return NextResponse.json({ totals: store.totalsByKey[totalsKey], reset: true });
  }

  const step = Number(body?.step) as 0 | 1 | 2 | 3 | 4;
  if (![0, 1, 2, 3, 4].includes(step)) {
    return NextResponse.json(
      { error: "invalid_step" },
      { status: 400 }
    );
  }

  const reason = String(body?.reason || "");
  const isDebug = Boolean(body?.debug);
  const ip = getClientIp(req);
  const ipKey = `${dateKey}|${video}|${step}|${ip}`;

  if (!isDebug && store.ipDaily.has(ipKey)) {
    console.log("[퍼널 API] 중복 IP 카운트 차단:", {
      step,
      ip,
      dateKey,
      video,
      reason,
    });
    return NextResponse.json({
      counted: false,
      totals: currentStoreTotals,
    });
  }
  if (isDebug) {
    console.log("[퍼널 API] 개발자 모드 - IP 중복 차단 해제");
  }

  const current = await getFunnelDailyTotals(dateKey, video);
  if (!current.success) {
    console.warn("[퍼널 API] Notion 현재 카운트 조회 실패 - 로컬 카운트 사용");
  }
  const currentTotals = current.success ? current.totals : currentStoreTotals;
  const nextCount = (currentTotals[step] || 0) + 1;
  const nextTotals = {
    0: currentTotals[0] || 0,
    1: currentTotals[1] || 0,
    2: currentTotals[2] || 0,
    3: currentTotals[3] || 0,
    4: currentTotals[4] || 0,
  };
  nextTotals[step] = nextCount;

  store.ipDaily.add(ipKey);
  store.totalsByKey[totalsKey] = nextTotals;
  console.log("[퍼널 API] 카운트 증가:", {
    step,
    ip,
    dateKey,
    video,
    reason,
    total: nextCount,
  });

  await upsertFunnelDailyTotals({
    date: dateKey,
    video,
    totals: nextTotals,
  });

  const totalsResult = await getFunnelDailyTotals(dateKey, video);
  if (!totalsResult.success) {
    console.warn("[퍼널 API] Notion 날짜별 카운트 조회 실패 - 로컬 카운트 반환");
  }

  return NextResponse.json({
    counted: true,
    totals: totalsResult.success ? totalsResult.totals : nextTotals,
    step,
    count: nextCount,
  });
}

