#!/bin/bash

echo "🛑 로컬 리뷰 모니터링 중지..."
echo "================================"
echo ""

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2가 설치되어 있지 않습니다."
    exit 1
fi

# 실행 중인지 확인
if ! pm2 list | grep -q "review-monitor-local"; then
    echo "⚠️  실행 중이지 않습니다."
    exit 0
fi

# PM2로 중지
pm2 stop review-monitor-local
pm2 delete review-monitor-local

echo ""
echo "✅ 로컬 모니터링이 중지되었습니다!"
echo ""
echo "💡 GitHub Actions는 계속 실행됩니다 (30-60분 간격)"