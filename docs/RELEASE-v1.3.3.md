# v1.3.3 — 对齐 DSH 0.2.2-rc.5

- **Tag**：`v1.3.3`（annotated，指向本次发布提交；上一版 `v1.3.2`）
- **对齐版本**：DeepSeek Harness 0.2.2-rc.5（`engines.dsh: ">=0.2.2-rc.5"`）
- **范围**：只做版本对齐（manifest / `SERVICE_VERSION` / 面板 `VERSION` / README / CHANGELOG），工具、路由、数据目录结构、项目记录字段不变。
- **版本一致性**：`package.json` 的 `version`、`lib/service.js` 的 `SERVICE_VERSION`、`src/client/00-head.js` 与构建产物 `client.js` 的 `VERSION` 同步为 `1.3.3`。
- **验证**：`npm run check`（8 段构建一致）、`npm test` 271/271、真实浏览器集成 10/10、`node scripts/verify-release.mjs --tag v1.3.3` 13/13。

## 升级

替换插件目录或重新安装 bundle，然后刷新页面；Host 半部分需要重新加载 bundle/重启 GUI 才会生效。无需迁移项目数据。
