@echo off
chcp 65001 >nul
title MediaCrawler Web 管理平台

echo.
echo ==========================================
echo 🕷️  MediaCrawler Web 管理平台
echo ==========================================
echo.
echo 正在启动，请稍候...
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Python，请先安装 Python 3.8 或更高版本
    echo 下载地址: https://www.python.org/downloads/
    echo 安装时请勾选 "Add Python to PATH"
    pause
    exit /b 1
)

REM 运行一键启动脚本
python "一键启动.py"

echo.
echo 程序已结束，按任意键退出...
pause >nul