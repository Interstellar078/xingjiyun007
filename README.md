<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Custom Travel Builder

前后端分离版本：前端保留 Vite + React + TypeScript，后端为 FastAPI + Postgres。

## Frontend (Vite + React)

**Prerequisites:** Node.js 18+

1. 进入前端目录：`cd frontend`
2. 安装依赖：`npm install`
3. 配置 API 地址：`VITE_API_BASE_URL=http://localhost:8000`
4. 启动前端：`npm run dev`

## Backend (FastAPI + Postgres)

**Prerequisites:** Python 3.11+，Postgres 14+

1. 进入后端目录：`cd backend`
2. 创建并激活虚拟环境：\n`python -m venv .venv && source .venv/bin/activate`
3. 安装依赖：`pip install -e .`
4. 配置环境变量（示例见 `backend/.env.example`）：\n`DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/travel_builder`\n`JWT_SECRET=change-me`\n`GEMINI_API_KEY=...` (可选)\n5. 启动后端：`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Notes

- 后端启动会自动创建表并初始化管理员账号（默认 admin/liuwen，可通过环境变量覆盖）。\n- AI 行程生成与酒店推荐通过后端调用 Gemini（需配置 `GEMINI_API_KEY`）。
