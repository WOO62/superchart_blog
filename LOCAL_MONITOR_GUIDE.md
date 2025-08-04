# 로컬 + GitHub Actions 하이브리드 모니터링 가이드

## 개요
컴퓨터가 켜져 있을 때는 로컬에서 2분마다, 꺼져 있을 때는 GitHub Actions가 30-60분마다 실행됩니다.
**GitHub Gist를 통해 상태를 공유하므로 중복 알림이 발생하지 않습니다.**

## 시스템 구조
```
┌──────────────┐         ┌──────────────┐
│ 로컬 (2분)    │ ──────> │ GitHub Gist  │ <────── │ GitHub Actions │
│ 컴퓨터 켜짐   │         │ (상태 공유)   │         │ (30-60분)      │
└──────────────┘         └──────────────┘         └────────────────┘
                               ↓
                         처리 ID 목록 저장
                         중복 알림 방지
```

## 설치

### 1. PM2 설치 (선택사항, 권장)
```bash
npm install -g pm2
```

### 2. 로그 디렉토리 생성
```bash
mkdir -p logs
```

## 사용법

### PM2 사용 시 (권장)

#### 시작
```bash
./start_local.sh
```

#### 중지
```bash
./stop_local.sh
```

#### 재시작
```bash
./restart_local.sh
```

#### 상태 확인
```bash
./status_local.sh
# 또는
pm2 status
```

#### 로그 보기
```bash
pm2 logs review-monitor-local
```

### Node.js 직접 실행

#### 시작
```bash
# 포그라운드 실행 (터미널 창 유지)
node local_monitor.js

# 백그라운드 실행
nohup node local_monitor.js > logs/local.log 2>&1 &
```

#### 중지
```bash
# 프로세스 찾기
ps aux | grep local_monitor

# 프로세스 종료
kill <PID>
```

## 작동 방식

### 중복 방지 메커니즘
1. **로컬 실행 (2분마다)**
   - Gist에서 처리된 ID 목록 읽기
   - 새 리뷰만 알림 전송
   - 처리 ID를 Gist에 추가

2. **GitHub Actions 실행 (30-60분마다)**
   - 동일한 Gist 사용
   - 로컬에서 이미 처리한 ID는 건너뜀
   - 로컬이 꺼져있을 때 백업 역할

### 시나리오별 동작

#### 시나리오 1: 컴퓨터 켜짐
- 로컬: 2분마다 실행 ✅
- GitHub: 30-60분마다 실행 (중복 ID는 자동 스킵)
- 결과: 빠른 알림, 중복 없음

#### 시나리오 2: 컴퓨터 꺼짐
- 로컬: 실행 안 됨 ❌
- GitHub: 30-60분마다 실행 ✅
- 결과: 느리지만 놓치지 않음

#### 시나리오 3: 로컬 시작 후
- 로컬이 Gist 읽고 GitHub이 처리한 것 스킵
- 새로운 리뷰만 처리

## 모니터링

### 처리 상태 확인
```bash
# Gist 내용 확인 (처리된 ID 목록)
curl -s https://gist.github.com/WOO62/d5885e45802bdba05f3152f410753cff
```

### 실행 로그
- 로컬: `logs/review-monitor-*.log`
- GitHub: Actions 탭에서 확인

## 문제 해결

### PM2 프로세스가 자동 재시작되는 경우
```bash
pm2 delete review-monitor-local
pm2 start ecosystem.config.js
```

### 로그 파일이 너무 큰 경우
```bash
pm2 flush  # PM2 로그 초기화
# 또는
> logs/review-monitor-out.log  # 파일 비우기
```

### Gist 상태 초기화가 필요한 경우
1. https://gist.github.com/WOO62/d5885e45802bdba05f3152f410753cff 접속
2. Edit 클릭
3. 내용을 다음으로 변경:
```json
{
  "lastCheckTime": null,
  "processedIds": [],
  "lastProcessedTime": null,
  "totalProcessed": 0
}
```

## 장점
- ✅ 컴퓨터 켜져있을 때: 2분마다 빠른 알림
- ✅ 컴퓨터 꺼져있을 때: GitHub이 백업 (30-60분)
- ✅ 중복 알림 완벽 방지
- ✅ 상태 영구 보존 (Gist)
- ✅ 언제든 시작/중지 가능

## 주의사항
- GitHub Actions는 무료 플랜에서 스케줄 실행이 불규칙함
- 로컬과 GitHub이 동시에 실행되어도 안전함 (Gist 동기화)
- 7일 이상 된 처리 ID는 자동 삭제 (메모리 관리)