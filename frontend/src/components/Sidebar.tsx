import { useState } from 'react'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ControlOutlined,
  DatabaseOutlined,
  SettingOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'

const { Sider } = Layout

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '数据概览',
  },
  {
    key: '/crawler',
    icon: <ControlOutlined />,
    label: '爬虫控制',
  },
  {
    key: '/data',
    icon: <DatabaseOutlined />,
    label: '数据管理',
  },
  {
    key: '/config',
    icon: <SettingOutlined />,
    label: '配置管理',
  },
  {
    key: '/analytics',
    icon: <BarChartOutlined />,
    label: '数据分析',
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      theme="dark"
      width={240}
    >
      <div className="logo">
        {collapsed ? 'MC' : 'MediaCrawler'}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  )
}