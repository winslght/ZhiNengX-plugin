#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZhiNengX Git Flow 命令行辅助脚本
用于快速启动和完成 feature / release / hotfix 分支流转，自动防止漏打 Tag 或漏合 develop。
"""

import sys
import subprocess
import argparse

def run_cmd(cmd, check=True):
    print(f"➜ 执行命令: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    if res.returncode != 0 and check:
        print(f"❌ 命令执行失败:\n{res.stderr}")
        sys.exit(res.returncode)
    return res.stdout.strip()

def feature_start(name):
    branch_name = f"feat/{name}" if not name.startswith("feat/") else name
    print(f"🌿 启动 Feature 开发分支: {branch_name}")
    run_cmd(["git", "checkout", "develop"])
    run_cmd(["git", "checkout", "-b", branch_name])
    print(f"✅ 已成功基于 develop 拉出并切换到分支 [{branch_name}]")

def feature_finish(name):
    branch_name = f"feat/{name}" if not name.startswith("feat/") else name
    print(f"🏁 结束 Feature 开发分支: {branch_name}")
    run_cmd(["git", "checkout", "develop"])
    run_cmd(["git", "merge", "--no-ff", branch_name, "-m", f"Merge feature '{branch_name}' into develop"])
    run_cmd(["git", "branch", "-d", branch_name])
    print(f"🎉 特性 [{branch_name}] 已成功合并入 develop 并销毁！")

def release_start(version):
    if not version.startswith("v"):
        version = f"v{version}"
    branch_name = f"release/{version}"
    print(f"📦 启动 Release 预发布封版分支: {branch_name}")
    run_cmd(["git", "checkout", "develop"])
    run_cmd(["git", "checkout", "-b", branch_name])
    print(f"✅ 已拉出预发布分支 [{branch_name}]！")
    print(f"💡 提示：请在该分支修改油猴 Header 中的 @version 为 {version[1:]} 并更新 CHANGELOG.md，然后提交！")

def release_finish(version):
    if not version.startswith("v"):
        version = f"v{version}"
    branch_name = f"release/{version}"
    print(f"🚀 结束 Release 预发布封版: {branch_name}")
    
    # 1. 合并入 main 并打 Tag
    run_cmd(["git", "checkout", "main"])
    run_cmd(["git", "merge", "--no-ff", branch_name, "-m", f"Release {version}"])
    run_cmd(["git", "tag", "-a", version, "-m", f"release: {version}"])
    
    # 2. 同步合回 develop
    run_cmd(["git", "checkout", "develop"])
    run_cmd(["git", "merge", "--no-ff", branch_name, "-m", f"Merge release '{version}' into develop"])
    
    # 3. 删除 release 分支
    run_cmd(["git", "branch", "-d", branch_name])
    print(f"🎉 版本 [{version}] 已成功发布！更新已并入 main (已打 Tag {version}) 与 develop，预发布分支已销毁。")

def hotfix_start(version):
    if not version.startswith("v"):
        version = f"v{version}"
    branch_name = f"hotfix/{version}"
    print(f"🚑 启动 Hotfix 紧急修复分支: {branch_name}")
    run_cmd(["git", "checkout", "main"])
    run_cmd(["git", "checkout", "-b", branch_name])
    print(f"✅ 已基于 main 生产分支拉出急救分支 [{branch_name}]！")
    print(f"💡 提示：请修复 BUG，自增 Patch 版本号并更新 CHANGELOG.md 提交。")

def hotfix_finish(version):
    if not version.startswith("v"):
        version = f"v{version}"
    branch_name = f"hotfix/{version}"
    print(f"🏁 结束 Hotfix 紧急修复: {branch_name}")
    
    # 1. 合并入 main 并打 Tag
    run_cmd(["git", "checkout", "main"])
    run_cmd(["git", "merge", "--no-ff", branch_name, "-m", f"Hotfix {version}"])
    run_cmd(["git", "tag", "-a", version, "-m", f"hotfix: {version}"])
    
    # 2. 同步合回 develop
    run_cmd(["git", "checkout", "develop"])
    run_cmd(["git", "merge", "--no-ff", branch_name, "-m", f"Merge hotfix '{version}' into develop"])
    
    # 3. 删除 hotfix 分支
    run_cmd(["git", "branch", "-d", branch_name])
    print(f"🎉 紧急修复 [{version}] 已成功并入 main (已打补丁 Tag {version}) 与 develop，急救分支已销毁。")

def main():
    parser = argparse.ArgumentParser(description="ZhiNengX Git Flow 命令行辅助工具")
    subparsers = parser.add_subparsers(dest="type", help="操作类型 (feature / release / hotfix)")

    # feature
    f_parser = subparsers.add_parser("feature", help="Feature 特性分支管理")
    f_parser.add_argument("action", choices=["start", "finish"], help="动作 (start / finish)")
    f_parser.add_argument("name", help="特性名称 (如 keyboard-shortcuts)")

    # release
    r_parser = subparsers.add_parser("release", help="Release 预发布封版管理")
    r_parser.add_argument("action", choices=["start", "finish"], help="动作 (start / finish)")
    r_parser.add_argument("version", help="版本号 (如 8.2.0 或 v8.2.0)")

    # hotfix / fix
    h_parser = subparsers.add_parser("hotfix", aliases=["fix"], help="Hotfix / Fix 缺陷修复管理")
    h_parser.add_argument("action", choices=["start", "finish"], help="动作 (start / finish)")
    h_parser.add_argument("version", help="补丁版本号或修复名称 (如 8.1.1 或 fix-overlay)")

    args = parser.parse_args()

    if args.type == "feature":
        if args.action == "start":
            feature_start(args.name)
        elif args.action == "finish":
            feature_finish(args.name)
    elif args.type == "release":
        if args.action == "start":
            release_start(args.version)
        elif args.action == "finish":
            release_finish(args.version)
    elif args.type == "hotfix":
        if args.action == "start":
            hotfix_start(args.version)
        elif args.action == "finish":
            hotfix_finish(args.version)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
