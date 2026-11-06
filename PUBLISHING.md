# 发布说明

## GitHub 和 npm 分别是什么

- **GitHub** 放源代码、版本历史和问题反馈，适合用户查看、提 Issue 和参与开发。
- **npm** 是 JavaScript 包仓库，也是 Harness 插件管理实际下载安装包的地方。
- 两者不是二选一：源码放 GitHub，可安装的插件包发布到 npm。只上传 GitHub 不能自动出现在 npm，也不能仅凭 GitHub 仓库让 Harness 安装。

## 1. 生成公开包

在插件根目录执行：

```bash
npm run release:prepare -- 1.0.0-beta.4
```

生成结果位于 `release/dsh-inline-attachments/`，其包名为 `dsh-inline-attachments`。若该 npm 包名已被占用，使用自己的 npm 用户名作为 scope：

```bash
RELEASE_NAME=@YOUR_NPM_NAME/dsh-inline-attachments npm run release:prepare -- 1.0.0-beta.4
```

如果已经建好 GitHub 仓库，可同时写入仓库地址：

```bash
RELEASE_NAME=@YOUR_NPM_NAME/dsh-inline-attachments \
RELEASE_REPOSITORY=git+https://github.com/YOUR_GITHUB_NAME/dsh-inline-attachments.git \
npm run release:prepare -- 1.0.0-beta.4
```

`release/` 不会进入发布包，也不会改动当前 `@local/...` 本地开发安装。

## 2. 检查发布内容

```bash
cd release/dsh-inline-attachments
npm pack --dry-run
```

确认清单包含 `client.js`、`index.js`、`cordis.patch.yml`、`locale/*.json`、`icon.svg`、`README.md`、`CHANGELOG.md` 和 `LICENSE`，且不包含测试、脚本或 `.github`。

同时确认 npm 包名可用：

```bash
npm view dsh-inline-attachments version
```

如果返回 404，说明尚未被占用；如果返回版本号，请改用自己的 npm scope。

## 3. 上传 GitHub

先在 GitHub 创建一个空仓库 `dsh-inline-attachments`，不要勾选自动生成 README、License 或 `.gitignore`。进入**公开发布目录**初始化仓库：

```bash
cd release/dsh-inline-attachments
git init
git add .
git commit -m "release: dsh-inline-attachments 1.0.0-beta.4"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_NAME/dsh-inline-attachments.git
git push -u origin main
```

这样 GitHub 仓库中的包名、客户端 ID、测试和 npm 发布内容保持一致；工作区中的 `@local/...` 开发版本只用于本机安装。

GitHub Actions 的 `check` 工作流会在每次 push 和 PR 时运行语法检查、测试和打包检查。

## 4. 发布到 npm

需要先注册 npm 账号（免费）：

```bash
npm login
```

在公开包目录执行：

```bash
cd release/dsh-inline-attachments
npm publish --tag beta
```

发布后检查：

```bash
npm view dsh-inline-attachments@beta version
```

不要直接使用 `latest` 标签发布 Beta。等关键流程在多个 Harness 版本上验证后，再发布稳定版本：

```bash
npm publish
```

## 5. 在 Harness 安装

在 Harness 插件管理中安装 `dsh-inline-attachments@beta`；若界面只支持本地包，可安装 `npm pack` 生成并手动选择的 `.tgz`。安装后重载插件或重启 Harness。

## 发布前检查清单

- [ ] 连续粘贴多张图片，编号为 `image1.png`、`image2.png`，无延迟或重复编号。
- [ ] 删除前序附件后，剩余标签正确重新编号。
- [ ] 悬浮预览、大图查看和标签移除正常。
- [ ] 已发送消息图文位置正确。
- [ ] 复制历史消息后粘贴，附件独立且位置正确。
- [ ] 会话停止后可以重新编辑；运行中不显示编辑按钮。
- [ ] 中英文插件标题、描述和图标显示正常。
- [ ] `npm pack --dry-run` 清单无测试文件和临时文件。
- [ ] 在干净的 Harness Profile 中从 npm Beta 包安装并完成一次真实发送。

## 当前兼容性

开发与验证基线是 DeepSeek Harness `0.2.1-rc.5`。插件依赖输入框 Slot、Lexical 引用标签、附件 API 和 `agent/pre-step`；Harness 升级后必须重新验证。Beta 阶段建议在 README 和版本说明中保留这一限制。
