# HedgeDoc v2 开发全流程

> 仓库 `maifeipin/hedgedoc`，主分支 `develop`。本文覆盖从本地开发到 vps1 上线的完整流程。
> 最后更新：2026-07-31

---

## 1. 环境与工具链

| 项 | 说明 |
| --- | --- |
| Node | 由 **fnm** 管理，使用 `v24.13.0`（系统 PATH 上没有全局 `node`/`yarn`） |
| Yarn | Yarn 4.12.0，经仓库内 pinned release 运行：`.yarn/releases/yarn-4.12.0.cjs` |
| 包管理 | yarn workspace（monorepo：backend / frontend / commons / database / 等） |

**统一执行入口**（在仓库根目录）：

```bash
# 格式化 / 检查格式
fnm exec --using=v24.13.0 -- node .yarn/releases/yarn-4.12.0.cjs format:fix
fnm exec --using=v24.13.0 -- node .yarn/releases/yarn-4.12.0.cjs format
# Lint
fnm exec --using=v24.13.0 -- node .yarn/releases/yarn-4.12.0.cjs lint
# 构建
fnm exec --using=v24.13.0 -- node .yarn/releases/yarn-4.12.0.cjs build
# 全量测试
fnm exec --using=v24.13.0 -- node .yarn/releases/yarn-4.12.0.cjs test
```

单跑某个 backend jest 用例（**不要**用 `../node_modules/.bin/jest`，那是 shell shim，Windows 下会 spawn 失败）：

```bash
cd backend
fnm exec --using=v24.13.0 -- node ../node_modules/jest/bin/jest.js src/tags/tags.service.spec.ts
```

> ⚠️ `media/backends/filesystem-backend.spec.ts` 有 5 个用例在 **Windows 本地必然失败**（路径分隔符 `/tmp` ↔ `\tmp`），Linux CI 上通过，不是回归。

---

## 2. 代码规范

- **Lint**：oxlint（backend 111 规则 / frontend 181 规则），`yarn lint`，必须 0 warning 0 error。
- **格式化**：oxfmt，`yarn format`（check）/ `yarn format:fix`（修复）。
- **提交规范**：Conventional Commits，带 scope。例：
  - `feat(frontend): localize explore mode labels to Chinese`
  - `test(backend): add unit tests for tags and folders services`
  - `fix(backend): fix SQL column name note_tags.noteId in TagsService`
- **License 头**：每个源文件须有 SPDX 头（`reuse.yml` CI 强制）。新增脚本也要带头。
- 提交尾随 `Co-Authored-By: Claude <noreply@anthropic.com>`。

---

## 3. 本地开发

### 3.1 启动服务

```bash
# 后端开发模式（热重载，端口 3000）
cd backend && fnm exec --using=v24.13.0 -- node ../.yarn/releases/yarn-4.12.0.cjs start:dev
# 前端开发（端口 3001）
cd frontend && fnm exec --using=v24.13.0 -- node ../.yarn/releases/yarn-4.12.0.cjs dev
# 数据库迁移（backend，knex）
cd backend && fnm exec --using=v24.13.0 -- node ../.yarn/releases/yarn-4.12.0.cjs knex migrate:latest
```

亦可一键启动：`start-dev.ps1`（本地调试脚本，不入 Git）。

### 3.2 本地路由架构（Caddy 本地反向代理）

为保证本地开发环境与 VPS1 生产环境的反向代理拓扑 100% 一致，且不污染 Next.js 前端源码，本地采用 **Caddy (`caddy.exe`)** 监听 `http://localhost:8080` 进行网络层统一反向代理：

```
浏览器 → http://localhost:8080 (Caddy 本地反向代理)
           │
           ├─ /realtime*  → http://localhost:3000 (Backend, NestJS)
           ├─ /api/*      → http://localhost:3000 (Backend, NestJS)
           ├─ /public/*   → http://localhost:3000 (Backend, NestJS)
           ├─ /media/*    → http://localhost:3000 (Backend, NestJS)
           └─ /*          → http://localhost:3001 (Frontend, Next.js)
```

**方案优势**：
1. **零代码侵入**：前端代码库保持 100% 干净，与 HedgeDoc 上游原生源码完全一致。无需修改 `next.config.js` rewrites 或使用 `proxyToBackend` 等杂项逻辑。
2. **环境 1:1 镜像**：本地 Caddy 的路由转发规则与 VPS1 宿主机的 Nginx 转发规则完全对齐，保证本地测试行为与线上部署行为完全一致。
3. **一键启动**：通过 `start-dev.ps1` 自动启动 `caddy.exe` 后台进程，浏览器直接访问 `http://localhost:8080` 即可调试全部功能。

### 3.3 本地反向代理配置文件 (`Caddyfile.local`)

根目录下的 `Caddyfile.local` 为本地 Caddy 配置文件（在 `.gitignore` 中排除，不上线）：

```caddy
http://localhost:8080 {
    reverse_proxy /realtime* http://localhost:3000
    reverse_proxy /api/* http://localhost:3000
    reverse_proxy /public/* http://localhost:3000
    reverse_proxy /media/* http://localhost:3000
    reverse_proxy /* http://localhost:3001
}
```

### 3.4 本地忽略与未跟踪文件清单

以下文件为本地调试辅助文件（已在 `.gitignore` 或 Git 工作区中隔离，不上线）：

| 文件 | 用途 | 状态 |
|------|------|------|
| `Caddyfile.local` | 本地 Caddy 反向代理规则配置 | 本地文件，.gitignore 排除 |
| `caddy.exe` | 本地 Caddy 可执行程序 (v2.11.4) | 本地文件，.gitignore 排除 |
| `start-dev.ps1` | 一键启动开发环境脚本（Caddy + Backend + Frontend） | 本地文件，未跟踪 |
| `backend/.env` | 后端环境变量（本地 DB 密码/端口） | 本地文件，.gitignore 排除 |
| `frontend/.env` | 前端环境变量 | 本地文件，.gitignore 排除 |

### 3.5 Mock API 模式

上游 HedgeDoc 的 `pages/api/*` 页面文件是为 **mock 模式**设计的——仅在 `NEXT_PUBLIC_USE_MOCK_API=true` 时返回假数据。本地开发时：

- **非 mock 模式**（默认推荐）：设置 `NEXT_PUBLIC_USE_MOCK_API=false`（或未指定）。通过 Caddy (8080 端口) 访问时，所有 `/api/*` 请求直接转发给后端 3000 端口，前端源码保持纯净。
- **mock 模式**：设置 `NEXT_PUBLIC_USE_MOCK_API=true`，前端使用 mock 数据，不连接后端。

### 3.6 图片上传（multipart）

通过 Caddy (8080 端口) 调试时，图片上传路径：浏览器 POST → Caddy:8080 → 后端 3000。Caddy 在网络层进行二进制流直通，无需任何前端 Next.js API 路由中间件或 `bodyParser` 拦截，完美支持大文件和图片流式上传。

---

## 4. 测试

- **单测**：jest，用 `knex-mock-client` mock 数据库（见 `backend/src/database/mock/`）。
  - 帮助函数：`mockSelect` / `mockInsert` / `mockUpdate` / `mockDelete` / `mockQuery`。
  - 样例：`backend/src/tags/tags.service.spec.ts`、`backend/src/folders/folders.service.spec.ts`。
  - 注意：knex 的 `insert({...}, ['*'])` 列在 SQL 里按**字母序**排列，mockInsert 的 `variables` 数组要按字母序传。
- **E2E**：`jest --config jest-e2e.json`，CI 仅跑 `backend-postgres`（SQLite/MariaDB 已移除）。

---

## 5. CI/CD（推送到 `develop` 自动触发）

| 工作流 | 作用 |
| --- | --- |
| `lint.yml` | oxlint + oxfmt + markdownlint |
| `test-and-build.yml` | 单测 + 构建 |
| `e2e-tests.yml` | backend-postgres E2E |
| `reuse.yml` | SPDX 合规检查 |
| `docker.yml` | 构建并推送 `ghcr.io/maifeipin/hedgedoc/{backend,frontend>:develop` |

监控：

```bash
gh run list --limit 5
gh run watch <run-id> --exit-status   # 0=成功，非 0=失败
gh run view <run-id> --log-failed      # 看失败日志
```

> 上线前要求：5 个工作流全部 success。

---

## 6. Docker 镜像

- 推送 `develop` -> `docker.yml` 构建并推送：
  - `ghcr.io/maifeipin/hedgedoc/backend:develop`
  - `ghcr.io/maifeipin/hedgedoc/frontend:develop`
- Dockerfile：`backend/docker/Dockerfile`、`frontend/docker/Dockerfile`。
- 镜像默认入口：backend `tini -- node dist/main.js`；frontend `tini -- node server.js`。

---

## 7. vps1 部署（V2，docker-compose 统一管理）

> vps1 用的是旧版 **`docker-compose` v1 (1.25.0)**（`docker compose` v2 插件未安装，命令带连字符 `docker-compose`）。

`/app/hedgedoc/docker-compose.yml` 统一管理三个服务（V1 的 1.9.9 `app` 服务与镜像已移除）：

| 服务/容器 | 端口 | 镜像 | 重启策略 |
| --- | --- | --- | --- |
| `database` → `hedgedoc_database_1` | 5432（内部） | `postgres:13-alpine` | `always` |
| `backend` → `hedgedoc_backend_1` | `127.0.0.1:3031->3000` | `ghcr.io/maifeipin/hedgedoc/backend:develop` | `unless-stopped` |
| `frontend` → `hedgedoc_frontend_1` | `127.0.0.1:3030->3001` | `ghcr.io/maifeipin/hedgedoc/frontend:develop` | `unless-stopped` |

- 网络：`hedgedoc_default`（compose 项目 `hedgedoc` 自建）。
- 服务间用 **service name** 寻址：backend `HD_DATABASE_HOST=database`，frontend `HD_INTERNAL_API_URL=http://backend:3000`。
- 数据卷：`hedgedoc_database`（named volume，挂在 `database:/var/lib/postgresql/data`）。
- DB/app 密钥（session secret、DB 口令）只以明文写在 compose 的 `environment`（root 可读），不入库。

### 宿主机 Nginx 反向代理配置（`md.maifeipin.com`）

HedgeDoc v2 实时编辑功能使用 Yjs 配合 WebSocket 协议，前端发起连接请求到 `/realtime`。宿主机 Nginx **必须**正确将 `/realtime` 转发至 backend（`127.0.0.1:3031`）并开启 WebSocket `Upgrade` 标头支持；后端 API 等路由转发至 `3031`；其余前端路由转发至 frontend（`127.0.0.1:3030`）。

> **关键区别**：vps1 上 nginx 在容器外层拦截所有 `/api`、`/media`、`/realtime`、`/public` 请求直接转发到 backend:3031，请求**不会到达 frontend 容器**。因此 `next.config.js` 中的 rewrites 在生产环境中是**无害死代码**——它只在请求到 frontend 容器时生效，而生产请求已被 nginx 提前拦截。

宿主机配置参考（`/etc/nginx/sites-available/md.maifeipin.com` 或 `/etc/nginx/conf.d/`）：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name md.maifeipin.com;

    # 1. 后端 API / 静态资源 / 上传 / 媒体图片 / API文档 -> 转发至 backend (3031)
    location ~ ^/(api|public|uploads|media|apidoc)/ {
        proxy_pass http://127.0.0.1:3031;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. 实时编辑 WebSocket 通信 -> 转发至 backend (3031) 并允许协议升级
    location /realtime {
        proxy_pass http://127.0.0.1:3031;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. 前端 Next.js -> 转发至 frontend (3030)
    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### ⚠️ 代理坑

`/root/.docker/config.json` 有全局 `proxies.default`，会向**每个**容器（及 `docker pull`）自动注入 `HTTP_PROXY/HTTPS_PROXY/...`。**不写 env 去不掉**。compose 里用空值覆盖：

```yaml
environment:
  - HTTP_PROXY=
  - HTTPS_PROXY=
  - http_proxy=
  - https_proxy=
  - NO_PROXY=
  - no_proxy=
```

### 部署步骤（CI 全绿后）

```bash
ssh vps1
cd /app/hedgedoc

# 1. 拉新镜像（compose pull 会按 compose 文件拉 backend/frontend/database）
docker-compose pull

# 2. 重建变化的容器（database 配置未变不会重建，数据安全）
docker-compose up -d

# 3. 验证
docker-compose ps
docker exec hedgedoc_backend_1 env | grep -i proxy        # 应全为空串
curl -s -o /dev/null -w '%{http_code}\n' -L https://md.maifeipin.com/   # 200
```

> `docker-compose up -d` 只重建镜像发生变化的容器。database 服务配置恒定不变 -> **不会被重建** -> 数据零风险。仅 backend/frontend 在镜像更新时重建（数秒中断）。
> 回滚：`/app/hedgedoc/docker-compose.v1.bak.yml` 是 V1 备份（迁移成功后可删）。

### 完整重建单个服务（如需）

```bash
cd /app/hedgedoc
docker-compose up -d --force-recreate --no-deps backend   # 只重建 backend，不动 database/frontend
```

---

## 8. 当前功能盘点（v2）

- **标签系统**：`POST /api/v2/tags`（建独立标签）、`DELETE /api/v2/tags/:id`、`POST /api/v2/tags/note/:noteId`。服务：`tags.service.ts`（createTag / deleteTag / setNoteTags / getAllTagsWithCount 预置 6 个中文标签）。
- **目录树**：`folders.service.ts`（多级 parentId 递归、删除校验[含子目录/含笔记则拒绝]、`moveNoteToFolder`）；`POST /api/v2/folders/move-note`、`POST /api/v2/folders`、`DELETE /api/v2/folders/:id`。
- **前端**：`components/tree/folder-tree.tsx`（多级展开、HTML5 拖拽移动笔记、删除）；`explore/layout.tsx`（侧边栏可拖拽调宽 180–550px + 折叠）。
- **国际化**：`frontend/locales/en.json` 为唯一 locale，中文优先，与 folder-tree / explore layout 的硬编码中文一致。
- **CI**：`e2e-tests.yml` 仅保留 `backend-postgres`，已移除 SQLite/MariaDB。

---

## 9. 维护备忘

- vps1 现为 **V2 docker-compose 单一管理**：`/app/hedgedoc/docker-compose.yml`（database + backend + frontend）。V1（`quay.io/hedgedoc:1.9.9` 镜像、`hedgedoc_app_v1_backup`、v1 `app` 容器、`hedgedoc_uploads` 卷）已全部清除。
- 重启策略：database `always`，backend/frontend `unless-stopped`（宿主机重启后自愈）。
- 一次性运维脚本用完即删，不入库（含口令且无 SPDX 头）。
- backend uploads 已挂持久命名卷 `hedgedoc_uploads` → `/usr/src/app/backend/uploads`（即 `HD_MEDIA_BACKEND_FILESYSTEM_UPLOAD_PATH`），重建 backend 容器**不会丢失**上传媒体。注：这是 V2 compose 新建的卷；上方 V1 迁移清除时提到的 `hedgedoc_uploads` 是迁移前删除的旧同名卷，两者不同实例。

---

## 10. 本地 vs 生产路由对比

同一套纯净代码（`develop` 分支）通过相同的反向代理拓扑（本地 Caddy 8080 / 生产 Nginx 443）实现本地开发和 VPS1 生产部署的 100% 行为一致：

| 维度 | 本地开发环境 (`http://localhost:8080`) | VPS1 生产环境 (`https://md.maifeipin.com`) |
|---|---|---|
| **入口端口** | Caddy 反向代理 `:8080` | 宿主机 Nginx 443 (HTTPS) |
| **前端端口** | `localhost:3001` (Next.js dev) | `frontend` 容器 `:3001` (Docker 映射 `:3030`) |
| **后端端口** | `localhost:3000` (NestJS dev) | `backend` 容器 `:3000` (Docker 映射 `:3031`) |
| **反向代理工具** | 本地 `caddy.exe` (读取 `Caddyfile.local`) | 宿主机 Nginx (读取 `md.maifeipin.com.conf`) |
| **路由转发规则** | `/api/*`, `/media/*`, `/realtime*`, `/public/*` → `:3000`<br>`/*` → `:3001` | `/api/*`, `/media/*`, `/realtime*`, `/public/*` → `:3031`<br>`/*` → `:3030` |
| **源码侵入度** | **0**（无任何 `proxyToBackend` 或 `rewrites` 脏代码） | **0**（完全原生） |
| **分支策略** | 保持与上游 `develop` 分支 100% 一致 | 保持与上游 `develop` 分支 100% 一致 |

```
本地 8080 (Caddy 拓扑):                 VPS1 443 (Nginx 拓扑):
┌── Caddy :8080 ────────────────┐      ┌── Nginx :443 ─────────────────┐
│  /api, /media, /realtime,     │      │  /api, /media, /realtime,     │
│  /public → backend:3000       │      │  /public → backend:3031       │
│  /*       → frontend:3001     │      │  /*       → frontend:3030     │
└───────────────────────────────┘      └───────────────────────────────┘
```

> **核心原则**：不分支、零侵入。本地与 VPS1 采用 100% 相同网络拓扑。差异仅存在于反向代理层（Caddy vs Nginx）和环境配置（`.env` vs `docker-compose`）。

