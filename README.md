# MUSIC CUP

**每一首都喜欢。但冠军，只有一首。**

黑紫霓虹风格的歌手歌曲淘汰赛。React 18 + Vite，手机与电脑自适应；无需 API Key、无需账号即可建立个人赛事。

## 功能

- 搜索音乐人并选择准确歌手 ID；iTunes 真实歌曲、专辑封面和商店链接。
- 歌手歌曲查询 + 最多 200 张专辑分批补全；地区可选，默认香港；仅保留专辑原版；过滤现场、演唱会、混音、伴奏、重制等版本。重复发行优先普通专辑，其次原始单曲和豪华版中的未修改曲目。
- 单列选歌、搜索过滤、全选、清空、随机选歌；16 / 32 / 64 首随机抽签。
- 完整分叉淘汰树，可拖动、缩放和点击晋级；支持撤销，修改早期胜者会清空受影响的后续结果。
- 自动本地保存，JSON 赛事备份/导入，冠军展示、原创 PNG 海报、冠军分享链接。

## 本地运行

Node.js 22 或更新版本。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。开发服务器只用于本机；公开托管后，手机和其他网络的朋友可直接访问。

```sh
npm test
npm run build
npm run preview
```

## 部署

本项目是纯静态应用，构建目录 `dist`。可部署到 Sites、Vercel、Netlify 或 Cloudflare Pages。Vercel 导入 GitHub 仓库后选择 Vite，构建命令 `npm run build`，输出 `dist`；无需环境变量。

`.openai/hosting.json` 是当前 Sites 的部署标识，fork 后部署自己的 Sites 应移除此标识并重新注册。普通静态托管不使用它。

## 数据与边界

[Apple iTunes Search API](https://performance-partners.apple.com/search-api) 提供公开音乐元数据。JSONP 解决浏览器跨域，无私钥、无服务端代理。网络错误、地区版权、限流或最多 200 张专辑的接口上限可能使曲库不完整。页面显示已获取的真实数量、补全进度与失败提示；可以停止补全并使用已有歌曲。不同语言的曲名可能被视为不同条目；版本过滤依据曲名与专辑标签，未标注的特殊版本仍可能漏过。旧赛事保留原有进度，返回歌库重新抽签后应用原版规则。

专辑图片属于原权利人，链接回对应商店。本站不下载或缓存音频、不提供全曲播放。PNG 导出只包含原创视觉和冠军文字，不复制专辑图。分享链接仅包含冠军歌名、歌手和赛事规模，不传送完整赛事；跨设备恢复请导入 JSON。

进度仅保存在当前浏览器的 localStorage，无用户数据库。清理浏览器数据、无痕模式或存储不可用会影响恢复；请导出备份。外部字体来自 Google Fonts，无法访问时自动使用系统字体。

## 结构与验证

- `src/domain.js`：抽签、去重、晋级、不合法状态校验。
- `src/catalog.js`：iTunes 查询、取消、超时、缓存、专辑扩展。
- `src/App.jsx`：选歌和赛事状态、保存恢复、导入导出。
- `src/components.jsx`：可缩放赛树与冠军展示。
- `tests/`：覆盖 16/32/64 赛树、非法晋级、祖先清空、去重、损坏存档等。

## 开源许可

应用代码使用 MIT。赛树复用 [@oliverlooney/react-brackets](https://github.com/Oliver-Looney/react-brackets)（MIT，源于 mohux/react-brackets），画布复用 react-zoom-pan-pinch（MIT）。详细说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

为兼容 React 18，使用 swipeable-views React 18 fork；通过 package overrides 升级旧传递依赖 `@babel/runtime`，修复缺失 helper 和已知漏洞。

