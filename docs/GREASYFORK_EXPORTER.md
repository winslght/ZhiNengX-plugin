## 📊 知能行诊断报告导出器

自动识别数学一、数学二和数学三的考纲，把知能行的学习记录整理成 Markdown 报告，并在学习页面显示 ECharts 图表。

## 安装与使用

1. 安装 Tampermonkey 或 Violentmonkey，点击本页的「安装此脚本」。
2. 登录[知能行学习页](https://app.bestzixue.com/)并刷新，在顶部导航查看「导出报告」和「数据图表」。
3. 选择所需功能。若提示未取得学习数据，确认当前账号已登录后刷新。若提示 ECharts 正在加载，稍候再打开图表。

### 导出报告

点击「导出报告」，等提示「复制成功」后，把 Markdown 粘贴到笔记或文本编辑器保存。如果浏览器拦截自动复制，可按提示手动复制。

报告覆盖学习概况、章节熟练度、概念／简单应用／综合技巧、重计算题表现和错因统计。 [报告样例](https://github.com/winslght/ZhiNengX-plugin/blob/main/docs/diagnostic_report_sample.md)

### 查看数据图表

点击「数据图表」打开当前网页内的数据大屏。可以查看章节熟练度矩阵、知识点三维能力雷达，以及近期每日测验正确率和题量。看完后点击「关闭大屏」返回训练。

## 开源与反馈

导出器与[知能行美化助手](https://greasyfork.org/zh-CN/scripts/588494)可独立安装，也可一起使用。

[GitHub 项目与完整使用指南](https://github.com/winslght/ZhiNengX-plugin) · [更新日志](https://github.com/winslght/ZhiNengX-plugin/blob/main/CHANGELOG.md) · [问题反馈](https://github.com/winslght/ZhiNengX-plugin/issues)

本项目按 MIT 许可开源。感谢 Apache ECharts 和提供实测反馈的用户。
