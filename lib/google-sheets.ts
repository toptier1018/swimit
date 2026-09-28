import "server-only";
import { google } from "googleapis";
import type { ResistanceContentConsent } from "@/lib/resistance-content-consent";

const env = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME,
};

function getAuthClient() {
  if (!env.clientEmail || !env.privateKey) {
    throw new Error(
      "GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be set in the environment.",
    );
  }

  const privateKey = env.privateKey.replace(/\\n/g, "\n");

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: env.clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export type GoogleSheetRowInput = {
  /** A: 접수일시 */
  접수일시: string;
  /** B: 신청번호 */
  신청번호: string;
  /** C: 이름 */
  이름: string;
  /** D: 전화번호 */
  전화번호: string;
  /** E: 이메일 */
  이메일: string;
  /** F: 성별 */
  성별: string;
  /** G: 거주지역 */
  거주지역: string;
  /** H: 수영경력 */
  수영경력: string;
  /** I: 통증부위 */
  통증부위: string;
  /** J: 해결문제 */
  해결문제: string;
  /** K: 클래스 */
  클래스: string;
  /** L: 회차 */
  회차: string;
  /** M: 레인 */
  레인: string;
  /** N: 날짜 */
  날짜: string;
  /** O: 특강지역 */
  특강지역: string;
  /** P: 예약상태 */
  예약상태: string;
  /** Q: 링크 */
  링크?: string;
  /** R: 입금기한 (무통장 홀드용, 예: 2026. 8. 17 오후 2:00:00) */
  입금기한?: string;
  /** S: 대기순번 */
  대기순번?: string;
  /** U: 유입경로 (T열은 운영용 여백으로 유지) */
  유입경로?: string;
  /** V: video */
  video?: string;
  /** W: source */
  source?: string;
  /** X: utm_source */
  utm_source?: string;
  /** Y: utm_medium */
  utm_medium?: string;
  /** Z: utm_campaign */
  utm_campaign?: string;
  /** AA~AC: 프로그램별 영상 촬영/콘텐츠 활용 동의 */
  contentConsent?: ResistanceContentConsent | null;
};

/** B열(신청번호) 목록 — 중복 복구 방지 */
export async function getSheetOrderNumbers(): Promise<
  | {
      success: true;
      orderNumbers: Set<string>;
    }
  | { success: false; error: string }
> {
  try {
    if (!env.spreadsheetId || !env.sheetName) {
      return {
        success: false,
        error:
          "GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_SHEET_NAME must be set.",
      };
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.sheetName}'!B:B`,
    });

    const rows = res.data.values ?? [];
    const orderNumbers = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const cell = String(rows[i]?.[0] ?? "").trim();
      if (cell) orderNumbers.add(cell);
    }

    console.log("[Google Sheets] 기존 신청번호 개수:", orderNumbers.size);
    return { success: true, orderNumbers };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to read sheet.";
    console.error("[Google Sheets] read error:", message);
    return { success: false, error: message };
  }
}

export async function appendRowToGoogleSheet(
  row: GoogleSheetRowInput,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!env.spreadsheetId || !env.sheetName) {
      return {
        success: false,
        error:
          "GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_SHEET_NAME must be set.",
      };
    }

    console.log("[Google Sheets] 행 추가 시작:", {
      신청번호: row["신청번호"],
      예약상태: row["예약상태"],
      입금기한: row["입금기한"] ?? "",
      유입경로: row["유입경로"] ?? "",
      콘텐츠활용동의: row.contentConsent?.agreed ?? false,
      시트명: env.sheetName,
    });

    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    // U~Z에 과거 퍼널 데이터만 남은 행이 있어도 주문 행 위치에 영향을 주지 않도록
    // 주문 데이터(A~S)를 먼저 추가한 뒤, 반환된 같은 행의 U~Z에 퍼널을 기록한다.
    const coreValues: string[][] = [
      [
        row["접수일시"],
        row["신청번호"],
        row["이름"],
        row["전화번호"],
        row["이메일"],
        row["성별"],
        row["거주지역"],
        row["수영경력"],
        row["통증부위"],
        row["해결문제"],
        row["클래스"],
        row["회차"],
        row["레인"],
        row["날짜"],
        row["특강지역"],
        row["예약상태"],
        row["링크"] ?? "",
        row["입금기한"] ?? "",
        row["대기순번"] ?? "",
      ],
    ];

    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `'${env.sheetName}'!A:S`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: coreValues },
    });

    const updatedRange = appendResult.data.updates?.updatedRange ?? "";
    const appendedRow = updatedRange.match(/!A(\d+):S\d+$/)?.[1];
    const funnelValues = [
      row["유입경로"] ?? "",
      row["video"] ?? "",
      row["source"] ?? "",
      row["utm_source"] ?? "",
      row["utm_medium"] ?? "",
      row["utm_campaign"] ?? "",
    ];
    const hasFunnelValue = funnelValues.some((value) => value.trim().length > 0);

    if (appendedRow && hasFunnelValue) {
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: env.spreadsheetId,
          range: `'${env.sheetName}'!U${appendedRow}:Z${appendedRow}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [funnelValues] },
        });
        console.log("[Google Sheets] 퍼널 기록 성공:", {
          신청번호: row["신청번호"],
          행: appendedRow,
        });
      } catch (funnelError) {
        console.error("[Google Sheets] 주문은 저장됐지만 퍼널 기록 실패:", {
          신청번호: row["신청번호"],
          행: appendedRow,
          error:
            funnelError instanceof Error
              ? funnelError.message
              : String(funnelError),
        });
      }
    } else if (hasFunnelValue) {
      console.warn("[Google Sheets] 추가된 행 번호를 확인하지 못해 퍼널 기록 생략:", {
        신청번호: row["신청번호"],
        updatedRange,
      });
    }

    if (row.contentConsent?.agreed) {
      if (!appendedRow) {
        const error =
          "주문은 저장됐지만 촬영 콘텐츠 동의를 기록할 행 번호를 확인하지 못했습니다.";
        console.error("[Google Sheets] 촬영 콘텐츠 동의 기록 실패:", {
          신청번호: row["신청번호"],
          updatedRange,
        });
        return { success: false, error };
      }

      let consentSaved = false;
      let lastConsentError = "";
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: env.spreadsheetId,
            range: `'${env.sheetName}'!AA${appendedRow}:AC${appendedRow}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [
                [
                  true,
                  row.contentConsent.agreedAt,
                  row.contentConsent.version,
                ],
              ],
            },
          });
          consentSaved = true;
          break;
        } catch (consentError) {
          lastConsentError =
            consentError instanceof Error
              ? consentError.message
              : String(consentError);
          console.error("[Google Sheets] 촬영 콘텐츠 동의 기록 재시도:", {
            신청번호: row["신청번호"],
            행: appendedRow,
            attempt,
            error: lastConsentError,
          });
          if (attempt < 3) await wait(200 * attempt);
        }
      }

      if (!consentSaved) {
        return {
          success: false,
          error: `주문은 저장됐지만 촬영 콘텐츠 동의 기록에 실패했습니다: ${lastConsentError}`,
        };
      }

      console.log("[Google Sheets] 촬영 콘텐츠 동의 기록 성공:", {
        신청번호: row["신청번호"],
        행: appendedRow,
        version: row.contentConsent.version,
      });

      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: env.spreadsheetId,
          range: `'${env.sheetName}'!AA1:AC1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                "콘텐츠 활용 동의 여부",
                "콘텐츠 활용 동의 일시",
                "콘텐츠 활용 동의 약관 버전",
              ],
            ],
          },
        });
      } catch (headerError) {
        console.warn("[Google Sheets] 동의 값은 저장됐지만 헤더 기록 실패:", {
          신청번호: row["신청번호"],
          error:
            headerError instanceof Error
              ? headerError.message
              : String(headerError),
        });
      }
    }

    console.log("[Google Sheets] 행 추가 성공:", {
      신청번호: row["신청번호"],
      예약상태: row["예약상태"],
      입금기한: row["입금기한"] ?? "",
      유입경로: row["유입경로"] ?? "",
      행: appendedRow ?? "확인 불가",
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error appending to sheet.";
    console.error("[Google Sheets] append error:", message);
    return { success: false, error: message };
  }
}

export type SheetLastNotifyValue = "예약확정" | "발송실패" | "";

export type CardPaymentSheetStatusUpdate = {
  orderNumber: string;
  /** 확정예약상태(R) — 카드결제 완료 시 예약확정 */
  confirmedStatus?: "예약확정";
  /** 입금상태(S) — 카드결제 완료 시 입금완료 */
  paymentStatus?: "입금완료";
  /** 마지막알림(T) */
  lastNotify?: SheetLastNotifyValue;
};

/**
 * 신청번호로 행을 찾아 카드결제 확정 상태(R/S/T)를 갱신한다.
 * - 운영 시트: 확정예약상태·입금상태·마지막알림 (헤더 우선, 없으면 R/S/T)
 * - 수강자 시트: 마지막알림(T)만 (R/S는 입금기한·대기순번이라 건드리지 않음)
 */
export async function updateCardPaymentSheetStatusByOrderNumber(
  params: CardPaymentSheetStatusUpdate,
): Promise<{
  success: boolean;
  updated: { sheetName: string; rowNumber: number }[];
  error?: string;
}> {
  const orderNumber = String(params.orderNumber || "").trim();
  if (!orderNumber) {
    return { success: false, updated: [], error: "신청번호가 없습니다." };
  }
  if (!env.spreadsheetId) {
    return {
      success: false,
      updated: [],
      error: "GOOGLE_SHEETS_SPREADSHEET_ID가 없습니다.",
    };
  }

  const rawSheetName = env.sheetName?.trim() || "스윔잇 수강자";
  const opsSheetName =
    process.env.GOOGLE_SHEETS_OPS_SHEET_NAME?.trim() || "스윔잇 수강자 운영";
  const sheetNames = [rawSheetName, opsSheetName].filter(
    (name, index, arr) => name && arr.indexOf(name) === index,
  );

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    const updated: { sheetName: string; rowNumber: number }[] = [];

    for (const sheetName of sheetNames) {
      const isOpsSheet = sheetName === opsSheetName;
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: env.spreadsheetId,
        range: `'${sheetName}'!A:T`,
        valueRenderOption: "FORMATTED_VALUE",
      });
      const rows = res.data.values ?? [];
      if (rows.length < 2) continue;

      const header = (rows[0] || []).map((v) => String(v || "").trim());
      let colOrder = header.findIndex((h) => h === "신청번호");
      if (colOrder < 0) colOrder = 1;

      let colConfirmed = header.findIndex((h) => h === "확정예약상태");
      let colPayment = header.findIndex((h) => h === "입금상태");
      let colNotify = header.findIndex((h) => h === "마지막알림");

      // 운영 시트만 R/S 관례 fallback (수강자 시트의 R=입금기한, S=대기순번과 충돌 방지)
      // 헤더에 확정예약상태/입금상태가 있으면 수강자 시트에서도 갱신
      if (isOpsSheet) {
        if (colConfirmed < 0) colConfirmed = 17; // R
        if (colPayment < 0) colPayment = 18; // S
      }
      if (colNotify < 0) colNotify = 19; // T

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i] || [];
        const cell = String(row[colOrder] ?? "").trim();
        if (cell !== orderNumber) continue;

        const rowNumber = i + 1;
        const data: { range: string; values: string[][] }[] = [];

        const canWriteConfirmed = colConfirmed >= 0;
        const canWritePayment = colPayment >= 0;

        if (params.confirmedStatus && canWriteConfirmed) {
          data.push({
            range: `'${sheetName}'!${columnIndexToLetter(colConfirmed)}${rowNumber}`,
            values: [[params.confirmedStatus]],
          });
        }
        if (params.paymentStatus && canWritePayment) {
          data.push({
            range: `'${sheetName}'!${columnIndexToLetter(colPayment)}${rowNumber}`,
            values: [[params.paymentStatus]],
          });
        }
        if (params.lastNotify !== undefined && colNotify >= 0) {
          data.push({
            range: `'${sheetName}'!${columnIndexToLetter(colNotify)}${rowNumber}`,
            values: [[params.lastNotify]],
          });
        }

        if (data.length === 0) break;

        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: env.spreadsheetId,
          requestBody: {
            valueInputOption: "USER_ENTERED",
            data,
          },
        });

        updated.push({ sheetName, rowNumber });
        console.log("[Google Sheets] 카드결제 시트 상태 갱신:", {
          sheetName,
          rowNumber,
          orderNumber,
          confirmedStatus: canWriteConfirmed
            ? params.confirmedStatus
            : undefined,
          paymentStatus: canWritePayment ? params.paymentStatus : undefined,
          lastNotify: params.lastNotify ?? undefined,
        });
        break;
      }
    }

    if (updated.length === 0) {
      console.warn("[Google Sheets] 카드결제 시트 상태 갱신 대상 없음:", {
        orderNumber,
      });
      return {
        success: false,
        updated: [],
        error: `신청번호 ${orderNumber} 행을 찾지 못했습니다.`,
      };
    }

    return { success: true, updated };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "카드결제 시트 상태 갱신 실패";
    console.error("[Google Sheets] 카드결제 시트 상태 갱신 오류:", message);
    return { success: false, updated: [], error: message };
  }
}

/**
 * 신청번호(B열)로 행을 찾아 T열(마지막알림)만 갱신한다.
 * (하위 호환 — 카드결제는 updateCardPaymentSheetStatusByOrderNumber 권장)
 */
export async function updateLastNotifyByOrderNumber(params: {
  orderNumber: string;
  value: SheetLastNotifyValue;
}): Promise<{
  success: boolean;
  updated: { sheetName: string; rowNumber: number }[];
  error?: string;
}> {
  return updateCardPaymentSheetStatusByOrderNumber({
    orderNumber: params.orderNumber,
    lastNotify: params.value,
  });
}

function columnIndexToLetter(index0: number): string {
  let n = index0 + 1;
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/** One append saves the reservation, consent and benefit together. Preserve existing columns. */
export async function appendAdvanceReservationToGoogleSheet(
  row: GoogleSheetRowInput,
  benefit: { originalAmount: number; discountAmount: number; expectedAmount: number; benefitName: string; reservedAt: string },
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!env.spreadsheetId || !env.sheetName) throw new Error("예약 저장소 설정을 확인해 주세요.");
    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const range = `'${env.sheetName.replace(/'/g, "''")}'`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: env.spreadsheetId, range: `${range}!1:1` });
    const headers = (response.data.values?.[0] || []).map(value => String(value || ""));
    if (headers[1] !== "신청번호" || headers[15] !== "예약상태") throw new Error("예약 시트의 열 구성을 확인해 주세요.");
    const { contentConsent, ...fields } = row;
    const entries: Record<string, string | number | boolean> = {
      ...Object.fromEntries(Object.entries(fields).filter(([key]) => ![
        "접수일시", "신청번호", "이름", "전화번호", "이메일", "성별", "거주지역", "수영경력",
        "통증부위", "해결문제", "클래스", "회차", "레인", "날짜", "특강지역", "예약상태", "링크", "입금기한", "대기순번",
      ].includes(key)).map(([key, value]) => [key, value ?? ""])),
      "예약 혜택": benefit.benefitName, "할인 전 금액": benefit.originalAmount,
      "예약 할인액": benefit.discountAmount, "할인 후 예정 금액": benefit.expectedAmount,
      "혜택 확정 일시": benefit.reservedAt,
      "콘텐츠 활용 동의 여부": contentConsent?.agreed ?? false,
      "콘텐츠 활용 동의 일시": contentConsent?.agreedAt ?? "",
      "콘텐츠 활용 동의 약관 버전": contentConsent?.version ?? "",
    };
    // Existing U:AC columns are reserved for attribution and consent.
    const reserved = ["유입경로", "video", "source", "utm_source", "utm_medium", "utm_campaign",
      "콘텐츠 활용 동의 여부", "콘텐츠 활용 동의 일시", "콘텐츠 활용 동의 약관 버전"];
    for (let i = 0; i < reserved.length; i++) {
      const index = 20 + i;
      if (headers[index] && headers[index] !== reserved[i]) throw new Error("운영 시트 열 구성을 확인해 주세요.");
      headers[index] = reserved[i];
    }
    for (const key of Object.keys(entries)) if (!headers.includes(key)) headers.push(key);
    const end = columnIndexToLetter(headers.length - 1);
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: env.spreadsheetId,
      fields: "sheets(properties(sheetId,title,gridProperties(columnCount)))" });
    const sheet = metadata.data.sheets?.find(item => item.properties?.title === env.sheetName)?.properties;
    if (!sheet || sheet.sheetId == null) throw new Error("예약 시트를 찾지 못했습니다.");
    if ((sheet.gridProperties?.columnCount ?? 0) < headers.length) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId: env.spreadsheetId, requestBody: { requests: [{
        appendDimension: { sheetId: sheet.sheetId, dimension: "COLUMNS", length: headers.length - (sheet.gridProperties?.columnCount ?? 0) },
      }] } });
    }
    const values = headers.map(key => entries[key] ?? "");
    const core: Array<keyof GoogleSheetRowInput> = [
      "접수일시", "신청번호", "이름", "전화번호", "이메일", "성별", "거주지역", "수영경력",
      "통증부위", "해결문제", "클래스", "회차", "레인", "날짜", "특강지역", "예약상태", "링크", "입금기한", "대기순번",
    ];
    core.forEach((key, index) => { values[index] = String(row[key] ?? ""); });
    await sheets.spreadsheets.values.update({ spreadsheetId: env.spreadsheetId, range: `${range}!A1:${end}1`,
      valueInputOption: "RAW", requestBody: { values: [headers.map(v => v ?? "")] } });
    await sheets.spreadsheets.values.append({ spreadsheetId: env.spreadsheetId, range: `${range}!A:${end}`,
      valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] } });
    return { success: true };
  } catch (error) {
    console.error("[사전예약] 저장 실패", error);
    return { success: false, error: "예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
