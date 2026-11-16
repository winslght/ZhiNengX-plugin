# 📊 知能行考研数学 - 通用诊断报告与数据大屏导出器 (ZhiNengX Exporter)

![Author](https://img.shields.io/badge/Author-winslght-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=flat-square)
![Target](https://img.shields.io/badge/Target-%E6%95%B0%E5%AD%A6%E4%B8%80%20%7C%20%E6%95%B0%E5%AD%A6%E4%BA%8C%20%7C%20%E6%95%B0%E5%AD%A6%E4%B8%89-red?style=flat-square)

> **定位**：把知能行后台的全量做题数据无损取出来，转成可读的 Markdown 诊断报告与可分享的 ECharts 可视化大屏。

---

## 📦 安装

| 渠道 | 说明 | 安装链接 |
| :--- | :--- | :--- |
| **稳定版** (`main`) | 只含已验收的改动 | [安装稳定版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/main/zhinengx-exporter/zhinengx_exporter.user.js) |
| **公测版** (`beta`) | 提前体验新功能，可能含未实机回归的改动 | [安装公测版](https://raw.githubusercontent.com/winslght/ZhiNengX-plugin/beta/zhinengx-exporter/zhinengx_exporter.user.js) |

1. 先安装 [Tampermonkey](https://www.tampermonkey.net/)（Violentmonkey 亦可）。
2. 点击上表链接完成安装。
3. 打开知能行官网（`app.bestzixue.com` 或 `zhinengxing.com`），顶部导航栏会出现 **`导出报告`** 入口。

> 版本号以脚本头部 `@version` 与 [CHANGELOG](../CHANGELOG.md) 顶部条目为准。两个渠道**请只启用其一**。

---

## ✨ 功能特性

### 🎯 全自动考纲自适应（数一 / 数二 / 数三）
- 无需手动配置，脚本自动读取账号的考纲类型。
- 按考纲过滤非考试章节：数二/数三自动排除曲线曲面积分、傅里叶级数等，数一全量输出高数、线代、概率。

### ⚡ 深层 API 拦截
- 内置 `XMLHttpRequest` 与 `fetch` 双重拦截器，打开页面即静默捕获全量诊断 JSON。
- 零手动抓包，不影响正常刷题流程。

### 📄 纯净 Markdown 诊断报告
一键导出包含 5 个模块的报告：
1. **考生档案与学习概况** —— 生成时间、昵称、科目、目标分数、累计时长、辅导次数与需优先突破的章节。
2. **核心章节熟练度五级分布** —— Level 1 基础 ~ Level 5 通精的占比与抗遗忘熟练度。
3. **知识点三维能力拆解** —— 概念掌握 / 简单应用 / 综合技巧。
4. **重计算题能力明细** —— 接触数、独立做对率与二次修正次数。
5. **错题病因归因** —— 审题失误、计算错误、定理混淆等分类统计。

### 📊 ECharts 可视化数据大屏
- 导出为自包含 `.html`，双击即可在任何浏览器离线打开。
- 含能力雷达图、熟练度柱状图、错因环形图、突破口分布等图表，便于复盘与分享。

### 🎨 原生 UI 无缝挂载
- 嵌入平台原生导航栏，与「训练」「进度」「历史」保持一致的视觉风格。

---

## 🧩 与其它模块的关系

与 [Beautifier](../zhinengx-beautifier/README.md) 相互独立，可单独安装，也可同时启用。

---

## 📚 相关文档

- [项目说明](../README.md) · [文档索引](../docs/README.md) · [更新日志](../CHANGELOG.md)
- [缺陷矩阵与 Roadmap](../docs/ROADMAP_AND_ISSUES.md) — 已知问题与规避方案
- [报告样例](../docs/diagnostic_report_sample.md) — Markdown 诊断报告输出范式
- [本地调试 SOP](../docs/DEVELOPMENT_WORKFLOW.md) — 免 Push 秒级调试

---

## 🛠️ 开源与反馈

- **仓库**：[winslght / ZhiNengX-plugin](https://github.com/winslght/ZhiNengX-plugin)
- **作者**：`winslght`
- **协议**：[MIT License](../LICENSE)

*祝所有考研学子数学高分过关，顺利上岸！*
