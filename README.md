# 스윔잇 (Swim-It)

수영 특강 예약 시스템

## 주요 기능

- 수영 특강 예약 및 결제
- Notion 데이터베이스 연동
- 알리고 알림톡 자동 발송
- 개발자 모드 (예약대기 관리)

## 기술 스택

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Notion API
- 알리고 알림톡 API

## 배포

- Platform: Vercel
- URL: https://swimit.vercel.app/

## 개발

```bash
npm install
npm run dev
```

개발 서버: http://localhost:3000

## 환경 변수

`.env` 파일에 다음 변수들이 필요합니다:

- Notion API 키
- 알리고 API 키
- 기타 설정 값들

자세한 내용은 `.env.example` 참조
