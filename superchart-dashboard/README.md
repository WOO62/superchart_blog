# 슈퍼차트 대시보드

슈퍼차트 비즈니스 대시보드 - 매출 현황과 리뷰 모니터링을 한눈에!

## 🚀 주요 기능

- **📊 대시보드**: 이번 달 매출, 누적 매출, 슈퍼차트 매출 현황
- **📈 차트**: 매출 추이, 발행량 추이 시각화
- **🔍 리뷰 모니터링**: 실시간 리뷰 등록 현황 추적
- **🎨 모던 UI**: 깔끔하고 직관적인 인터페이스
- **📱 반응형**: 모바일, 태블릿, 데스크톱 지원

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: MySQL (기존 DB) + Supabase (실시간 기능)
- **Deployment**: Vercel

## 📦 설치 방법

### 1. 프로젝트 클론
```bash
git clone https://github.com/yourusername/superchart-dashboard.git
cd superchart-dashboard
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경변수 설정
`.env.local.example`을 `.env.local`로 복사하고 값 입력:
```bash
cp .env.local.example .env.local
```

필요한 환경변수:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
- MySQL 연결 정보 (이미 설정됨)
- GitHub Gist 정보 (이미 설정됨)

### 4. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 에서 확인

## 🌐 Vercel 배포

### 1. Vercel CLI 설치
```bash
npm i -g vercel
```

### 2. 배포
```bash
vercel
```

### 3. 환경변수 설정
Vercel 대시보드에서 프로젝트 Settings > Environment Variables에 추가:
- 모든 `.env.local` 변수들

## 📁 프로젝트 구조

```
superchart-dashboard/
├── app/
│   ├── layout.tsx           # 루트 레이아웃
│   ├── page.tsx             # 메인 대시보드
│   ├── reviews/page.tsx     # 리뷰 모니터링
│   └── api/
│       ├── sales/route.ts   # 매출 API
│       └── reviews/route.ts # 리뷰 API
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx      # 사이드바
│   ├── dashboard/
│   │   ├── SalesCard.tsx    # 매출 카드
│   │   ├── SalesChart.tsx   # 매출 차트
│   │   └── VolumeChart.tsx  # 발행량 차트
│   └── reviews/
│       └── ReviewMonitor.tsx # 리뷰 모니터
├── lib/
│   ├── supabase.ts          # Supabase 클라이언트
│   ├── mysql.ts             # MySQL 연결
│   └── utils.ts             # 유틸리티
└── styles/
    └── globals.css          # 전역 스타일
```

## 🎨 UI/UX 특징

- **포인트 컬러**: #F21A0D (빨간색)
- **사이드바**: 호버시 확장 (60px → 240px)
- **카드 디자인**: 그림자 효과, 둥근 모서리
- **애니메이션**: 부드러운 전환 효과
- **반응형**: 모든 디바이스 지원

## 🔧 커스터마이징

### 컬러 변경
`tailwind.config.ts`에서 primary 색상 수정:
```typescript
colors: {
  primary: {
    DEFAULT: "#F21A0D", // 원하는 색상으로 변경
    // ...
  }
}
```

### 메뉴 추가
`components/layout/Sidebar.tsx`의 `menuItems` 배열에 추가:
```typescript
const menuItems = [
  // ... 기존 메뉴
  {
    title: '새 메뉴',
    icon: YourIcon,
    href: '/your-path',
  },
]
```

## 📊 API 엔드포인트

- `GET /api/sales`: 매출 데이터
- `GET /api/reviews`: 리뷰 데이터

## 🐛 문제 해결

### MySQL 연결 오류
- 환경변수 확인
- VPN/네트워크 확인
- SSL 설정 확인

### Supabase 연결 오류
- Supabase 프로젝트 URL과 키 확인
- 프로젝트 상태 확인

## 📝 라이센스

MIT License

## 🤝 기여

Pull Request와 Issue는 언제나 환영합니다!