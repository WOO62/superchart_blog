#!/bin/bash

echo "🚀 로컬 리뷰 모니터링 시작..."
echo "================================"
echo ""

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2가 설치되어 있지 않습니다."
    echo "설치: npm install -g pm2"
    exit 1
fi

# 이미 실행 중인지 확인
if pm2 list | grep -q "review-monitor-local"; then
    echo "⚠️  이미 실행 중입니다."
    echo "재시작하려면: ./restart_local.sh"
    echo "중지하려면: ./stop_local.sh"
    exit 0
fi

# PM2로 시작
pm2 start ecosystem.config.js

echo ""
echo "✅ 로컬 모니터링이 시작되었습니다!"
echo ""
echo "📌 유용한 명령어:"
echo "  상태 확인: pm2 status"
echo "  로그 보기: pm2 logs review-monitor-local"
echo "  중지: ./stop_local.sh"
echo "  재시작: ./restart_local.sh"
echo ""
echo "💡 GitHub Actions와 동시 실행 가능 (Gist로 중복 방지)"