#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MediaCrawler Web API Server
提供 RESTful API 接口，为前端界面提供数据服务
"""

import asyncio
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import threading
import time
import psutil

from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import config
import db
from base.base_crawler import AbstractCrawler
from main import CrawlerFactory

app = FastAPI(
    title="MediaCrawler API",
    description="MediaCrawler 爬虫管理平台 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

# 全局变量
crawler_process: Optional[subprocess.Popen] = None
crawler_status = {
    "status": "stopped",
    "message": "爬虫未运行",
    "uptime": "0分钟",
    "crawledCount": 0,
    "errorCount": 0,
    "memoryUsage": "0MB",
    "cpuUsage": "0%",
    "startTime": None,
}

crawler_tasks: List[Dict] = []

# Pydantic 模型
class CrawlerStartRequest(BaseModel):
    platform: str
    type: str
    keywords: str
    loginType: str = "qrcode"
    enableComments: bool = True
    enableSubComments: bool = False
    maxCount: int = 200
    saveDataOption: str = "sqlite"
    cookies: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    platform: Optional[str] = None
    crawlerType: Optional[str] = None
    keywords: Optional[str] = None
    loginType: Optional[str] = None
    saveDataOption: Optional[str] = None
    startPage: Optional[int] = None
    maxNotesCount: Optional[int] = None
    maxConcurrency: Optional[int] = None
    maxSleepSec: Optional[int] = None
    enableComments: Optional[bool] = None
    enableSubComments: Optional[bool] = None
    enableMedia: Optional[bool] = None
    maxCommentsCount: Optional[int] = None
    enableWordcloud: Optional[bool] = None
    headless: Optional[bool] = None
    saveLoginState: Optional[bool] = None
    enableCdpMode: Optional[bool] = None
    cdpDebugPort: Optional[int] = None
    customBrowserPath: Optional[str] = None
    browserLaunchTimeout: Optional[int] = None
    autoCloseBrowser: Optional[bool] = None
    enableIpProxy: Optional[bool] = None
    ipProxyPoolCount: Optional[int] = None
    ipProxyProvider: Optional[str] = None
    dbHost: Optional[str] = None
    dbPort: Optional[int] = None
    dbUser: Optional[str] = None
    dbPassword: Optional[str] = None
    dbName: Optional[str] = None

# 辅助函数
def get_db_connection():
    """获取数据库连接"""
    try:
        if config.SAVE_DATA_OPTION == "sqlite":
            db_path = "data/mediacrawler.db"
            if not os.path.exists(db_path):
                os.makedirs(os.path.dirname(db_path), exist_ok=True)
            return sqlite3.connect(db_path)
        else:
            # 这里可以添加 MySQL 连接逻辑
            raise HTTPException(status_code=500, detail="暂不支持 MySQL 数据库")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"数据库连接失败: {str(e)}")

def get_platform_stats():
    """获取各平台数据统计"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    platforms = ['xhs', 'dy', 'ks', 'bili', 'wb', 'tieba', 'zhihu']
    platform_names = {
        'xhs': '小红书',
        'dy': '抖音', 
        'ks': '快手',
        'bili': 'B站',
        'wb': '微博',
        'tieba': '贴吧',
        'zhihu': '知乎'
    }
    
    data = []
    for platform in platforms:
        try:
            # 尝试查询各平台的数据表
            table_names = {
                'xhs': 'xhs_note',
                'dy': 'douyin_aweme',
                'ks': 'kuaishou_video', 
                'bili': 'bilibili_video',
                'wb': 'weibo_note',
                'tieba': 'tieba_note',
                'zhihu': 'zhihu_note'
            }
            
            table_name = table_names.get(platform)
            if table_name:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                if count > 0:
                    data.append({
                        'name': platform_names[platform],
                        'value': count
                    })
        except sqlite3.OperationalError:
            # 表不存在，跳过
            continue
    
    conn.close()
    return data

def update_crawler_status():
    """更新爬虫状态信息"""
    global crawler_status, crawler_process
    
    if crawler_process and crawler_process.poll() is None:
        # 爬虫正在运行
        crawler_status["status"] = "running"
        crawler_status["message"] = "爬虫正在运行中"
        
        # 计算运行时间
        if crawler_status["startTime"]:
            start_time = datetime.fromisoformat(crawler_status["startTime"])
            uptime = datetime.now() - start_time
            minutes = int(uptime.total_seconds() / 60)
            crawler_status["uptime"] = f"{minutes}分钟"
        
        # 获取进程信息
        try:
            process = psutil.Process(crawler_process.pid)
            crawler_status["memoryUsage"] = f"{process.memory_info().rss / 1024 / 1024:.1f}MB"
            crawler_status["cpuUsage"] = f"{process.cpu_percent():.1f}%"
        except:
            pass
    else:
        crawler_status["status"] = "stopped"
        crawler_status["message"] = "爬虫已停止"
        crawler_status["uptime"] = "0分钟"
        crawler_status["memoryUsage"] = "0MB"
        crawler_status["cpuUsage"] = "0%"

# API 路由

@app.get("/api/stats")
async def get_stats():
    """获取统计数据"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        stats = {
            "totalPosts": 0,
            "totalComments": 0,
            "totalUsers": 0,
            "totalViews": 0
        }
        
        # 尝试从不同平台的表中获取数据
        table_configs = [
            {"table": "xhs_note", "count_col": "liked_count", "view_col": "collected_count"},
            {"table": "douyin_aweme", "count_col": "digg_count", "view_col": "play_count"},
            {"table": "bilibili_video", "count_col": "liked_count", "view_col": "video_play_count"},
        ]
        
        for table_config in table_configs:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_config['table']}")
                count = cursor.fetchone()[0]
                stats["totalPosts"] += count
                
                # 获取点赞数和浏览数
                cursor.execute(f"SELECT SUM(CAST({table_config['count_col']} AS INTEGER)) FROM {table_config['table']} WHERE {table_config['count_col']} IS NOT NULL")
                likes = cursor.fetchone()[0] or 0
                stats["totalViews"] += likes
                
            except sqlite3.OperationalError:
                continue
        
        # 获取评论数
        comment_tables = ["xhs_note_comment", "douyin_aweme_comment", "bilibili_video_comment"]
        for table in comment_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                stats["totalComments"] += count
            except sqlite3.OperationalError:
                continue
        
        conn.close()
        return stats
        
    except Exception as e:
        return {
            "totalPosts": 0,
            "totalComments": 0,
            "totalUsers": 0,
            "totalViews": 0
        }

@app.get("/api/stats/platform")
async def get_platform_data():
    """获取平台数据分布"""
    return get_platform_stats()

@app.get("/api/stats/activity")
async def get_recent_activity():
    """获取最近活动数据"""
    # 生成最近7天的模拟数据
    dates = []
    counts = []
    activities = []
    
    for i in range(7):
        date = (datetime.now() - timedelta(days=6-i)).strftime('%m-%d')
        dates.append(date)
        counts.append(i * 10 + 20)  # 模拟数据
    
    # 模拟最近活动
    activities = [
        {
            "platform": "小红书",
            "type": "关键词搜索",
            "time": "2分钟前",
            "description": "爬取关键词 '编程副业' 相关帖子 50 条"
        },
        {
            "platform": "抖音",
            "type": "用户主页",
            "time": "15分钟前", 
            "description": "爬取用户 @程序员小张 的视频 20 条"
        },
        {
            "platform": "B站",
            "type": "关键词搜索",
            "time": "1小时前",
            "description": "爬取关键词 'Python教程' 相关视频 100 条"
        }
    ]
    
    return {
        "dates": dates,
        "counts": counts,
        "activities": activities
    }

@app.get("/api/crawler/status")
async def get_crawler_status():
    """获取爬虫状态"""
    update_crawler_status()
    return crawler_status

@app.get("/api/crawler/tasks")
async def get_crawler_tasks():
    """获取爬虫任务列表"""
    return crawler_tasks

@app.post("/api/crawler/start")
async def start_crawler(request: CrawlerStartRequest, background_tasks: BackgroundTasks):
    """启动爬虫"""
    global crawler_process, crawler_status, crawler_tasks
    
    if crawler_process and crawler_process.poll() is None:
        raise HTTPException(status_code=400, detail="爬虫已在运行中")
    
    try:
        # 构建命令行参数
        cmd = [
            sys.executable, "main.py",
            "--platform", request.platform,
            "--type", request.type,
            "--keywords", request.keywords,
            "--lt", request.loginType,
            "--get_comment", str(request.enableComments).lower(),
            "--get_sub_comment", str(request.enableSubComments).lower(),
            "--save_data_option", request.saveDataOption
        ]
        
        if request.cookies:
            cmd.extend(["--cookies", request.cookies])
        
        # 启动爬虫进程
        crawler_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # 更新状态
        crawler_status["status"] = "running"
        crawler_status["message"] = "爬虫启动成功"
        crawler_status["startTime"] = datetime.now().isoformat()
        crawler_status["crawledCount"] = 0
        crawler_status["errorCount"] = 0
        
        # 添加任务记录
        task = {
            "id": str(len(crawler_tasks) + 1),
            "platform": request.platform,
            "type": request.type,
            "keywords": request.keywords,
            "status": "running",
            "progress": 0,
            "startTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "logs": ""
        }
        crawler_tasks.append(task)
        
        return {"message": "爬虫启动成功", "taskId": task["id"]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动失败: {str(e)}")

@app.post("/api/crawler/stop")
async def stop_crawler():
    """停止爬虫"""
    global crawler_process, crawler_status
    
    if not crawler_process or crawler_process.poll() is not None:
        raise HTTPException(status_code=400, detail="爬虫未在运行")
    
    try:
        crawler_process.terminate()
        crawler_process.wait(timeout=10)
        
        crawler_status["status"] = "stopped"
        crawler_status["message"] = "爬虫已停止"
        
        # 更新任务状态
        for task in crawler_tasks:
            if task["status"] == "running":
                task["status"] = "stopped"
        
        return {"message": "爬虫已停止"}
        
    except subprocess.TimeoutExpired:
        crawler_process.kill()
        return {"message": "爬虫已强制停止"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"停止失败: {str(e)}")

@app.get("/api/data/posts")
async def get_posts(
    platform: Optional[str] = None,
    keyword: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    page: int = 1,
    pageSize: int = 20
):
    """获取帖子数据"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 根据平台选择表名
        table_map = {
            "xhs": "xhs_note",
            "dy": "douyin_aweme", 
            "ks": "kuaishou_video",
            "bili": "bilibili_video",
            "wb": "weibo_note",
            "tieba": "tieba_note",
            "zhihu": "zhihu_note"
        }
        
        posts = []
        
        if platform == "all" or not platform:
            tables = list(table_map.values())
        else:
            tables = [table_map.get(platform, "xhs_note")]
        
        for table_name in tables:
            try:
                # 构建查询语句
                query = f"SELECT * FROM {table_name}"
                conditions = []
                params = []
                
                if keyword:
                    conditions.append("(title LIKE ? OR content LIKE ?)")
                    params.extend([f"%{keyword}%", f"%{keyword}%"])
                
                if startDate:
                    conditions.append("create_time >= ?")
                    params.append(startDate)
                
                if endDate:
                    conditions.append("create_time <= ?")
                    params.append(endDate)
                
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                
                query += f" ORDER BY create_time DESC LIMIT {pageSize} OFFSET {(page-1)*pageSize}"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                # 获取列名
                columns = [description[0] for description in cursor.description]
                
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    # 标准化字段名
                    post = {
                        "id": row_dict.get("note_id") or row_dict.get("aweme_id") or row_dict.get("video_id") or str(row_dict.get("id")),
                        "platform": platform or "unknown",
                        "title": row_dict.get("title") or row_dict.get("desc", ""),
                        "author": row_dict.get("nickname") or row_dict.get("user_name", ""),
                        "publishTime": row_dict.get("create_time") or row_dict.get("publish_time"),
                        "likeCount": row_dict.get("liked_count") or row_dict.get("digg_count") or 0,
                        "commentCount": row_dict.get("comment_count") or 0,
                        "viewCount": row_dict.get("view_count") or row_dict.get("play_count") or 0,
                        "content": row_dict.get("desc") or row_dict.get("content", ""),
                        "url": row_dict.get("note_url") or row_dict.get("aweme_url") or "",
                        "images": []
                    }
                    posts.append(post)
                    
            except sqlite3.OperationalError:
                continue
        
        conn.close()
        return posts[:pageSize]  # 限制返回数量
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据失败: {str(e)}")

@app.get("/api/data/posts/{post_id}/comments")
async def get_comments(post_id: str):
    """获取帖子评论"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 尝试从不同的评论表中查询
        comment_tables = [
            ("xhs_note_comment", "note_id"),
            ("douyin_aweme_comment", "aweme_id"),
            ("bilibili_video_comment", "video_id")
        ]
        
        comments = []
        for table_name, id_field in comment_tables:
            try:
                cursor.execute(f"SELECT * FROM {table_name} WHERE {id_field} = ?", (post_id,))
                rows = cursor.fetchall()
                
                if rows:
                    columns = [description[0] for description in cursor.description]
                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        comment = {
                            "id": row_dict.get("comment_id", ""),
                            "username": row_dict.get("nickname", ""),
                            "content": row_dict.get("content", ""),
                            "createTime": row_dict.get("create_time", ""),
                            "likeCount": row_dict.get("like_count", 0)
                        }
                        comments.append(comment)
                    break
            except sqlite3.OperationalError:
                continue
        
        conn.close()
        return comments
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取评论失败: {str(e)}")

@app.post("/api/data/export")
async def export_data(
    platform: Optional[str] = None,
    keyword: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    postIds: Optional[List[str]] = None,
    format: str = "csv"
):
    """导出数据"""
    try:
        # 获取数据
        posts = await get_posts(platform, keyword, startDate, endDate, 1, 10000)
        
        if format == "csv":
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # 写入表头
            writer.writerow(["ID", "平台", "标题", "作者", "发布时间", "点赞数", "评论数", "浏览数", "内容"])
            
            # 写入数据
            for post in posts:
                if not postIds or post["id"] in postIds:
                    writer.writerow([
                        post["id"],
                        post["platform"],
                        post["title"],
                        post["author"],
                        post["publishTime"],
                        post["likeCount"],
                        post["commentCount"],
                        post["viewCount"],
                        post["content"]
                    ])
            
            output.seek(0)
            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=mediacrawler_data.csv"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="不支持的导出格式")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@app.get("/api/config")
async def get_config():
    """获取配置"""
    try:
        config_data = {
            "platform": getattr(config, "PLATFORM", "xhs"),
            "crawlerType": getattr(config, "CRAWLER_TYPE", "search"),
            "keywords": getattr(config, "KEYWORDS", ""),
            "loginType": getattr(config, "LOGIN_TYPE", "qrcode"),
            "saveDataOption": getattr(config, "SAVE_DATA_OPTION", "sqlite"),
            "startPage": getattr(config, "START_PAGE", 1),
            "maxNotesCount": getattr(config, "CRAWLER_MAX_NOTES_COUNT", 200),
            "maxConcurrency": getattr(config, "MAX_CONCURRENCY_NUM", 1),
            "maxSleepSec": getattr(config, "CRAWLER_MAX_SLEEP_SEC", 2),
            "enableComments": getattr(config, "ENABLE_GET_COMMENTS", True),
            "enableSubComments": getattr(config, "ENABLE_GET_SUB_COMMENTS", False),
            "enableMedia": getattr(config, "ENABLE_GET_MEIDAS", False),
            "maxCommentsCount": getattr(config, "CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES", 10),
            "enableWordcloud": getattr(config, "ENABLE_GET_WORDCLOUD", False),
            "headless": getattr(config, "HEADLESS", False),
            "saveLoginState": getattr(config, "SAVE_LOGIN_STATE", True),
            "enableCdpMode": getattr(config, "ENABLE_CDP_MODE", False),
            "cdpDebugPort": getattr(config, "CDP_DEBUG_PORT", 9222),
            "customBrowserPath": getattr(config, "CUSTOM_BROWSER_PATH", ""),
            "browserLaunchTimeout": getattr(config, "BROWSER_LAUNCH_TIMEOUT", 30),
            "autoCloseBrowser": getattr(config, "AUTO_CLOSE_BROWSER", True),
            "enableIpProxy": getattr(config, "ENABLE_IP_PROXY", False),
            "ipProxyPoolCount": getattr(config, "IP_PROXY_POOL_COUNT", 2),
            "ipProxyProvider": getattr(config, "IP_PROXY_PROVIDER_NAME", "kuaidaili"),
        }
        return config_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取配置失败: {str(e)}")

@app.put("/api/config")
async def update_config(request: ConfigUpdateRequest):
    """更新配置"""
    try:
        # 更新配置文件
        config_file = "config/base_config.py"
        
        # 读取当前配置
        with open(config_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 更新配置值
        updates = request.dict(exclude_none=True)
        config_mapping = {
            "platform": "PLATFORM",
            "crawlerType": "CRAWLER_TYPE", 
            "keywords": "KEYWORDS",
            "loginType": "LOGIN_TYPE",
            "saveDataOption": "SAVE_DATA_OPTION",
            "startPage": "START_PAGE",
            "maxNotesCount": "CRAWLER_MAX_NOTES_COUNT",
            "maxConcurrency": "MAX_CONCURRENCY_NUM",
            "maxSleepSec": "CRAWLER_MAX_SLEEP_SEC",
            "enableComments": "ENABLE_GET_COMMENTS",
            "enableSubComments": "ENABLE_GET_SUB_COMMENTS",
            "enableMedia": "ENABLE_GET_MEIDAS",
            "maxCommentsCount": "CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES",
            "enableWordcloud": "ENABLE_GET_WORDCLOUD",
            "headless": "HEADLESS",
            "saveLoginState": "SAVE_LOGIN_STATE",
            "enableCdpMode": "ENABLE_CDP_MODE",
            "cdpDebugPort": "CDP_DEBUG_PORT",
            "customBrowserPath": "CUSTOM_BROWSER_PATH",
            "browserLaunchTimeout": "BROWSER_LAUNCH_TIMEOUT",
            "autoCloseBrowser": "AUTO_CLOSE_BROWSER",
            "enableIpProxy": "ENABLE_IP_PROXY",
            "ipProxyPoolCount": "IP_PROXY_POOL_COUNT",
            "ipProxyProvider": "IP_PROXY_PROVIDER_NAME",
        }
        
        for key, value in updates.items():
            config_key = config_mapping.get(key)
            if config_key:
                if isinstance(value, str):
                    pattern = f'{config_key} = "'
                    if pattern in content:
                        # 找到并替换字符串值
                        import re
                        content = re.sub(
                            f'{config_key} = ".*?"',
                            f'{config_key} = "{value}"',
                            content
                        )
                elif isinstance(value, bool):
                    content = content.replace(
                        f'{config_key} = {not value}',
                        f'{config_key} = {value}'
                    )
                elif isinstance(value, int):
                    import re
                    content = re.sub(
                        f'{config_key} = \\d+',
                        f'{config_key} = {value}',
                        content
                    )
        
        # 写回配置文件
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 重新加载配置模块
        import importlib
        importlib.reload(config)
        
        return {"message": "配置更新成功"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")

@app.get("/api/config/export")
async def export_config():
    """导出配置"""
    try:
        config_data = await get_config()
        return config_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出配置失败: {str(e)}")

@app.post("/api/config/import")
async def import_config(config_data: dict):
    """导入配置"""
    try:
        # 验证并更新配置
        request = ConfigUpdateRequest(**config_data)
        await update_config(request)
        return {"message": "配置导入成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入配置失败: {str(e)}")

if __name__ == "__main__":
    print("🚀 启动 MediaCrawler Web API 服务...")
    print("📊 管理界面: http://localhost:8000")
    print("📖 API 文档: http://localhost:8000/docs")
    
    uvicorn.run(
        "web_api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        access_log=True
    )