# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个混合技术栈项目，使用 Python FastAPI 作为后端，Next.js (TypeScript) 作为前端。

## 技术栈

### 后端 (backend/)
- **框架**: FastAPI
- **包管理**: uv (使用 `uv pip` 管理依赖)
- **Python 版本**: 3.11.13 (通过 uv 管理)
- **虚拟环境**: chrono-venv
- **主要依赖**: fastapi, uvicorn[standard]

### 前端 (frontend/)
- **框架**: Next.js 15.5.5 (App Router)
- **包管理**: npm
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **构建工具**: Turbopack
- **React 版本**: 19.1.0

## 开发命令

### 虚拟环境设置
```bash
# 创建虚拟环境 (首次设置)
cd backend
uv venv chrono-venv --python 3.11.13

# 激活虚拟环境
source chrono-venv/bin/activate

# 安装依赖
uv pip install fastapi "uvicorn[standard]"
```

### 后端开发
```bash
cd backend
source chrono-venv/bin/activate
uvicorn main:app --reload --port 8000
```
- 启动开发服务器在 http://localhost:8000
- `--reload` 启用热重载
- 必须先激活虚拟环境

### 前端开发
```bash
cd frontend
npm run dev
```
- 启动开发服务器在 http://localhost:3000
- 使用 Turbopack 进行快速构建

### 构建命令
```bash
# 后端无需构建，直接运行
cd backend
source chrono-venv/bin/activate
uvicorn main:app

# 前端构建
cd frontend
npm run build
npm start
```

### 依赖管理
```bash
# 后端 - 添加新依赖
cd backend
source chrono-venv/bin/activate
uv pip install package-name

# 前端 - 添加新依赖
cd frontend
npm install package-name
```

## 项目架构

### 后端架构
- `backend/main.py`: FastAPI 应用入口，包含 CORS 配置
- API 端点:
  - `GET /`: 根路由
  - `GET /api/health`: 健康检查端点
- CORS 配置允许 http://localhost:3000 访问

### 前端架构
- Next.js App Router 结构
- `frontend/app/`: 应用路由目录
- 使用 TypeScript 进行类型安全
- Tailwind CSS 配置在 `tailwind.config.js`
- 支持路径别名 `@/*`

## 开发注意事项

### 后端
- **虚拟环境管理**: 使用 uv 创建和管理虚拟环境
  - 虚拟环境名称: `chrono-venv`
  - Python 版本: 3.11.13 (由 uv 自动下载和管理)
  - 激活命令: `source chrono-venv/bin/activate`
- **依赖管理**: 使用 `uv pip` 而不是标准 `pip`
  - 安装包: `uv pip install package-name`
  - 不使用 `uv add` (这是 uv init 项目的方式)
- **混合策略**: 用 uv 创建环境和管理包，不依赖 pyproject.toml 的 dependencies 字段
- FastAPI 自动生成 API 文档在 http://localhost:8000/docs

### 前端
- 使用 Turbopack 进行开发和构建以获得更快的性能
- ESLint 配置用于代码质量检查
- 使用 `npm` 而非 `yarn` 或 `pnpm`

### 端口配置
- 后端: 8000
- 前端: 3000

## 测试
目前项目尚未配置测试框架。添加测试时应考虑:
- 后端: pytest
- 前端: Jest + React Testing Library
