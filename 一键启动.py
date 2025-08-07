#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MediaCrawler 一键启动脚本
专为小白用户设计，自动完成环境检查、依赖安装和服务启动
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def print_banner():
    """打印欢迎横幅"""
    print("=" * 70)
    print("🕷️  MediaCrawler 一键启动向导")
    print("=" * 70)
    print("📝 专为小白用户设计，全自动安装和启动")
    print("⏰ 首次运行可能需要 5-10 分钟，请耐心等待...")
    print("=" * 70)
    print()

def check_python():
    """检查 Python 环境"""
    print("🔍 正在检查 Python 环境...")
    try:
        import sys
        version = sys.version_info
        if version.major >= 3 and version.minor >= 8:
            print(f"✅ Python {version.major}.{version.minor}.{version.micro} - 版本符合要求")
            return True
        else:
            print(f"❌ Python 版本过低: {version.major}.{version.minor}.{version.micro}")
            print("   请安装 Python 3.8 或更高版本")
            return False
    except Exception as e:
        print(f"❌ Python 检查失败: {e}")
        return False

def install_dependencies():
    """安装依赖包"""
    print("\n📦 正在安装依赖包...")
    
    # 检查依赖文件是否存在
    requirements_files = [
        "requirements.txt",
        "web_requirements.txt"
    ]
    
    for req_file in requirements_files:
        if not Path(req_file).exists():
            print(f"⚠️  找不到 {req_file}，跳过...")
            continue
            
        print(f"📥 安装 {req_file}...")
        try:
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", 
                "-r", req_file, "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print(f"✅ {req_file} 安装成功")
            else:
                print(f"⚠️  {req_file} 安装可能有问题，但继续执行...")
                
        except subprocess.TimeoutExpired:
            print(f"⏰ {req_file} 安装超时，但继续执行...")
        except Exception as e:
            print(f"❌ {req_file} 安装失败: {e}")
    
    # 安装 playwright 浏览器
    print("🌐 正在安装浏览器驱动...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "playwright", "install", "chromium"
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            print("✅ 浏览器驱动安装成功")
        else:
            print("⚠️  浏览器驱动安装可能有问题，但继续执行...")
            
    except subprocess.TimeoutExpired:
        print("⏰ 浏览器驱动安装超时，但继续执行...")
    except Exception as e:
        print(f"⚠️  浏览器驱动安装失败: {e}")

def check_web_dependencies():
    """检查 Web 依赖是否安装成功"""
    print("\n🔍 正在检查 Web 依赖...")
    
    required_packages = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("psutil", "psutil")
    ]
    
    missing_packages = []
    
    for package_name, display_name in required_packages:
        try:
            __import__(package_name)
            print(f"✅ {display_name} - 已安装")
        except ImportError:
            print(f"❌ {display_name} - 未安装")
            missing_packages.append(package_name)
    
    if missing_packages:
        print(f"\n⚠️  缺少依赖包，尝试手动安装...")
        for package in missing_packages:
            try:
                subprocess.run([
                    sys.executable, "-m", "pip", "install", package
                ], check=True, capture_output=True)
                print(f"✅ {package} 安装成功")
            except Exception as e:
                print(f"❌ {package} 安装失败: {e}")
                return False
    
    return True

def start_web_service():
    """启动 Web 服务"""
    print("\n🚀 正在启动 MediaCrawler Web 服务...")
    
    try:
        # 检查 web_api.py 是否存在
        if not Path("web_api.py").exists():
            print("❌ 找不到 web_api.py 文件")
            print("   请确保您在正确的项目目录中运行此脚本")
            return False
        
        # 延迟打开浏览器
        def open_browser_delayed():
            time.sleep(3)
            print("🌐 正在打开浏览器...")
            try:
                webbrowser.open("http://localhost:8000")
            except Exception as e:
                print(f"⚠️  自动打开浏览器失败: {e}")
                print("   请手动访问: http://localhost:8000")
        
        import threading
        browser_thread = threading.Thread(target=open_browser_delayed)
        browser_thread.daemon = True
        browser_thread.start()
        
        print("✅ Web 服务启动中...")
        print("📊 管理界面: http://localhost:8000")
        print("📖 API 文档: http://localhost:8000/docs")
        print("🔧 按 Ctrl+C 可以停止服务")
        print("=" * 70)
        
        # 启动服务
        import uvicorn
        from web_api import app
        
        config = uvicorn.Config(
            app,
            host="0.0.0.0",
            port=8000,
            reload=False,
            access_log=False,  # 减少日志输出
            log_level="warning"
        )
        
        server = uvicorn.Server(config)
        server.run()
        
        return True
        
    except KeyboardInterrupt:
        print("\n\n👋 服务已停止，感谢使用 MediaCrawler！")
        return True
    except ImportError as e:
        print(f"❌ 导入模块失败: {e}")
        print("   请检查依赖是否正确安装")
        return False
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        return False

def show_usage_tips():
    """显示使用提示"""
    print("\n📚 使用提示:")
    print("1. 🎮 点击左侧菜单的 '爬虫控制' 开始第一次爬取")
    print("2. 📱 建议新手先选择 '小红书' 平台，设置少量数据测试")
    print("3. 🔍 爬取完成后在 '数据管理' 页面查看结果")
    print("4. ⚙️ 在 '配置管理' 页面可以调整各种参数")
    print("5. 📖 详细教程请查看 '新手使用指南.md' 文件")
    print()
    print("🆘 如果遇到问题:")
    print("   - 重启程序: python 一键启动.py")
    print("   - 查看详细教程: 新手使用指南.md")
    print("   - 检查网络连接和防火墙设置")

def main():
    """主函数"""
    print_banner()
    
    # 步骤1: 检查 Python 环境
    if not check_python():
        input("按回车键退出...")
        sys.exit(1)
    
    # 步骤2: 安装依赖
    print("\n" + "="*50)
    print("📦 开始安装依赖包（这可能需要几分钟）...")
    print("="*50)
    install_dependencies()
    
    # 步骤3: 检查依赖安装情况
    if not check_web_dependencies():
        print("\n❌ 依赖安装不完整，请检查网络连接后重试")
        input("按回车键退出...")
        sys.exit(1)
    
    # 步骤4: 显示使用提示
    show_usage_tips()
    
    # 步骤5: 启动服务
    print("\n" + "="*50)
    print("🚀 准备启动 Web 服务...")
    print("="*50)
    
    if start_web_service():
        print("✅ 程序运行完成")
    else:
        print("❌ 程序运行失败")
        input("按回车键退出...")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 程序被用户中断")
    except Exception as e:
        print(f"\n❌ 程序运行出错: {e}")
        input("按回车键退出...")
        sys.exit(1)