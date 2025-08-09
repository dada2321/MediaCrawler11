import { Layout, Typography, Space } from 'antd'
import { useLocation } from 'react-router-dom'

const { Header } = Layout

const routeTitleMap: Record<string, string> = {
  '/': '数据概览',
  '/crawler': '爬虫控制',
  '/data': '数据管理',
  '/config': '配置管理',
}

export default function HeaderBar() {
  const location = useLocation()
  const title = routeTitleMap[location.pathname] ?? 'MediaCrawler'

  return (
    <Header style={{ background: '#fff', padding: '0 24px' }}>
      <Space direction="horizontal" size="middle" align="center" style={{ height: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
      </Space>
    </Header>
  )
}