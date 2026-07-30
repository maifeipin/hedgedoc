# HedgeDoc v2 开发全流程

> 仓库 `maifeipin/hedgedoc`，主分支 `develop`。本文覆盖从本地开发到 vps1 上线的完整流程。
> 最后更新：2026-07-29

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

```bash
# 后端开发模式（热重载）
cd backend && fnm exec --using=v24.13.0 -- node ../.yarn/releases/yarn-4.12.0.cjs start:dev
# 前端开发
cd frontend && fnm exec --using=v24.13.0 -- node ../.yarn/releases/yarn-4.12.0.cjs dev
# 数据库迁移（backend，knex）
cd backend && fnm exec --using=v24.13.0 -- node ../.yarn/releases/yarn-4.12.0.cjs knex migrate:latest
```

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

宿主机配置参考（`/etc/nginx/sites-available/md.maifeipin.com` 或 `/etc/nginx/conf.d/`）：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name md.maifeipin.com;

    # 1. 后端 API / 静态资源 / 上传 / API文档 -> 转发至 backend (3031)
    location ~ ^/(api|public|uploads|apidoc)/ {
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
- 前端 uploads 当前**未挂持久卷**（重建容器会丢失上传媒体）；如需持久化，给 backend 加一个 uploads named volume 挂到 `/hedgedoc/public/uploads`。
