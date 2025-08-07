#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MediaCrawler Web Platform Startup Script
MediaCrawler Web 平台启动脚本
"""

import os
import sys
import subprocess
import webbrowser
import time
from pathlib import Path

def check_dependencies():
    """检查依赖是否安装"""
    try:
        import fastapi
        import uvicorn
        import psutil
        print("✅ Web API 依赖检查通过")
        return True
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("请运行: pip install -r web_requirements.txt")
        return False

def build_frontend():
    """构建前端（如果需要）"""
    frontend_dir = Path("frontend")
    dist_dir = frontend_dir / "dist"
    
    if not frontend_dir.exists():
        print("⚠️  前端目录不存在，将使用内置界面")
        return True
    
    if dist_dir.exists():
        print("✅ 前端已构建")
        return True
    
    print("🔨 开始构建前端...")
    try:
        # 检查是否有 npm
        subprocess.run(["npm", "--version"], check=True, capture_output=True)
        
        # 安装依赖
        print("📦 安装前端依赖...")
        subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
        
        # 构建
        print("🏗️  构建前端...")
        subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True)
        
        print("✅ 前端构建完成")
        return True
        
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  前端构建失败，将使用 API 模式")
        return False

def start_web_server():
    """启动 Web 服务器"""
    print("🚀 启动 MediaCrawler Web 服务...")
    
    try:
        import uvicorn
        from web_api import app
        
        # 启动服务器
        config = uvicorn.Config(
            app,
            host="0.0.0.0",
            port=8000,
            reload=False,
            access_log=True
        )
        server = uvicorn.Server(config)
        
        # 延迟打开浏览器
        def open_browser():
            time.sleep(2)
            print("🌐 打开浏览器...")
            webbrowser.open("http://localhost:8000")
        
        import threading
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        print("📊 管理界面: http://localhost:8000")
        print("📖 API 文档: http://localhost:8000/docs")
        print("🔧 按 Ctrl+C 停止服务")
        
        server.run()
        
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)

def main():
    """主函数"""
    print("=" * 60)
    print("🕷️  MediaCrawler Web 管理平台")
    print("=" * 60)
    
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)
    
    # 构建前端
    build_frontend()
    
    # 启动服务
    start_web_server()

if __name__ == "__main__":
    main()