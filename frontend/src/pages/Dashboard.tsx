import { Row, Col, Typography, Space } from 'antd'
import { UserOutlined, FileTextOutlined, CommentOutlined, EyeOutlined } from '@ant-design/icons'
import ChartCard from '../components/ChartCard'
import ReactECharts from 'echarts-for-react'
import { useQuery } from '@tanstack/react-query'
import { getStats, getPlatformData, getRecentActivity } from '../services/api'

const { Title } = Typography

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000, // 30 seconds
  })

  const { data: platformData } = useQuery({
    queryKey: ['platformData'],
    queryFn: getPlatformData,
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: getRecentActivity,
  })

  // Chart configurations
  const platformChartOption = {
    title: {
      text: '各平台数据分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 10,
      left: 'center',
    },
    series: [
      {
        name: '平台数据',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: platformData || [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }

  const activityChartOption = {
    title: {
      text: '最近7天爬取活动',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      bottom: 10,
    },
    xAxis: {
      type: 'category',
      data: recentActivity?.dates || [],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '爬取数量',
        type: 'line',
        data: recentActivity?.counts || [],
        smooth: true,
        lineStyle: {
          color: '#1890ff',
        },
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.1)',
        },
      },
    ],
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          数据概览
        </Title>
        <p style={{ margin: '8px 0 0 0', color: '#666' }}>
          MediaCrawler 爬虫数据统计与分析
        </p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <ChartCard
            title="总帖子数"
            value={stats?.totalPosts || 0}
            icon={<FileTextOutlined />}
            color="#1890ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ChartCard
            title="总评论数"
            value={stats?.totalComments || 0}
            icon={<CommentOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ChartCard
            title="总用户数"
            value={stats?.totalUsers || 0}
            icon={<UserOutlined />}
            color="#faad14"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ChartCard
            title="总浏览量"
            value={stats?.totalViews || 0}
            icon={<EyeOutlined />}
            color="#f5222d"
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <ReactECharts option={platformChartOption} style={{ height: '400px' }} />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <ReactECharts option={activityChartOption} style={{ height: '400px' }} />
          </div>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Card title="最近活动" style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {recentActivity?.activities?.map((activity: any, index: number) => (
            <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Space>
                <span style={{ color: '#1890ff' }}>{activity.platform}</span>
                <span>{activity.type}</span>
                <span style={{ color: '#666' }}>{activity.time}</span>
              </Space>
              <div style={{ marginTop: 4, color: '#666' }}>
                {activity.description}
              </div>
            </div>
          )) || (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              暂无最近活动
            </div>
          )}
        </Space>
      </Card>
    </div>
  )
}