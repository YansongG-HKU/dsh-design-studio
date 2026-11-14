# v1.3.2 — 对齐 DSH 0.2.2-rc.3

- **Tag**：`v1.3.2`（annotated，指向本次发布提交；上一版 `v1.3.1`）
- **对齐版本**：DeepSeek Harness 0.2.2-rc.3（`engines.dsh: ">=0.2.2-rc.3"`）
- **范围**：只做版本对齐（manifest / 面板版本号 / README），工具、路由、数据目录结构不变；`SERVICE_VERSION` 与 `client VERSION` 同步为 `1.3.2`。

## 验证

- `npm run check`：client bundle 新鲜（8 fragments, 468184 bytes）。
- `npm test`：271/271 通过。
- `npm run test:integration`：10/10（真实 Chrome）。
- `node scripts/verify-release.mjs --tag v1.3.2`：13/13（release gate 全绿）。
- GitHub Actions：`CI` 与 `Release` 在 tag 上绿。

## 升级

无需改动业务代码；更新插件版本后重启 DSH 桌面端或刷新 Web GUI 即可。
