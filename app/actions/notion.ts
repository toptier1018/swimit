"use server"

/**
 * Notion 데이터베이스에 사용자 등록 정보를 저장하는 서버 액션
 */
export async function submitToNotion(formData: {
  name: string
  phone: string
  gender: string
  location: string
  email: string
  painAreas: string[]
  swimmingExperience: string
  message: string
}) {
  try {
    console.log("[Notion 액션] 데이터 제출 시작:", {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
    })

    // 환경 변수 확인
    const notionApiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_DATABASE_ID

    if (!notionApiKey || !databaseId) {
      console.error("[Notion 액션] 환경 변수가 설정되지 않았습니다")
      return {
        success: false,
        error: "서버 설정 오류: 환경 변수가 설정되지 않았습니다",
      }
    }

    // 성별 값을 한글로 변환
    const genderText = formData.gender === "male" ? "남성" : "여성"

    // Notion API를 사용하여 데이터베이스에 페이지 생성
    const response = await fetch(`https://api.notion.com/v1/pages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId,
        },
        properties: {
          // 이름 (Title 속성)
          이름: {
            title: [
              {
                text: {
                  content: formData.name,
                },
              },
            ],
          },
          // 전화번호 (Phone 속성 또는 Rich Text)
          전화번호: {
            rich_text: [
              {
                text: {
                  content: formData.phone,
                },
              },
            ],
          },
          // 성별 (Select 속성 또는 Rich Text)
          성별: {
            rich_text: [
              {
                text: {
                  content: genderText,
                },
              },
            ],
          },
          // 거주지역 (Rich Text 속성)
          거주지역: {
            rich_text: [
              {
                text: {
                  content: formData.location,
                },
              },
            ],
          },
          // 수영을 배우신 지 얼마나 되셨나요? (Rich Text 속성)
          "수영을 배우신 지 얼마나 되셨나요?": {
            rich_text: [
              {
                text: {
                  content: formData.swimmingExperience || "미응답",
                },
              },
            ],
          },
          // 이메일 (특강/ 수영 제품 할인 정보를 제공합니다) (Email 속성)
          "이메일 (특강/ 수영 제품 할인 정보를 제공합니다)": {
            email: formData.email || null,
          },
          // 수영 후 통증이 느껴지거나 불편한 부위가 있나요? (중복 선택 가능) (Rich Text 속성)
          "수영 후 통증이 느껴지거나 불편한 부위가 있나요? (중복 선택 가능)": {
            rich_text: [
              {
                text: {
                  content: formData.painAreas.length
                    ? formData.painAreas.join(", ")
                    : "없음",
                },
              },
            ],
          },
          // 이번 특강을 통해 가장 해결하고 싶은 단 하나는 무엇인가요? (Rich Text 속성)
          "이번 특강을 통해 가장 해결하고 싶은 단 하나는 무엇인가요?": {
            rich_text: [
              {
                text: {
                  content: formData.message || "",
                },
              },
            ],
          },
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.code || response.statusText
      console.error("[Notion 액션] API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        fullError: JSON.stringify(errorData, null, 2),
      })
      return {
        success: false,
        error: `데이터 저장 실패: ${errorMessage}`,
        details: errorData,
      }
    }

    const result = await response.json()
    console.log("[Notion 액션] 데이터 저장 성공:", result.id)

    return {
      success: true,
      pageId: result.id,
    }
  } catch (error) {
    console.error("[Notion 액션] 예외 발생:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    }
  }
}

/**
 * 퍼널 카운트 (날짜/단계/카운트) 업서트
 * 동일 날짜/단계가 있으면 카운트만 업데이트
 */
export async function upsertFunnelCount(data: {
  date: string
  step: string
  count: number
}) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_FUNNEL_DATABASE_ID?.trim()

    if (!notionApiKey || !databaseId) {
      console.error("[퍼널 Notion] 환경 변수가 설정되지 않았습니다")
      return { success: false, error: "환경 변수 누락" }
    }

    const query = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: "날짜",
                date: { equals: data.date },
              },
              {
                property: "단계",
                select: { equals: data.step },
              },
            ],
          },
          page_size: 1,
        }),
      }
    )

    if (!query.ok) {
      const errorData = await query.json().catch(() => ({}))
      console.error("[퍼널 Notion] 조회 실패:", {
        status: query.status,
        error: errorData,
      })
      return { success: false, error: "조회 실패" }
    }

    const queryResult = await query.json()
    const existing = queryResult?.results?.[0]

    if (existing?.id) {
      const update = await fetch(
        `https://api.notion.com/v1/pages/${existing.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            properties: {
              카운트: { number: data.count },
            },
          }),
        }
      )

      if (!update.ok) {
        const errorData = await update.json().catch(() => ({}))
        console.error("[퍼널 Notion] 업데이트 실패:", {
          status: update.status,
          error: errorData,
        })
        return { success: false, error: "업데이트 실패" }
      }

      return { success: true, mode: "update" }
    }

    const create = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          날짜: { date: { start: data.date } },
          단계: { select: { name: data.step } },
          카운트: { number: data.count },
        },
      }),
    })

    if (!create.ok) {
      const errorData = await create.json().catch(() => ({}))
      console.error("[퍼널 Notion] 생성 실패:", {
        status: create.status,
        error: errorData,
      })
      return { success: false, error: "생성 실패" }
    }

    return { success: true, mode: "create" }
  } catch (error) {
    console.error("[퍼널 Notion] 예외:", error)
    return { success: false, error: "예외 발생" }
  }
}

/**
 * 퍼널 카운트 조회 (날짜/단계 단일)
 */
export async function getFunnelCountByDateStep(data: {
  date: string
  step: string
}) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_FUNNEL_DATABASE_ID?.trim()

    if (!notionApiKey || !databaseId) {
      console.error("[퍼널 Notion] 환경 변수가 설정되지 않았습니다")
      return { success: false, count: 0 }
    }

    const query = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: {
            and: [
              { property: "날짜", date: { equals: data.date } },
              { property: "단계", select: { equals: data.step } },
            ],
          },
          page_size: 1,
        }),
      }
    )

    if (!query.ok) {
      const errorData = await query.json().catch(() => ({}))
      console.error("[퍼널 Notion] 조회 실패:", {
        status: query.status,
        error: errorData,
      })
      return { success: false, count: 0 }
    }

    const result = await query.json()
    const existing = result?.results?.[0]
    const count = existing?.properties?.카운트?.number ?? 0
    return { success: true, count }
  } catch (error) {
    console.error("[퍼널 Notion] 조회 예외:", error)
    return { success: false, count: 0 }
  }
}

/**
 * 퍼널 카운트 조회 (날짜별 전체)
 */
export async function getFunnelCountsByDate(date: string) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_FUNNEL_DATABASE_ID?.trim()

    if (!notionApiKey || !databaseId) {
      console.error("[퍼널 Notion] 환경 변수가 설정되지 않았습니다")
      return { success: false, totals: { 1: 0, 2: 0, 3: 0, 4: 0 } }
    }

    const totals: Record<1 | 2 | 3 | 4, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    }
    const stepMap: Record<string, 1 | 2 | 3 | 4> = {
      "선택": 1,
      "개인 정보 입력": 2,
      "결제": 3,
      "완료": 4,
    }

    let nextCursor: string | null = null
    do {
      const response = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            filter: {
              property: "날짜",
              date: { equals: date },
            },
            page_size: 100,
            start_cursor: nextCursor || undefined,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[퍼널 Notion] 날짜별 조회 실패:", {
          status: response.status,
          error: errorData,
        })
        break
      }

      const result = await response.json()
      const pages = result?.results || []
      pages.forEach((page: any) => {
        const stepName = page.properties?.["단계"]?.select?.name || ""
        const count = page.properties?.["카운트"]?.number ?? 0
        const stepNumber = stepMap[stepName]
        if (stepNumber) {
          totals[stepNumber] = count
        }
      })

      nextCursor = result?.next_cursor || null
    } while (nextCursor)

    console.log("[퍼널 Notion] 날짜별 카운트:", { date, totals })
    return { success: true, totals }
  } catch (error) {
    console.error("[퍼널 Notion] 날짜별 조회 예외:", error)
    return { success: false, totals: { 1: 0, 2: 0, 3: 0, 4: 0 } }
  }
}

/**
 * 결제 완료 단계에서 가상계좌 및 주문 정보를 업데이트하는 서버 액션
 * 같은 Notion 데이터베이스의 추가 컬럼(가상계좌 입금 정보, 주문번호, 선택된 클래스, 시간대)에 값을 채웁니다.
 */
export async function updatePaymentInNotion(data: {
  pageId: string
  virtualAccountInfo: string
  orderNumber: string
  selectedClass: string
  timeSlot: string
  region: string
}) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY

    if (!notionApiKey) {
      console.error("[Notion 결제 업데이트] 환경 변수가 설정되지 않았습니다")
      return {
        success: false,
        error: "서버 설정 오류: 환경 변수가 설정되지 않았습니다",
      }
    }

    const response = await fetch(
      `https://api.notion.com/v1/pages/${data.pageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          properties: {
            // 가상계좌 입금 정보 (Rich Text)
            "가상계좌 입금 정보": {
              rich_text: [
                {
                  text: {
                    content: data.virtualAccountInfo,
                  },
                },
              ],
            },
            // 주문번호 (Rich Text)
            주문번호: {
              rich_text: [
                {
                  text: {
                    content: data.orderNumber,
                  },
                },
              ],
            },
            // 선택된 클래스 (Rich Text)
            "선택된 클래스": {
              rich_text: [
                {
                  text: {
                    content: data.selectedClass,
                  },
                },
              ],
            },
            // 시간대 (Rich Text)
            시간대: {
              rich_text: [
                {
                  text: {
                    content: data.timeSlot,
                  },
                },
              ],
            },
            // 지역 (Rich Text)
            지역: {
              rich_text: [
                {
                  text: {
                    content: data.region,
                  },
                },
              ],
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData.message || errorData.code || response.statusText
      console.error("[Notion 결제 업데이트] API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        fullError: JSON.stringify(errorData, null, 2),
      })
      return {
        success: false,
        error: `결제 정보 업데이트 실패: ${errorMessage}`,
        details: errorData,
      }
    }

    const result = await response.json()
    console.log("[Notion 결제 업데이트] 결제 정보 업데이트 성공:", result.id)

    return {
      success: true,
      pageId: result.id,
    }
  } catch (error) {
    console.error("[Notion 결제 업데이트] 예외 발생:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
    }
  }
}

/**
 * Notion 데이터베이스에서 클래스별 결제 완료된 건수를 조회하는 서버 액션
 * 배포 후에도 실제 결제 건수를 카운터로 표시하기 위해 사용
 */
export async function getClassEnrollmentCounts() {
  try {
    const notionApiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_DATABASE_ID

    if (!notionApiKey || !databaseId) {
      console.warn("[Notion 카운터 조회] 환경 변수가 설정되지 않았습니다. 기본값 0을 반환합니다.")
      return {
        success: true,
        counts: {
          "자유형 A (초급)": 0,
          "평영 A (초급)": 0,
          "접영 A (초급)": 0,
          "자유형 B (중급)": 0,
          "평영 B (중급)": 0,
        },
      }
    }

    // Notion API를 사용하여 모든 레코드 조회
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          // 페이지 크기 제한 없이 모든 레코드 가져오기
          page_size: 100,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Notion 카운터 조회] API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      return {
        success: false,
        error: `조회 실패: ${errorData.message || response.statusText}`,
        counts: {
          "자유형 A (초급)": 0,
          "평영 A (초급)": 0,
          "접영 A (초급)": 0,
          "자유형 B (중급)": 0,
          "평영 B (중급)": 0,
        },
      }
    }

    const result = await response.json()
    const pages = result.results || []

    // 클래스별 카운트 초기화
    const counts: Record<string, number> = {
      "자유형 A (초급)": 0,
      "평영 A (초급)": 0,
      "접영 A (초급)": 0,
      "자유형 B (중급)": 0,
      "평영 B (중급)": 0,
    }

    // 각 페이지를 순회하면서 "선택된 클래스" 필드 확인
    pages.forEach((page: any) => {
      const selectedClass = page.properties["선택된 클래스"]?.rich_text?.[0]?.plain_text || ""
      const virtualAccountInfo = page.properties["가상계좌 입금 정보"]?.rich_text?.[0]?.plain_text || ""
      
      // 결제가 완료된 경우 (입금완료 또는 예약대기 상태)만 카운트
      // 가상계좌 입금 정보가 "입금대기", "입금완료", "예약대기" 중 하나인 경우 카운트
      if (selectedClass && (virtualAccountInfo === "입금대기" || virtualAccountInfo === "입금완료" || virtualAccountInfo === "예약대기")) {
        if (counts.hasOwnProperty(selectedClass)) {
          counts[selectedClass]++
        }
      }
    })

    // 페이지네이션 처리: 더 많은 페이지가 있는 경우 계속 조회
    let nextCursor = result.next_cursor
    while (nextCursor) {
      const nextResponse = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            page_size: 100,
            start_cursor: nextCursor,
          }),
        }
      )

      if (!nextResponse.ok) {
        console.warn("[Notion 카운터 조회] 페이지네이션 중 오류 발생. 지금까지 조회된 데이터로 반환합니다.")
        break
      }

      const nextResult = await nextResponse.json()
      const nextPages = nextResult.results || []

      nextPages.forEach((page: any) => {
        const selectedClass = page.properties["선택된 클래스"]?.rich_text?.[0]?.plain_text || ""
        const virtualAccountInfo = page.properties["가상계좌 입금 정보"]?.rich_text?.[0]?.plain_text || ""
        
        if (selectedClass && (virtualAccountInfo === "입금대기" || virtualAccountInfo === "입금완료" || virtualAccountInfo === "예약대기")) {
          if (counts.hasOwnProperty(selectedClass)) {
            counts[selectedClass]++
          }
        }
      })

      nextCursor = nextResult.next_cursor
    }

    console.log("[Notion 카운터 조회] 클래스별 결제 건수:", counts)

    return {
      success: true,
      counts,
    }
  } catch (error) {
    console.error("[Notion 카운터 조회] 예외 발생:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
      counts: {
        "자유형 A (초급)": 0,
        "평영 A (초급)": 0,
        "접영 A (초급)": 0,
        "자유형 B (중급)": 0,
        "평영 B (중급)": 0,
      },
    }
  }
}

/**
 * 노션 데이터베이스에서 이름/전화번호/성별로 입금확인 상태를 조회하는 서버 액션
 */
export async function checkPaymentStatus(data: {
  name: string
  phone: string
  gender: string
}) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY
    const databaseId = process.env.NOTION_DATABASE_ID

    if (!notionApiKey || !databaseId) {
      return {
        success: false,
        error: "서버 설정 오류: 환경 변수가 설정되지 않았습니다",
      }
    }

    // 성별 값을 한글로 변환
    const genderText = data.gender === "male" ? "남성" : "여성"

    // Notion API를 사용하여 데이터베이스 쿼리
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: "이름",
                title: {
                  equals: data.name,
                },
              },
              {
                property: "전화번호",
                rich_text: {
                  equals: data.phone,
                },
              },
              {
                property: "성별",
                rich_text: {
                  equals: genderText,
                },
              },
            ],
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Notion 입금확인 조회] API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      return {
        success: false,
        error: `조회 실패: ${errorData.message || response.statusText}`,
      }
    }

    const result = await response.json()

    if (result.results.length === 0) {
      return {
        success: true,
        isPaid: false,
      }
    }

    // 첫 번째 매칭되는 결과의 입금확인 체크박스 상태 확인
    const page = result.results[0]
    const paymentConfirmed = page.properties["입금확인"]?.checkbox || false
    const currentVirtualAccountInfo = page.properties["가상계좌 입금 정보"]?.rich_text?.[0]?.plain_text || ""

    // 입금확인이 체크되어 있고, 가상계좌 입금 정보가 "입금대기"인 경우 "입금완료"로 업데이트
    if (paymentConfirmed && currentVirtualAccountInfo === "입금대기") {
      try {
        const updateResponse = await fetch(
          `https://api.notion.com/v1/pages/${page.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${notionApiKey}`,
              "Content-Type": "application/json",
              "Notion-Version": "2022-06-28",
            },
            body: JSON.stringify({
              properties: {
                "가상계좌 입금 정보": {
                  rich_text: [
                    {
                      text: {
                        content: "입금완료",
                      },
                    },
                  ],
                },
              },
            }),
          }
        )

        if (updateResponse.ok) {
          console.log("[Notion 입금확인] 가상계좌 입금 정보를 입금완료로 업데이트 완료")
        } else {
          console.error("[Notion 입금확인] 가상계좌 입금 정보 업데이트 실패:", await updateResponse.json().catch(() => ({})))
        }
      } catch (updateError) {
        console.error("[Notion 입금확인] 업데이트 중 오류:", updateError)
      }
    }

    return {
      success: true,
      isPaid: paymentConfirmed,
      pageId: page.id,
    }
  } catch (error) {
    console.error("[Notion 입금확인 조회] 예외 발생:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    }
  }
}
