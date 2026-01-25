# 部署指南 (Deployment Guide)

本项目已配置为使用 Docker 和 Docker Compose 进行一键部署（包含 PostgreSQL 数据库）。

## 1. 准备工作

您需要一台安装了 **Docker** 和 **Docker Compose** 的服务器（Linux/Mac/Windows 均可）。

### 安装 Docker (Ubuntu 示例)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录以生效
```

## 2. 上传代码

将整个项目文件夹上传到您的服务器。您可以使用 `git` 或 `scp` / FTP。

```bash
# 示例：使用 git
git clone <您的仓库地址> xingjiyun007
cd xingjiyun007
```

## 3. 配置环境

在项目根目录下创建一个 `.env` 文件，配置必要的环境变量。

```bash
touch .env
nano .env
```

**`.env` 内容示例：**

```ini
# 后端密钥 (请修改为随机字符串)
JWT_SECRET=prod_secret_key_change_me_123456

# AI API Key (Gemini/OpenAI 任选)
GEMINI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=your_openai_key_here
# LLM_PROVIDER=gemini

# 前端 API 地址 (打包时使用)
VITE_API_BASE_URL=http://<您的服务器IP>:8000

# 数据库配置 (PostgreSQL)
# 使用内置 Postgres（默认）：
POSTGRES_DB=travel_builder
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/travel_builder

# 或者使用外部数据库（RDS/CloudSQL）：
# DATABASE_URL=postgresql+psycopg://user:pass@xxxx.region.rds.amazonaws.com:5432/db
```

## 4. 启动服务

在项目根目录下（`docker-compose.yml` 所在目录）运行：

```bash
docker compose up -d --build
```

- `-d`: 后台运行
- `--build`: 强制构建镜像（确保代码更新后生效）

## 5. 验证

启动完成后，访问您的服务器 IP 或域名：

- **Frontend**: `http://<您的服务器IP>`
- **Backend API**: `http://<您的服务器IP>/api/docs` (Swagger UI)

## 6. 更新部署

如果您修改了代码，只需重新执行步骤 4：

```bash
git pull  # 拉取最新代码
docker compose up -d --build  # 重新构建并重启
```

## 7. 数据备份

PostgreSQL 的数据存储在 Docker Volume `postgres_data` 中。即使删除容器，数据也会保留。
如需备份，可以使用 `pg_dump` 命令导出数据。

## 8. 查看日志

```bash
# 查看所有日志
docker compose logs -f

# 查看后端日志
docker compose logs -f backend
```

---

# 生产部署（推荐）

使用 `docker-compose.prod.yml` 将前后端统一到同一域名（`/` 前端、`/api` 后端）。

## 1) 生产环境变量示例
```ini
JWT_SECRET=prod_secret_key_change_me_123456
VITE_API_BASE_URL=/api
CORS_ORIGINS=https://your-domain.com

POSTGRES_DB=travel_builder
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/travel_builder

LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

## 2) 启动生产服务
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 3) 访问验证
- 前端：`http://<你的域名>/`
- 后端：`http://<你的域名>/api/docs`

## 4) HTTPS（建议）
建议在生产环境加 HTTPS（可用 Nginx/Traefik + Let’s Encrypt）。如果需要，我可以提供完整 TLS 配置。
