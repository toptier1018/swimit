import { NextRequest, NextResponse } from "next/server";

/**
 * 관리자용 예약대기 설정 API
 * 
 * 개발자 모드에서 예약대기 버튼 클릭 시 호출되어
 * 모든 사용자에게 예약대기 상태를 적용합니다.
 */

// 메모리에 저장 (서버 재시작 시 초기화됨)
// 실제 운영 시에는 Notion이나 데이터베이스에 저장하는 것이 좋습니다
let manualWaitlistClasses = new Set<string>(["평영 A (초급)"]);

export async function POST(request: NextRequest) {
  try {
    const { className, action } = await request.json();

    console.log("[관리자 API] 예약대기 설정 요청:", { className, action });

    if (!className || !action) {
      return NextResponse.json(
        { success: false, error: "className과 action이 필요합니다." },
        { status: 400 }
      );
    }

    if (action === "add") {
      // 예약대기 추가
      manualWaitlistClasses.add(className);
      console.log("[관리자 API] 예약대기 추가:", className);
    } else if (action === "remove") {
      // 예약대기 해제
      manualWaitlistClasses.delete(className);
      console.log("[관리자 API] 예약대기 해제:", className);
    } else {
      return NextResponse.json(
        { success: false, error: "action은 'add' 또는 'remove'여야 합니다." },
        { status: 400 }
      );
    }

    console.log("[관리자 API] 현재 예약대기 클래스:", Array.from(manualWaitlistClasses));

    return NextResponse.json({
      success: true,
      manualWaitlistClasses: Array.from(manualWaitlistClasses),
    });
  } catch (error) {
    console.error("[관리자 API] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[관리자 API] 예약대기 클래스 조회");
    
    return NextResponse.json({
      success: true,
      manualWaitlistClasses: Array.from(manualWaitlistClasses),
    });
  } catch (error) {
    console.error("[관리자 API] 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
