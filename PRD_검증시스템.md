# 슈퍼차트 블로그 검증 시스템 PRD

## 1. 개요
슈퍼차트 블로그 서비스의 데이터 무결성과 서비스 품질을 보장하기 위한 검증 시스템 구축

### 1.1 목적
- 데이터베이스 내 데이터의 정합성 검증
- 비즈니스 로직 검증
- 서비스 운영 상태 모니터링
- 이상 징후 조기 감지 및 알림

### 1.2 범위
- MySQL 데이터베이스 읽기 전용 접근
- 주기적인 자동 검증
- 실시간 알림 시스템

## 2. 기능 요구사항

### 2.1 데이터베이스 연결
- **읽기 전용 접근**: MySQL 데이터베이스에 SELECT 권한만으로 접근
- **연결 풀 관리**: 효율적인 데이터베이스 연결 관리
- **재시도 로직**: 연결 실패 시 자동 재시도

### 2.2 검증 항목

#### 2.2.1 데이터 무결성 검증
- [x] **구매링크 누락 검증**: ChannelCampaigns에 purchaseLink가 있지만 Propositions에 없는 경우 감지
- [x] **리뷰 등록 실시간 감지**: 신규 리뷰 등록 시 즉시 알림
- [ ] NULL 값 검증: 필수 필드의 NULL 값 체크
- [ ] 중복 데이터 검증: 유니크해야 할 데이터의 중복 체크
- [ ] 참조 무결성: 외래 키 관계 검증
- [ ] 데이터 형식 검증: 이메일, URL, 날짜 형식 등

#### 2.2.2 비즈니스 로직 검증
- [x] **리뷰 등록 알림**: 캠페인명, 블로거 ID, 매니저명, 리뷰 URL 포함
- [ ] 게시물 상태 검증: 발행/임시저장/삭제 상태 일관성
- [ ] 사용자 권한 검증: 역할과 권한의 일치성
- [ ] 카테고리 구조 검증: 계층 구조의 무결성
- [ ] 조회수/좋아요 검증: 비정상적인 패턴 감지

#### 2.2.3 성능 및 용량 검증
- [ ] 테이블 크기 모니터링
- [ ] 인덱스 효율성 검증
- [ ] 쿼리 성능 분석

### 2.3 알림 시스템
- [x] **실시간 알림**: 구매링크 누락 발견 시 즉시 Slack 알림
- [x] **리뷰 등록 알림**: 신규 리뷰 등록 시 개별 Slack 알림
- **일일 리포트**: 매일 정해진 시간에 검증 결과 요약 발송
- [x] **알림 채널**: Slack Webhook 통합 완료 (구매링크/리뷰 별도 채널)
- [x] **중복 알림 방지**: 
  - 구매링크: 10분마다 모든 누락 건 재알림
  - 리뷰: **하이브리드 방식** (시간 윈도우 + 처리 ID 목록)

### 2.4 대시보드
- **검증 결과 시각화**: 차트와 그래프로 상태 표시
- **이력 관리**: 과거 검증 결과 조회
- **필터링 및 검색**: 특정 기간, 항목별 결과 조회

## 3. 기술 스택

### 3.1 백엔드
- [x] **언어**: Node.js (JavaScript)
- [x] **데이터베이스**: MySQL2 (읽기 전용 접근, SSL 연결)
- **프레임워크**: Express.js 또는 Fastify
- [x] **데이터베이스 드라이버**: mysql2/promise

### 3.2 검증 엔진
- [x] **스케줄러**: 
  - 구매링크: GitHub Actions (10분마다)
  - 리뷰: GitHub Actions (5분마다 설정, 실제 5-20분 불규칙 실행)
- [x] **로컬 스케줄러**: PM2 + setInterval (백업용, 1분마다)
- [x] **검증 로직**: 
  - purchase_link_monitor.js (구매링크 검증)
  - **review_monitor_hybrid.js** (하이브리드 리뷰 모니터링 - 메인)
  - review_monitor_stateful.js (ID 기반 - deprecated)
  - review_monitor_simple.js (로컬 백업용)
- [x] **상태 관리**: 
  - 구매링크: 중복 체크 제거 (매번 전체 알림)
  - 리뷰: **하이브리드 방식** (시간 윈도우 + 처리 ID 목록)
- [x] **타임존 처리**: MySQL NOW() + 9시간으로 KST 보정
- [x] **외부 저장소**: GitHub Gist API (처리 ID 목록 7일간 보존)

### 3.3 알림
- **이메일**: Nodemailer
- [x] **Slack**: Slack Webhook + Block Kit
- **SMS**: Twilio 또는 AWS SNS

### 3.4 모니터링
- **메트릭 수집**: Prometheus
- **시각화**: Grafana
- **에러 추적**: Sentry

## 4. 데이터베이스 구조 (실제)

### 4.1 주요 비즈니스 테이블

#### 광고 관련
- **Ads**: 광고 정보 (id, companyId, name, category, local, status 등)
- **Ads_Payment**: 광고 결제 정보
- **Ads_Group**: 광고 그룹 관리
- **AdKeywords**: 광고 키워드
- **AdKeywordRankHistories**: 키워드 순위 이력

#### 계약 관련
- **Contracts**: 계약 정보
- **Companies**: 광고주 회사 정보
- **CompanyPoints**: 회사 포인트 관리

#### 사용자 관련
- **Users**: 일반 사용자 정보
- **AuthUsers**: 인증된 사용자 정보
- **Users_PostLevel**: 사용자 포스팅 레벨
- **UserPoints**: 사용자 포인트

#### 인플루언서 관련
- **Influencers**: 인플루언서 정보
- **InfluencerBlogPostMetadata**: 블로그 포스트 메타데이터
- **InfluencerBlogQuality**: 블로그 품질 평가
- **InfluencerRankHistories**: 인플루언서 순위 이력

#### 키워드 관련
- **Keywords**: 키워드 마스터
- **KeywordRankHistories**: 키워드 순위 이력
- **KeywordSearchHistories**: 키워드 검색 이력
- **NaverPlaceKeywords**: 네이버 플레이스 키워드

#### 채널 관련
- **Channels**: 채널 정보
- **ChannelCampaigns**: 채널 캠페인 (purchaseLink 포함)
- **Propositions**: 제안 정보 (purchaseLink 검증 대상)
- **youtubeChannels**: 유튜브 채널
- **tiktokChannels**: 틱톡 채널

#### 기타
- **ViewHistories**: 조회 이력
- **Favorites**: 즐겨찾기
- **Notice**: 공지사항
- **MarketingLead**: 마케팅 리드

## 5. 검증 규칙 예시

### 5.1 데이터 무결성
```sql
-- [구현완료] 구매링크 누락 검증
SELECT 
  p.id,
  p.cname,
  p.campaignId,
  cc.purchaseLink as channelPurchaseLink,
  p.purchaseLink as propositionPurchaseLink,
  p.createdAt,
  p.updatedAt,
  p.responsedAt
FROM Propositions p
INNER JOIN ChannelCampaigns cc ON p.campaignId = cc.campaignId
WHERE cc.purchaseLink IS NOT NULL 
  AND cc.purchaseLink != ''
  AND (p.purchaseLink IS NULL OR p.purchaseLink = '')
  AND p.responsedAt IS NOT NULL
  AND p.createdAt >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
ORDER BY p.id DESC;

-- [구현완료] 신규 리뷰 등록 감지 (Hybrid)
SELECT 
  p.id,
  p.cname,
  p.review,
  p.reviewRegisteredAt,
  p.uid,
  u.outerId,
  comp.manager
FROM Propositions p
LEFT JOIN Users u ON p.uid = u.uid
LEFT JOIN Campaigns c ON p.campaignId = c.id
LEFT JOIN Companies comp ON c.companyId = comp.id
WHERE p.review IS NOT NULL 
  AND p.review != ''
  -- 2시간 윈도우로 모든 최근 리뷰 조회
  AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 2 HOUR)
  AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
ORDER BY p.reviewRegisteredAt ASC;
-- 이후 애플리케이션에서 처리된 ID 목록과 비교하여 필터링

-- 광고 필수 필드 NULL 체크
SELECT COUNT(*) FROM Ads WHERE name IS NULL OR companyId IS NULL;

-- 중복 이메일 체크 (AuthUsers)
SELECT email, COUNT(*) FROM AuthUsers GROUP BY email HAVING COUNT(*) > 1;

-- 계약-광고 참조 무결성 체크
SELECT c.* FROM Contracts c 
LEFT JOIN Ads a ON c.adId = a.id 
WHERE a.id IS NULL;

-- 회사-광고 참조 무결성 체크
SELECT a.* FROM Ads a 
LEFT JOIN Companies c ON a.companyId = c.id 
WHERE c.id IS NULL;
```

### 5.2 비즈니스 로직
```sql
-- 종료된 광고의 활성 계약 체크
SELECT c.* FROM Contracts c 
JOIN Ads a ON c.adId = a.id 
WHERE a.is_verified = 0 AND c.status = 'active';

-- 비정상적인 포인트 사용 패턴
SELECT * FROM UserPoints 
WHERE points < 0 OR points > 1000000;

-- 키워드 순위 이상 체크 (순위가 음수이거나 너무 큰 경우)
SELECT * FROM KeywordRankHistories 
WHERE rank < 0 OR rank > 1000;

-- 결제 정보와 계약 불일치 체크
SELECT p.* FROM Ads_Payment p
WHERE p.payState = 1 
AND NOT EXISTS (
  SELECT 1 FROM Contracts c 
  WHERE c.paymentId = p.id
);
```

## 6. 구현 현황

### Phase 1: 기본 인프라 구축 ✅ 완료
- [x] 데이터베이스 읽기 전용 연결 설정 (SSL 지원)
- [x] 기본 검증 엔진 구조 구축 (purchase_link_monitor.js)
- [x] 환경변수 관리 (dotenv)

### Phase 2: 핵심 검증 로직 구현 ✅ 완료
- [x] 구매링크 누락 검증 구현
- [x] 필터 조건 적용 (2개월, responsedAt NOT NULL)
- [x] 중복 알림 방지 로직 (제거됨 - 매번 전체 알림)

### Phase 3: 알림 시스템 구축 ✅ 완료
- [x] Slack Webhook 알림 구현
- [x] Slack Block Kit으로 리치 메시지 포맷
- [x] 별도 채널로 알림 분리 (구매링크/리뷰)

### Phase 4: 자동화 시스템 구축 ✅ 완료
- [x] GitHub Actions 24/7 모니터링 설정
- [x] 구매링크: 10분마다 자동 실행
- [x] 리뷰: 10분마다 자동 실행 (GitHub Actions 안정성 고려)
- [x] PM2 로컬 백업 옵션

### Phase 5: 리뷰 모니터링 시스템 ✅ 완료
- [x] 신규 리뷰 실시간 감지
- [x] 캠페인명, 블로거 ID, 매니저명 포함
- [x] ~~시간 기반 중복 방지~~ → ~~ID 기반 상태 추적~~ → **하이브리드 방식**
- [x] 타임존 이슈 해결 (MySQL NOW() + 9시간 보정)
- [x] GitHub Actions 실행 안정성 개선
- [x] **GitHub Gist 통합** (처리 ID 목록 저장)
- [x] **완벽한 중복 방지** (처리 ID 목록 비교)
- [x] **누락 방지** (2시간 윈도우 + ID 목록)
- [x] **ID 순서 문제 해결** (ID ≠ 시간순)

### Phase 6: 확장 가능한 검증 항목 (예정)
- [ ] 다른 데이터 무결성 검증 추가
- [ ] 비즈니스 로직 검증 확대
- [ ] 대시보드 개발

## 7. 구현 세부사항

### 7.1 구매링크 누락 모니터링
- **파일**: purchase_link_monitor.js
- **실행 주기**: 10분 (GitHub Actions)
- **검증 조건**:
  - ChannelCampaigns.purchaseLink가 존재하지만
  - Propositions.purchaseLink가 NULL인 경우
  - 최근 2개월 이내 데이터
  - responsedAt이 NOT NULL인 경우만
- **알림**: 모든 누락 건을 10분마다 Slack으로 전송 (중복 체크 없음)

### 7.2 리뷰 등록 모니터링 (Hybrid 시스템)
- **파일**: 
  - **review_monitor_hybrid.js** (메인 - 하이브리드 방식)
  - review_monitor_stateful.js (deprecated - ID 순서 문제)
  - review_monitor_simple.js (로컬 백업용)
- **실행 주기**: 
  - GitHub Actions: 5분마다 설정 (cron: `*/5 * * * *`)
  - 실제 실행: 5-20분 불규칙 (GitHub 부하에 따라)
- **상태 관리**:
  - **GitHub Gist**: 처리된 ID 목록 저장 (7일간 유지)
  - **Gist ID**: d5885e45802bdba05f3152f410753cff
  - **인증**: Personal Access Token (gist 권한)
- **검증 방식 (하이브리드)**:
  1. 최근 2시간 내 모든 리뷰 조회
  2. Gist에서 처리된 ID 목록 가져오기
  3. 처리되지 않은 ID만 필터링
  4. 알림 전송 후 처리 ID 목록 업데이트
- **핵심 개선사항**:
  - **ID 순서 문제 해결**: Propositions ID는 생성순이지 리뷰 등록순이 아님
  - **완벽한 누락 방지**: 시간 윈도우 + ID 목록 조합
  - **메모리 최적화**: 7일 이상 된 ID는 자동 삭제
- **알림 내용**:
  - 캠페인명 (cname)
  - 블로거 ID (Users.outerId)
  - 매니저명 (Companies.manager)
  - 리뷰 URL
  - 등록 시간 (한국 시간)
  - 처리 ID (추적용)

### 7.3 배포 및 운영
- **GitHub Actions**: 메인 배포 환경
- **환경변수**: GitHub Secrets로 안전하게 관리
- **모니터링**: GitHub Actions 대시보드에서 실행 이력 확인
- **로컬 백업**: PM2로 관리 (review_scheduler.js)

## 8. 보안 고려사항
- 데이터베이스 접근 권한 최소화 (읽기 전용)
- 민감한 정보 마스킹 처리
- 접근 로그 기록
- API 인증 및 권한 관리
- GitHub Secrets로 환경변수 관리
- Webhook URL 노출 방지 (.gitignore 설정)

## 9. 확장 가능성
- 다중 데이터베이스 지원
- 커스텀 검증 규칙 플러그인 시스템
- AI 기반 이상 탐지
- 자동 복구 기능

## 10. 알려진 이슈 및 해결사항
### 10.1 타임존 이슈 ✅ 해결
- **문제**: MySQL NOW()가 9시간 뒤쳐짐 (UTC vs KST)
- **현상**: reviewRegisteredAt은 KST로 저장되지만 MySQL NOW()는 UTC 기준
- **해결**: SQL 쿼리에서 `DATE_ADD(NOW(), INTERVAL 9 HOUR)`로 KST 보정

### 10.2 GitHub Actions 불규칙 실행 ✅ 완벽 해결
- **문제**: cron이 정확히 5분마다 실행되지 않음 (5-20분 간격 불규칙)
- **근본 원인**: GitHub Actions의 스케줄러 부하로 인한 지연
- **해결책**: **Stateful 시스템 구현**
  - GitHub Gist로 마지막 처리 ID 저장
  - ID 기반 추적으로 중복/누락 완벽 방지
  - 1시간 안전 윈도우로 네트워크 이슈 대응
  - 실행 간격과 무관하게 안정적 작동

### 10.3 중복 알림 방지 ✅ 완벽 해결
- **구매링크**: 중복 체크 제거, 매번 전체 알림
- **리뷰**: 
  - ~~시간 윈도우 기반~~ → ~~ID 기반 상태 추적~~ → **하이브리드 방식**
  - GitHub Gist에 처리 ID 목록 저장
  - 서버 재시작해도 상태 유지
  - 7일 이상 된 ID는 자동 정리

### 10.4 GitHub Actions vs 로컬 환경
- **차이점**: GitHub Actions 환경에서도 MySQL 연결 시 동일한 타임존 이슈 발생
- **해결**: 모든 환경에서 동일한 9시간 보정 로직 적용

### 10.5 환경변수 네이밍 제약 ✅ 해결
- **문제**: GitHub Secrets에서 `GITHUB_`로 시작하는 이름 사용 불가
- **원인**: GitHub 예약 접두사
- **해결**: 
  - `GITHUB_GIST_ID` → `GIST_ID`
  - `GITHUB_TOKEN` → `GH_TOKEN`

### 10.6 ID 순서 문제 ✅ 해결
- **문제**: Propositions 테이블의 ID는 레코드 생성 순서
- **현상**: ID가 작은 리뷰가 나중에 등록되는 경우 발생
  - 예: ID 10002933 처리 후, ID 10002443이 나중에 리뷰 등록
- **기존 방식의 한계**: `p.id > lastProcessedId`로는 놓치는 리뷰 발생
- **해결**: **하이브리드 방식 구현**
  - 시간 윈도우(2시간)로 최근 리뷰 모두 조회
  - 처리된 ID 목록과 비교하여 필터링
  - 완벽한 중복 방지 + 누락 방지

## 11. 하이브리드 시스템 아키텍처

### 11.1 시스템 구성도
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ GitHub Actions  │────▶│   Hybrid     │────▶│   MySQL     │
│  (5분마다)      │     │   Monitor    │     │  Database   │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                        ┌──────┴──────┐
                        ▼             ▼
                ┌──────────────┐ ┌──────────────┐
                │ 시간 윈도우   │ │ GitHub Gist  │
                │  (2시간)     │ │ (ID 목록)    │
                └──────────────┘ └──────────────┘
                        │             │
                        └──────┬──────┘
                               ▼
                        ┌──────────────┐
                        │    Slack     │
                        │   Webhook    │
                        └──────────────┘
```

### 11.2 하이브리드 방식 작동 원리
```
1. 시간 윈도우 조회 (2시간)
   └─> 최근 등록된 모든 리뷰 가져오기

2. Gist에서 처리 ID 목록 읽기
   └─> Set 자료구조로 빠른 조회

3. 필터링
   └─> 처리되지 않은 ID만 선별

4. 알림 전송
   └─> Slack으로 개별 알림

5. 상태 업데이트
   └─> 처리 ID 목록에 추가
   └─> Gist에 저장 (7일간 유지)
```

### 11.3 핵심 장점
1. **ID 순서 독립성**: ID가 시간순이 아니어도 정확히 감지
2. **완벽한 중복 방지**: 처리 ID 목록으로 중복 제거
3. **누락 방지**: 2시간 윈도우로 충분한 여유 확보
4. **메모리 효율성**: 7일 이상 된 ID 자동 삭제
5. **실행 간격 독립성**: 불규칙한 실행에도 안정적 작동
6. **영구 상태 보존**: GitHub Gist에 저장되어 재시작 후에도 유지

## 12. 로컬/GitHub Actions 하이브리드 실행

### 12.1 실행 방식
- **로컬 실행**: 컴퓨터 켜져 있을 때 우선 실행 (2분 간격)
- **GitHub Actions**: 백업용 (5-20분 불규칙 실행)
- **중복 방지**: GitHub Gist 공유로 상태 동기화

### 12.2 로컬 모니터링
- **파일**: local_monitor.js
- **실행 주기**: 2분 (setInterval)
- **상태 관리**: GitHub Gist와 동기화
- **장점**: 빠른 응답, 안정적 주기

## 13. 슈퍼차트 대시보드 시스템

### 13.1 프로젝트 개요
- **프로젝트명**: 슈퍼차트 대시보드 (superchart-dashboard)
- **목적**: 실시간 매출 현황 및 리뷰 모니터링 대시보드
- **기술 스택**: Next.js 14, TypeScript, Tailwind CSS
- **배포**: Vercel (준비 완료)

### 13.2 주요 기능

#### 13.2.1 대시보드 메인
- **월 매출 카드**: 현재 월 총 매출 표시
- **누적 매출 카드**: 전체 기간 누적 매출
- **슈퍼차트 매출 카드**: 슈퍼차트 전용 매출 통계
- **매출 차트**: 
  - 일별/월별 매출 트렌드 그래프
  - 선택 가능한 기간 필터 (7일, 30일, 90일, 1년)
- **상품별 매출**: 상품 카테고리별 매출 분포

#### 13.2.2 리뷰 모니터링
- **실시간 통계**:
  - 오늘 등록된 리뷰 수
  - 이번 주 리뷰 수
  - 이번 달 리뷰 수
  - 전체 리뷰 수
- **최근 리뷰 목록**: 
  - 캠페인명
  - 블로거 ID
  - 매니저
  - 등록 시간
  - 리뷰 URL 링크
- **자동 새로고침**: 30초마다 데이터 업데이트

#### 13.2.3 사이드바 네비게이션
- **확장형 사이드바**: 
  - 기본 60px 너비
  - 호버 시 240px로 확장
  - 부드러운 애니메이션 전환
- **메뉴 구성**:
  - 대시보드 (홈)
  - 리뷰 모니터링
  - 설정 (예정)
- **브랜드 컬러**: #F21A0D (슈퍼차트 레드)

### 13.3 기술 구현

#### 13.3.1 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **스타일링**: Tailwind CSS v3
- **차트**: Recharts
- **아이콘**: Lucide React
- **타입스크립트**: 완전한 타입 안정성

#### 13.3.2 백엔드
- **API Routes**: Next.js API 라우트
- **데이터베이스**: 
  - MySQL (기존 데이터 읽기 전용)
  - Supabase (실시간 기능용 - 예정)
- **연결 풀**: mysql2/promise
- **환경변수**: .env.local (dev.env와 동일)

#### 13.3.3 파일 구조
```
superchart-dashboard/
├── app/
│   ├── layout.tsx           # 루트 레이아웃
│   ├── page.tsx             # 메인 대시보드
│   ├── globals.css          # 전역 스타일
│   ├── api/
│   │   ├── sales/
│   │   │   └── route.ts     # 매출 데이터 API
│   │   └── reviews/
│   │       └── route.ts     # 리뷰 데이터 API
│   └── reviews/
│       └── page.tsx         # 리뷰 모니터링 페이지
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx      # 사이드바 컴포넌트
│   ├── dashboard/
│   │   ├── SalesCard.tsx    # 매출 카드
│   │   └── SalesChart.tsx   # 매출 차트
│   └── reviews/
│       ├── ReviewStats.tsx  # 리뷰 통계
│       └── ReviewList.tsx   # 리뷰 목록
├── lib/
│   ├── db.ts               # MySQL 연결
│   ├── supabase.ts         # Supabase 클라이언트
│   └── utils.ts            # 유틸리티 함수
├── public/                 # 정적 파일
├── package.json            # 의존성
├── next.config.js          # Next.js 설정
├── tailwind.config.js      # Tailwind 설정
├── tsconfig.json           # TypeScript 설정
└── .env.local             # 환경변수
```

### 13.4 설치 및 실행

#### 13.4.1 의존성 설치
```bash
cd superchart-dashboard
npm install
```

#### 13.4.2 환경변수 설정
`.env.local` 파일에 다음 변수 설정:
- MySQL 연결 정보
- Slack Webhook URL
- GitHub Gist 설정
- Supabase 키

#### 13.4.3 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 에서 확인

#### 13.4.4 프로덕션 빌드
```bash
npm run build
npm run start
```

### 13.5 해결된 이슈

#### 13.5.1 Tailwind CSS v4 호환성
- **문제**: v4 알파 버전의 불안정성
- **해결**: v3로 다운그레이드 (`npm install tailwindcss@3`)

#### 13.5.2 CSS 클래스 오류
- **문제**: `border-border` 클래스 미존재
- **해결**: 표준 Tailwind 클래스로 교체 (`border-gray-200`)

#### 13.5.3 Next.js 설정 오류
- **문제**: swcMinify 옵션 deprecated
- **해결**: next.config.js에서 옵션 제거

### 13.6 상위노출 대시보드 기능 개선

#### 13.6.1 데이터 관리 개선
- [x] **키워드 데이터 소스 변경**: ChannelCampaigns.requiredKeywords에서 가져오기
- [x] **컬럼 분리**: 업체명(company_name)과 캠페인명(campaign_name) 별도 표시
- [x] **블로거 ID 표시**: 별도 컬럼으로 추가
- [x] **키워드 포맷팅**: JSON 배열 특수문자([,",]) 자동 제거

#### 13.6.2 검색 및 필터링
- [x] **통합 검색 기능**:
  - 업체명, 캠페인명, 블로거 ID, 키워드로 검색
  - 실시간 검색 (엔터키 또는 검색 버튼)
  - 검색 아이콘 포함된 UI

- [x] **다중 필터링**:
  - 매니저별 필터 (드롭다운, 자동 목록 생성)
  - 성공 여부 필터 (대기/성공/실패)
  - 날짜 범위 필터 (시작/종료 날짜)
  - 필터 토글 버튼 (표시/숨김)
  - 필터 초기화 기능

#### 13.6.3 UI/UX 개선
- [x] **개선된 페이지네이션**:
  - 숫자 페이지 버튼 (1,2,3,4,5 형식)
  - 현재 페이지 강조 (브랜드 컬러)
  - 스마트 페이징 (첫/마지막 페이지 표시, ... 생략 표시)
  - 이전/다음 화살표 버튼

- [x] **인라인 편집 개선**:
  - 셀 클릭으로 즉시 편집 모드
  - 개별 셀만 편집 (다중 편집 방지)
  - Enter로 저장, ESC로 취소
  - 포커스 아웃 시 자동 저장
  - 편집 중인 셀 시각적 피드백

- [x] **데이터 표시 개선**:
  - 한 페이지 50개 항목 표시
  - 최신 리뷰 자동 상단 정렬
  - 실시간 데이터 업데이트 (새 리뷰 추가 시)

#### 13.6.4 데이터 연동
- [x] **Supabase 통합**:
  - exposure_tracking 테이블 생성 및 관리
  - 실시간 구독으로 자동 업데이트
  - RLS 정책 적용 (읽기: 공개, 수정: 인증 필요)

- [x] **자동 데이터 동기화**:
  - review_monitor_hybrid.js에서 자동 저장
  - MySQL → Supabase 실시간 동기화
  - 중복 방지 (proposition_id unique constraint)

### 13.7 향후 계획
- [ ] Vercel 배포 자동화
- [ ] 사용자 인증 시스템
- [ ] 엑셀 내보내기 기능
- [ ] 대량 편집 기능
- [ ] 고급 필터 (다중 키워드, 정규식)
- [ ] 통계 대시보드 추가
- [ ] 모바일 최적화 강화
- [ ] 다크 모드 지원