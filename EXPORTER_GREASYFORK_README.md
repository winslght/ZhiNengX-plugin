# 📊 知能行考研数学 - 通用诊断报告与数据大屏导出器 (ZhiNengX Exporter)

![Version](https://img.shields.io/badge/Version-v11.0.1-brightgreen?style=for-the-badge)
![Author](https://img.shields.io/badge/Author-winslght-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey-purple?style=for-the-badge)
![Target](https://img.shields.io/badge/Target-%E6%95%B0%E5%AD%A6%E4%B8%80%20%7C%20%E6%95%B0%E5%AD%A6%E4%BA%8C%20%7C%20%E6%95%B0%E5%AD%A6%E4%B8%89-red?style=for-the-badge)

专为 **知能行考研数学 (`bestzixue.com` / `zhinengxing.com`)** 打造的全自动考纲适配、数据诊断报告与 ECharts 可视化大屏一键导出工具！

全自动识别 **数学一、数学二、数学三** 考纲，一键无损提取知能行底层全量做题数据，生成纯净 Markdown 诊断报告或全景 HTML 可视化数据大屏！

---

## 🌟 核心功能亮点 (Key Features)

### 1. 🎯 全自动考纲自适应 (数一 / 数二 / 数三)
- **智能识别**：无需手动配置，脚本通过接口自动精准读取您的考纲类型（`examType: 1/2/3`）。
- **考纲黑名单过滤**：
  - 🎓 **数学二考生**：全自动屏蔽曲线/曲面积分、级数、傅里叶级数、微积分在经济中的应用、概率论等非考纲章节，决不让无关章节干扰数据！
  - 🎓 **数学三考生**：全自动屏蔽曲线/曲面积分、傅里叶级数等非考纲章节。
  - 🎓 **数学一考生**：全量输出高数、线代、概率论全模块。

### 2. ⚡ 深层 API 拦截器 (Deep Data Interceptor)
- **零手动抓包**：内置 `XMLHttpRequest` 与 `fetch` 双重深层 API 拦截器。
- 打开知能行网页时，自动无缝捕获底层全量 `getUserProfileDiagramLast` 诊断 JSON 数据，后台静默完成，不影响正常刷题。

### 3. 📄 纯净 Markdown 诊断报告一键导出
一键导出符合专业数据分析规范的纯净 Markdown 格式报告，包含 5 大核心模块：
1. **考生档案与学习概况**：包含精确至分钟的生成时间戳、学员昵称、报考科目、目标分数、累计刷题时长、完成辅导次数及须优先消灭的“小黄点”突破口提示。
2. **核心章节熟练度五级分布**：展示各章节 Level 1 基础 ~ Level 5 通精的百分比与抗生锈熟练度。
3. **知识点三维能力拆解**：深度剖析【概念掌握 CONCEPTS】、【简单应用 APPLICATION】与【综合技巧 COMBO_SKILL】。
4. **重计算题硬核能力明细**：统计重计算题接触数、独立做对率与二次尝试修正次数。
5. **错题病因与小病变归因**：归因分析审题失误、计算错误、定理混淆等病因。

### 4. 📊 ECharts 交互式可视化全景数据大屏
- **HTML 独立导出**：除了文本报告，还支持一键导出打包好的 `.html` 可视化数据大屏！
- **丰富图表**：内置 ECharts.js，包含 3D 能力雷达图、五级熟练度柱状图、错题归因环形图、突破口分布散点图。
- **离线即开**：导出的 HTML 文件双击即可在任何浏览器中离线打开，直观大气，方便复盘或分享！

### 5. 🎨 完美原生 UI 无缝挂载
- 无缝嵌入知能行原生的顶部 Navigation Tabs 导航栏 (`modulePageTabs`)。
- 与原站“训练”、“进度”、“历史”保持 100% 原生视觉一致性，优雅自然。

---

## 📦 使用方法 (Usage)

1. 在浏览器安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 插件。
2. 安装本脚本后，打开知能行官网 (`app.bestzixue.com` 或 `zhinengxing.com`)。
3. 在页面顶部导航栏中，找到新增的 **`导出报告`** 选项卡按钮。
4. 点击按钮即可一键复制 Markdown 诊断报告或下载 ECharts 可视化 HTML 数据大屏！

---

## 🛠️ 项目开源与反馈

- **GitHub 仓库**：[winslght / ZhiNengX-plugin](https://github.com/winslght/ZhiNengX-plugin)
- **作者**：`winslght`
- **开源协议**：`MIT License`

*祝所有考研学子数学高分过关，顺利上岸！*
