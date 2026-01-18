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
          // 이메일 (특강/ 수영 제품 할인 정보를 제공합니다) (Rich Text 속성)
          "이메일 (특강/ 수영 제품 할인 정보를 제공합니다)": {
            rich_text: [
              {
                text: {
                  content: formData.email || "",
                },
              },
            ],
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
      console.error("[Notion 액션] API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      return {
        success: false,
        error: `데이터 저장 실패: ${response.statusText}`,
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












