# 部署指南 (Deployment Guide)

本项目已配置为使用 Docker 和 Docker Compose 进行一键部署。

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

# AI API Key (Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (如果有用到)
# OPENAI_API_KEY=sk-...

# 数据库路径 (默认映射到本地 backend/db 目录，无需修改)
DATABASE_URL=sqlite:///./db/app.db
```

## 4. 启动服务

在项目根目录下（`docker-compose.yml` 所在目录）运行：

```bash
docker-compose up -d --build
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
docker-compose up -d --build  # 重新构建并重启
```

## 7. 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 查看后端日志
docker-compose logs -f backend
```
