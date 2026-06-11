#!/bin/bash

echo "🛑 停止剧本杀运营平台服务..."

# 停止后端服务
echo "停止后端服务 (端口 8672..."
pkill -f "ts-node-dev.*src/server.ts" 2>/dev/null
pkill -f "node.*dist/server.js" 2>/dev/null

# 停止前端服务
echo "停止前端服务 (端口 3672)..."
pkill -f "vite" 2>/dev/null

sleep 2

# 检查端口是否还有进程
for port in 8672 3672; do
    if lsof -Pi :$port > /dev/null 2>&1; then
        PIDS=$(lsof -ti :$port)
        if [ -n "$PIDS" ]; then
            echo "强制停止端口 $port 的进程..."
            kill -9 $PIDS 2>/dev/null
        fi
    fi
done

echo "✅ 所有服务已停止"
