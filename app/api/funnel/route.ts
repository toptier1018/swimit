import { NextRequest, NextResponse } from "next/server";
import {
  getFunnelCountByDateStep,
  getFunnelCountsByDate,
  upsertFunnelCount,
} from "@/app/actions/notion";

type FunnelTotals = Record<1 | 2 | 3 | 4, number>;

type FunnelStore = {
  ipDaily: Set<string>;
  totals: FunnelTotals;
};

const getStore = () => {
  const globalForFunnel = globalThis as unknown as { funnelStore?: FunnelStore };
  if (!globalForFunnel.funnelStore) {
    globalForFunnel.funnelStore = {
      ipDaily: new Set<string>(),
      totals: { 1: 0, 2: 0, 3: 0, 4: 0 },
    };
  }
  return globalForFunnel.funnelStore;
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

export async function GET() {
  const dateKey = getKoreanDateString();
  const result = await getFunnelCountsByDate(dateKey);
  if (result.success) {
    return NextResponse.json({ totals: result.totals });
  }
  const store = getStore();
  return NextResponse.json({ totals: store.totals });
}

export async function POST(req: NextRequest) {
  const store = getStore();
  const body = await req.json().catch(() => ({}));

  if (body?.action === "reset") {
    store.ipDaily.clear();
    store.totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    console.log("[퍼널 API] 카운터 초기화 완료");
    return NextResponse.json({ totals: store.totals, reset: true });
  }

  const step = Number(body?.step) as 1 | 2 | 3 | 4;
  if (![1, 2, 3, 4].includes(step)) {
    return NextResponse.json(
      { error: "invalid_step" },
      { status: 400 }
    );
  }

  const reason = String(body?.reason || "");
  const isDebug = Boolean(body?.debug);
  const dateKey = getKoreanDateString();
  const ip = getClientIp(req);
  const ipKey = `${dateKey}|${step}|${ip}`;

  if (!isDebug && store.ipDaily.has(ipKey)) {
    console.log("[퍼널 API] 중복 IP 카운트 차단:", {
      step,
      ip,
      dateKey,
      reason,
    });
    return NextResponse.json({
      counted: false,
      totals: store.totals,
    });
  }
  if (isDebug) {
    console.log("[퍼널 API] 개발자 모드 - IP 중복 차단 해제");
  }

  const stepLabelMap: Record<number, string> = {
    1: "선택",
    2: "개인 정보 입력",
    3: "결제",
    4: "완료",
  };
  const stepLabel = stepLabelMap[step];
  const current = await getFunnelCountByDateStep({
    date: dateKey,
    step: stepLabel,
  });
  const nextCount = (current?.count || 0) + 1;

  store.ipDaily.add(ipKey);
  store.totals[step] = nextCount;
  console.log("[퍼널 API] 카운트 증가:", {
    step,
    ip,
    dateKey,
    reason,
    total: nextCount,
  });

  await upsertFunnelCount({
    date: dateKey,
    step: stepLabel,
    count: nextCount,
  });

  const totalsResult = await getFunnelCountsByDate(dateKey);

  return NextResponse.json({
    counted: true,
    totals: totalsResult.success ? totalsResult.totals : store.totals,
  });
}

