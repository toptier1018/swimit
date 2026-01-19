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
          // 이메일 (특강/ 수영 제품 할인 정보를 제공합니다) (Email 속성)
          "이메일 (특강/ 수영 제품 할인 정보를 제공합니다)": {
            email: formData.email || null,
          },
          // 이건 꼭 배우고 싶어요 (Rich Text 속성)
          "이건 꼭 배우고 싶어요": {
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
 * 결제 완료 단계에서 가상계좌 및 주문 정보를 업데이트하는 서버 액션
 * 같은 Notion 데이터베이스의 추가 컬럼(가상계좌 입금 정보, 주문번호, 선택된 클래스, 시간대)에 값을 채웁니다.
 */
export async function updatePaymentInNotion(data: {
  pageId: string
  virtualAccountInfo: string
  orderNumber: string
  selectedClass: string
  timeSlot: string
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
            선택된클래스: {
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
