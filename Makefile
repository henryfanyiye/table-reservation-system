.PHONY: help install install-backend install-frontend \
	dev dev-backend dev-frontend \
	test test-backend test-cov test-cov-open \
	docker-up docker-down docker-logs docker-restart docker-clean

# 默认目标 - 显示帮助
help:
	@echo "📦 Table Reservation System - Make 命令"
	@echo ""
	@echo "安装依赖:"
	@echo "  make install         - 安装所有依赖"
	@echo "  make install-backend - 只安装后端依赖"
	@echo "  make install-frontend- 只安装前端依赖"
	@echo ""
	@echo "开发启动:"
	@echo "  make dev             - 启动开发环境 (前后端)"
	@echo "  make dev-backend     - 只启动后端开发服务器"
	@echo "  make dev-frontend    - 只启动前端开发服务器"
	@echo ""
	@echo "测试:"
	@echo "  make test-backend    - 运行后端测试"
	@echo "  make test-cov        - 生成测试覆盖率报告"
	@echo "  make test-cov-open   - 生成测试覆盖率报告并打开"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up       - 启动容器（强制重新构建）"
	@echo "  make docker-down     - 停止容器"
	@echo "  make docker-logs     - 查看日志"
	@echo "  make docker-restart  - 重启容器"
	@echo "  make docker-clean    - 清理容器和卷"

# ============================================
# 安装依赖
# ============================================

install: install-backend install-frontend
	@echo "✅ 所有依赖安装完成"

install-backend:
	@echo "📦 安装后端依赖..."
	cd backend && npm install

install-frontend:
	@echo "📦 安装前端依赖..."
	cd frontend && npm install

# ============================================
# 开发启动
# ============================================

dev:
	@echo "🚀 启动开发环境 (前后端并行)..."
	@cd backend && npm run start:dev & \
	cd frontend && npm run dev & \
	wait

dev-backend:
	@echo "🔧 启动后端开发服务器..."
	cd backend && npm run start:dev

dev-frontend:
	@echo "🎨 启动前端开发服务器..."
	cd frontend && npm run dev

# ============================================
# 测试
# ============================================

test-backend:
	@echo "🧪 运行后端测试..."
	cd backend && npm run test

test-cov: test-backend
	@echo "📊 生成测试覆盖率报告..."
	cd backend && npm run test:cov

test-cov-open: test-backend
	@echo "📊 生成测试覆盖率报告并打开..."
	cd backend && npm run test:cov:open

# ============================================
# Docker
# ============================================

docker-up:
	@echo "🐳 启动容器..."
	cd docker && docker-compose up -d --build --force-recreate
	@echo "✅ 容器已启动"
	@echo "📊 后端: http://localhost:3000"
	@echo "🎨 前端: http://localhost:80"

docker-down:
	@echo "🐳 停止容器..."
	cd docker && docker-compose down
	@echo "✅ 容器已停止"

docker-logs:
	cd docker && docker-compose logs -f

docker-restart:
	@echo "🐳 重启容器..."
	cd docker && docker-compose restart
	@echo "✅ 容器已重启"

docker-clean:
	@echo "🧹 清理 Docker 资源..."
	@read -p "确定要删除所有容器和卷吗? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		cd docker && docker-compose down -v; \
		rm -f .env; \
		echo "✅ 清理完成"; \
	else \
		echo "❌ 取消清理"; \
	fi
