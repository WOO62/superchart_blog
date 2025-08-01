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
- [ ] NULL 값 검증: 필수 필드의 NULL 값 체크
- [ ] 중복 데이터 검증: 유니크해야 할 데이터의 중복 체크
- [ ] 참조 무결성: 외래 키 관계 검증
- [ ] 데이터 형식 검증: 이메일, URL, 날짜 형식 등

#### 2.2.2 비즈니스 로직 검증
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
- **일일 리포트**: 매일 정해진 시간에 검증 결과 요약 발송
- [x] **알림 채널**: Slack Webhook 통합 완료
- [x] **중복 알림 방지**: notification_log.json을 통한 상태 관리

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
- [x] **스케줄러**: GitHub Actions (10분마다 실행)
- [x] **로컬 스케줄러**: PM2 + setInterval (백업용)
- [x] **검증 로직**: purchase_link_monitor.js
- [x] **상태 관리**: JSON 파일 기반 (notification_log.json)

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
- [x] 중복 알림 방지 로직

### Phase 3: 알림 시스템 구축 ✅ 완료
- [x] Slack Webhook 알림 구현
- [x] Slack Block Kit으로 리치 메시지 포맷
- [x] 알림 이력 관리 (notification_log.json)

### Phase 4: 자동화 시스템 구축 ✅ 완료
- [x] GitHub Actions 24/7 모니터링 설정
- [x] 10분마다 자동 실행
- [x] PM2 로컬 백업 옵션

### Phase 5: 확장 가능한 검증 항목 (예정)
- [ ] 다른 데이터 무결성 검증 추가
- [ ] 비즈니스 로직 검증 확대
- [ ] 대시보드 개발

## 7. 구현 세부사항

### 7.1 구매링크 누락 모니터링
- **파일**: purchase_link_monitor.js
- **실행 주기**: 10분
- **검증 조건**:
  - ChannelCampaigns.purchaseLink가 존재하지만
  - Propositions.purchaseLink가 NULL인 경우
  - 최근 2개월 이내 데이터
  - responsedAt이 NOT NULL인 경우만
- **알림**: 신규 누락 건만 Slack으로 전송

### 7.2 배포 및 운영
- **GitHub Actions**: 메인 배포 환경
- **환경변수**: GitHub Secrets로 안전하게 관리
- **모니터링**: GitHub Actions 대시보드에서 실행 이력 확인

## 7. 보안 고려사항
- 데이터베이스 접근 권한 최소화 (읽기 전용)
- 민감한 정보 마스킹 처리
- 접근 로그 기록
- API 인증 및 권한 관리

## 8. 확장 가능성
- 다중 데이터베이스 지원
- 커스텀 검증 규칙 플러그인 시스템
- AI 기반 이상 탐지
- 자동 복구 기능