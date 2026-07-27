@echo off
title ZhiNengX - 本地分支可视化看板
echo ===================================================
echo 🚀 正在调取本地 .git 分析数据并启动 Web 看板...
echo 🛡️ 100%% 只读安全，绝不干涉/推送到远程仓库
echo ===================================================
python "%~dp0scripts\branch_visualizer.py" --open
pause
