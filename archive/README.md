# 🗃️ 历史版本归档索引 (Archive Index)

> **定位**：已发布版本的历史快照目录 —— 只用于追溯与回滚比对，**不参与任何安装链接**。

本目录保存**已发布版本的历史快照**，仅用于追溯与回滚比对，**不参与任何安装链接**。

---

## 📐 归档约定

- 文件名格式：`<plugin>_v<MAJOR.MINOR.PATCH>[.suffix].user.js`，版本号以文件 `@version` 为准。
- 归档时机：版本封版（`release/*` 或 `hotfix/*` 分支合并前）从该分支复制快照入库。
- 归档文件**只增不改**：确认入库后不得再修改其内容。

---

## 🎨 Beautifier 版本索引

| 版本区间 | 文件 |
| :--- | :--- |
| v4.1 ~ v4.9 | `beautifier/zhinengx_beautifier_v4.1.user.js` ~ `v4.9.user.js`（v4.1、v4.2、v4.3、v4.4、v4.5、v4.6、v4.7、v4.8、v4.9） |
| v5.0 ~ v5.5 | `beautifier/zhinengx_beautifier_v5.0.user.js` ~ `v5.5.user.js` |
| v6.0 ~ v6.5 | `beautifier/zhinengx_beautifier_v6.0.user.js` ~ `v6.5.user.js` |
| v7.0 ~ v7.4.1 | `beautifier/zhinengx_beautifier_v7.0.user.js`、`v7.1`、`v7.2`、`v7.3.1`、`v7.3.2`、`v7.3.3`、`v7.4.0`、`v7.4.1` |
| v8.0.0 ~ v8.4.1 | `beautifier/zhinengx_beautifier_v8.0.0.user.js`、`v8.0.1`、`v8.0.2`、`v8.1.0`、`v8.2.0`、`v8.2.1`、`v8.3.0`、`v8.3.1`、`v8.3.2`、`v8.3.3`、`v8.4.0`、`v8.4.1` |

> 更早的 v1.0 ~ v4.0 以及各分支中间的 dev / beta 版本，只存在于 Git 历史与 [`VERSION_HISTORY_AND_RATINGS.md`](../docs/VERSION_HISTORY_AND_RATINGS.md) 中；本目录只保存**正式封版**快照。

## 📊 Exporter 版本索引

| 版本 | 文件 |
| :--- | :--- |
| v11.0 | `exporter/zhinengx_exporter_v11.0.user.js` |

> Exporter v1.0 ~ v10.x 未做逐版归档，仅存在于 Git 历史中。

## 🧩 第三方原型归档

| 文件 | 说明 |
| :--- | :--- |
| `legacy/zhinengx_question_extract_v0.1.0.user.js` | 外部作者「玄鸟墨色」以 MIT 许可发布的「知能行题目解析提取」独立脚本原型（原仓库根目录 `知能行题目解析提取.js`）。其能力已整合进 Beautifier 的「复制题目和解析」功能。**保留此文件仅用于版权归属与算法溯源，请勿安装**，避免与整合版同时出现两个入口。 |

---

## 🔁 2026-11-16 归档去重记录

整理时按 MD5 校验发现并删除了以下**内容完全一致的重复副本**，内容本身无损：

| 已删除文件 | 原因 | 保留者 |
| :--- | :--- | :--- |
| `beautifier/zhinengx_beautifier_v7.3.user.js` | 与 `v7.4.1` 内容逐字节一致 | `zhinengx_beautifier_v7.4.1.user.js` |
| `beautifier/developer_panel/zhinengx_beautifier_dev_panel.user.js` | 与 `v7.4.1` 内容逐字节一致 | 同上；开发者面板发行版见 `archive-dev-panel` 分支 |
| `beautifier/zhinengx_beautifier_v8.5.0.user.js` | 实为 `v8.0.0` 的副本（文件名与内容不符） | `zhinengx_beautifier_v8.0.0.user.js` |

> ⚠️ 注意：`v8.5.0` **没有任何可信归档**。若后续需要追溯该版本，请从对应分支或 Git 历史中获取，不要沿用旧文件名。
