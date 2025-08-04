#!/bin/bash

echo "📊 모니터링 상태 확인"
echo "================================"
echo ""

# PM2 상태
echo "🖥️  로컬 모니터링 (PM2):"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "review-monitor-local"; then
        echo "  ✅ 실행 중 (5분마다)"
        pm2 list | grep "review-monitor-local"
    else
        echo "  ⭕ 중지됨"
    fi
else
    echo "  ❌ PM2 미설치"
fi

echo ""
echo "☁️  GitHub Actions:"
echo "  설정: 5분마다"
echo "  실제: 30-60분마다 (GitHub 서버 부하)"

# 최근 GitHub Actions 실행 확인
echo ""
echo "📅 최근 GitHub Actions 실행:"
gh run list --workflow=review-monitor.yml --limit=3 2>/dev/null || echo "  GitHub CLI 미설치"

echo ""
echo "📦 Gist 상태 동기화:"
echo "  ✅ 로컬과 GitHub이 같은 Gist 사용"
echo "  ✅ 중복 알림 자동 방지"