/**
 * 유입경로(마케팅 파라미터) 수집·정규화
 *
 * 지원 파라미터: video, source, utm_source, utm_medium, utm_campaign
 * 예) ?video=butterfly8
 *     ?source=insta_main
 *     ?utm_source=instagram&utm_medium=profile&utm_campaign=main
 */

export type TrafficSource = {
  video: string;
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export const EMPTY_TRAFFIC_SOURCE: TrafficSource = {
  video: "",
  source: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
};

export const TRAFFIC_SOURCE_STORAGE_KEY = "swimit_traffic_source";

/** 유입경로 미확인 시 저장되는 기본값 */
export const DIRECT_REFERRAL_PATH = "direct";

/**
 * 신청자 목록에 표시할 대표 유입경로
 * source가 있으면 source, 없으면 video, 둘 다 없으면 direct
 */
export const resolveReferralPath = (traffic: TrafficSource): string =>
  traffic.source || traffic.video || DIRECT_REFERRAL_PATH;

export const hasAnyTrafficValue = (traffic: TrafficSource): boolean =>
  Object.values(traffic).some((value) => Boolean(value));

const clean = (value: string | null | undefined) => (value ?? "").trim();

/** 쿼리스트링에서 유입경로 파라미터 추출 */
export const readTrafficSourceFromParams = (
  params: URLSearchParams,
): TrafficSource => ({
  video: clean(params.get("video")),
  source: clean(params.get("source")),
  utm_source: clean(params.get("utm_source")),
  utm_medium: clean(params.get("utm_medium")),
  utm_campaign: clean(params.get("utm_campaign")),
});

/** 저장된 값 복원 (형식이 깨진 값은 버림) */
export const parseStoredTrafficSource = (raw: string | null): TrafficSource => {
  if (!raw) return { ...EMPTY_TRAFFIC_SOURCE };
  try {
    const parsed = JSON.parse(raw) as Partial<TrafficSource>;
    return {
      video: clean(parsed.video),
      source: clean(parsed.source),
      utm_source: clean(parsed.utm_source),
      utm_medium: clean(parsed.utm_medium),
      utm_campaign: clean(parsed.utm_campaign),
    };
  } catch {
    return { ...EMPTY_TRAFFIC_SOURCE };
  }
};

/** 노션·시트에 넘길 평면 객체 (유입경로 포함) */
export const toTrafficRecord = (traffic: TrafficSource) => ({
  유입경로: resolveReferralPath(traffic),
  video: traffic.video,
  source: traffic.source,
  utm_source: traffic.utm_source,
  utm_medium: traffic.utm_medium,
  utm_campaign: traffic.utm_campaign,
});

export type TrafficRecord = ReturnType<typeof toTrafficRecord>;
