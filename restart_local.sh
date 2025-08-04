#!/bin/bash

echo "🔄 로컬 리뷰 모니터링 재시작..."
echo "================================"
echo ""

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2가 설치되어 있지 않습니다."
    echo "설치: npm install -g pm2"
    exit 1
fi

# 재시작
pm2 restart review-monitor-local

echo ""
echo "✅ 로컬 모니터링이 재시작되었습니다!"
echo ""
echo "📌 로그 보기: pm2 logs review-monitor-local"