#!/bin/bash

echo "=========================================="
echo "🎭 剧本杀门店综合运营平台"
echo "=========================================="
echo ""

echo "📦 后端服务 (端口: 8672)"
echo "🌐 前端页面 (端口: 3672)"
echo ""

cd "$(dirname "$0")"

# 检查后端服务
if ! lsof -Pi :8672 > /dev/null 2>&1; then
    echo "🚀 启动后端服务..."
    cd backend
    nohup npm run dev > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "后端服务已启动 (PID: $BACKEND_PID)"
    cd ..
else
    echo "✅ 后端服务已在运行"
fi

sleep 3

# 启动前端服务
if ! lsof -Pi :3672 > /dev/null 2>&1; then
    echo "🚀 启动前端服务..."
    cd frontend
    nohup npx vite --host 0.0.0.0 --port 3672 > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "前端服务已启动 (PID: $FRONTEND_PID)"
    cd ..
else
    echo "✅ 前端服务已在运行"
fi

sleep 5

echo ""
echo "=========================================="
echo "✅ 服务启动完成！"
echo "=========================================="
echo ""
echo "🌐 前端地址: http://localhost:3672"
echo "🔧 后端API: http://localhost:8672/api"
echo "💚 健康检查: http://localhost:8672/api/health"
echo ""
echo "📝 后端日志: tail -f /tmp/backend.log"
echo "📝 前端日志: tail -f /tmp/frontend.log"
echo ""
echo "测试账号:"
echo "  管理员: admin / 123456"
echo "  主持人: host1 / 123456"
echo "  玩家: player1 / 123456"
echo ""
echo "按 Ctrl+C 停止查看日志，或运行 ./stop.sh 停止服务"
echo "=========================================="
