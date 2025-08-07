#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MediaCrawler 一键启动脚本
专为小白用户设计，自动完成环境检查、依赖安装和服务启动
与原项目的 uv 使用方式保持一致
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
    print("⏰ 首次运行可能需要 10-15 分钟，请耐心等待...")
    print("🔧 与原项目 uv 使用方式保持一致")
    print("=" * 70)
    print()

def check_uv():
    """检查 uv 是否安装"""
    print("🔍 正在检查 uv 包管理工具...")
    try:
        result = subprocess.run(["uv", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ uv 已安装: {result.stdout.strip()}")
            return True
        else:
            return False
    except FileNotFoundError:
        print("❌ uv 未安装")
        return False

def install_uv():
    """安装 uv"""
    print("📦 正在安装 uv 包管理工具...")
    
    try:
        # 尝试使用 pip 安装 uv
        print("🔧 使用 pip 安装 uv...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "uv"
        ], capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("✅ uv 安装成功")
            return True
        else:
            print("⚠️  pip 安装失败，尝试其他方式...")
            
    except Exception as e:
        print(f"⚠️  pip 安装失败: {e}")
    
    # 根据操作系统尝试其他安装方式
    import platform
    system = platform.system().lower()
    
    try:
        if system == "windows":
            print("🔧 使用 PowerShell 安装 uv...")
            cmd = 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=180)
        else:
            print("🔧 使用 curl 安装 uv...")
            cmd = "curl -LsSf https://astral.sh/uv/install.sh | sh"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=180)
        
        if result.returncode == 0:
            print("✅ uv 安装成功")
            # 重新加载环境变量
            if system != "windows":
                os.environ["PATH"] = f"{os.path.expanduser('~/.cargo/bin')}:{os.environ.get('PATH', '')}"
            return True
        else:
            print("❌ uv 安装失败")
            return False
            
    except Exception as e:
        print(f"❌ uv 安装失败: {e}")
        return False

def sync_dependencies():
    """使用 uv sync 安装项目依赖"""
    print("\n📦 正在使用 uv sync 安装项目依赖...")
    
    try:
        # 检查是否有 pyproject.toml
        if not Path("pyproject.toml").exists():
            print("⚠️  找不到 pyproject.toml，尝试传统方式...")
            return install_traditional_way()
        
        print("🔧 执行 uv sync（这可能需要几分钟）...")
        result = subprocess.run([
            "uv", "sync"
        ], capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            print("✅ uv sync 完成")
            
            # 安装额外的 Web 依赖
            print("📦 安装 Web 界面依赖...")
            web_deps = ["fastapi", "uvicorn[standard]", "psutil", "pydantic"]
            for dep in web_deps:
                try:
                    subprocess.run([
                        "uv", "pip", "install", dep
                    ], capture_output=True, text=True, timeout=60)
                except:
                    pass
            
            # 安装 playwright 浏览器
            print("🌐 安装浏览器驱动...")
            try:
                subprocess.run([
                    "uv", "run", "playwright", "install", "chromium"
                ], capture_output=True, text=True, timeout=300)
                print("✅ 浏览器驱动安装完成")
            except Exception as e:
                print(f"⚠️  浏览器驱动安装失败: {e}")
            
            return True
        else:
            print("❌ uv sync 失败")
            print("错误信息:", result.stderr)
            print("⚠️  尝试传统安装方式...")
            return install_traditional_way()
            
    except subprocess.TimeoutExpired:
        print("⏰ uv sync 超时，尝试传统方式...")
        return install_traditional_way()
    except Exception as e:
        print(f"❌ uv sync 失败: {e}")
        return install_traditional_way()

def install_traditional_way():
    """传统方式安装依赖"""
    print("\n🔄 使用传统方式安装依赖...")
    
    try:
        # 检查是否有 requirements.txt
        req_files = ["requirements.txt", "web_requirements.txt"]
        
        for req_file in req_files:
            if Path(req_file).exists():
                print(f"📥 安装 {req_file}...")
                result = subprocess.run([
                    sys.executable, "-m", "pip", "install", 
                    "-r", req_file, "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
                ], capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    print(f"✅ {req_file} 安装成功")
                else:
                    print(f"⚠️  {req_file} 安装可能有问题")
        
        # 安装 playwright 浏览器
        print("🌐 安装浏览器驱动...")
        try:
            subprocess.run([
                sys.executable, "-m", "playwright", "install", "chromium"
            ], capture_output=True, text=True, timeout=300)
            print("✅ 浏览器驱动安装完成")
        except:
            print("⚠️  浏览器驱动安装失败")
        
        return True
        
    except Exception as e:
        print(f"❌ 传统方式安装失败: {e}")
        return False

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
                # 优先使用 uv 安装
                if check_uv():
                    subprocess.run([
                        "uv", "pip", "install", package
                    ], check=True, capture_output=True, timeout=60)
                else:
                    subprocess.run([
                        sys.executable, "-m", "pip", "install", package
                    ], check=True, capture_output=True, timeout=60)
                print(f"✅ {package} 安装成功")
            except Exception as e:
                print(f"❌ {package} 安装失败: {e}")
                return False
    
    return True

def start_web_service():
    """启动 Web 服务"""
    print("\n🚀 正在启动 MediaCrawler Web 服务...")
    
    try:
        # 检查必要文件
        required_files = ["web_api.py", "start_web.py"]
        missing_files = [f for f in required_files if not Path(f).exists()]
        
        if missing_files:
            print(f"❌ 找不到必要文件: {missing_files}")
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
        
        # 优先使用 uv 启动
        if check_uv():
            print("🔧 使用 uv 启动服务...")
            result = subprocess.run([
                "uv", "run", "python", "start_web.py"
            ])
        else:
            print("🔧 使用 python 启动服务...")
            result = subprocess.run([
                sys.executable, "start_web.py"
            ])
        
        return True
        
    except KeyboardInterrupt:
        print("\n\n👋 服务已停止，感谢使用 MediaCrawler！")
        return True
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
    print("   - 使用命令行: uv run main.py --help")
    print("   - 检查网络连接和防火墙设置")

def main():
    """主函数"""
    print_banner()
    
    # 步骤1: 检查并安装 uv
    if not check_uv():
        print("📦 uv 未安装，正在自动安装...")
        if not install_uv():
            print("\n❌ uv 安装失败，将使用传统方式")
            print("   您也可以手动安装 uv: pip install uv")
    
    # 步骤2: 同步依赖
    print("\n" + "="*50)
    print("📦 开始安装依赖包（这可能需要10-15分钟）...")
    print("="*50)
    
    if not sync_dependencies():
        print("\n❌ 依赖安装失败，请检查网络连接后重试")
        input("按回车键退出...")
        sys.exit(1)
    
    # 步骤3: 检查依赖安装情况
    if not check_web_dependencies():
        print("\n❌ Web 依赖安装不完整，请检查网络连接后重试")
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
        print("🔧 建议:")
        print("   1. 检查网络连接")
        print("   2. 手动安装 uv: pip install uv")
        print("   3. 查看详细教程: 新手使用指南.md")
        input("按回车键退出...")
        sys.exit(1)