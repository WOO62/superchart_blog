# Vercel 환경변수 설정 가이드

## 필수 환경변수

Vercel 대시보드에서 다음 환경변수들을 설정해야 합니다:

### 1. Supabase 설정
```
NEXT_PUBLIC_SUPABASE_URL=https://lrszozurmxfjzarnjibw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc3pvenVybXhmanphcm5qaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDgwMDcsImV4cCI6MjA2NTcyNDAwN30.CVL4oSnPT3ow9dyOMs5VgGbuZblHVWvqJ6jNNewo29s
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc3pvenVybXhmanphcm5qaWJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE0ODAwNywiZXhwIjoyMDY1NzI0MDA3fQ.leGCplxbqAO5sTKg5NHOuhNC_ouszSJXJWH0CZcOVrk
```

### 2. MySQL 설정 (API 라우트용)
```
MYSQL_HOST=supermembers-prod.cluster-cy8cnze5wxti.ap-northeast-2.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_DATABASE=supermembers
MYSQL_USERNAME=woo
MYSQL_PASSWORD=wooZ6p!a4@Lcn
```

## 설정 방법

1. [Vercel 대시보드](https://vercel.com) 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. 위의 모든 변수 추가
5. 모든 환경(Production, Preview, Development)에 적용
6. 저장 후 재배포

## 확인 방법

배포 후 `/api/check-env` 엔드포인트로 환경변수 설정 확인 가능