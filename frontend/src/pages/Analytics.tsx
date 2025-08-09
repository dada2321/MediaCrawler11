import { useState } from 'react'
import { Card, Select, Typography, Space } from 'antd'
import ReactECharts from 'echarts-for-react'
import { useQuery } from '@tanstack/react-query'
import { getPlatformData } from '../services/api'

const { Title } = Typography

export default function Analytics() {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie')

  const { data: platformData, isLoading } = useQuery({
    queryKey: ['analytics', 'platform'],
    queryFn: getPlatformData,
  })

  const chartOption = {
    tooltip: {
      trigger: chartType === 'pie' ? 'item' : 'axis',
    },
    legend: { bottom: 10, left: 'center' },
    xAxis: chartType === 'bar' ? {
      type: 'category',
      data: platformData?.map((d: any) => d.name) || [],
    } : undefined,
    yAxis: chartType === 'bar' ? { type: 'value' } : undefined,
    series: [
      chartType === 'pie'
        ? {
            name: '平台数据',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: platformData || [],
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
          }
        : {
            name: '平台数据',
            type: 'bar',
            data: platformData?.map((d: any) => d.value) || [],
            itemStyle: { color: '#1677ff' },
          },
    ],
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2}>数据分析</Title>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <span>图表类型：</span>
        <Select value={chartType} style={{ width: 120 }} onChange={setChartType} options={[{ value: 'pie', label: '饼图' }, { value: 'bar', label: '柱状图' }]} />
      </Space>

      <Card loading={isLoading}>
        <ReactECharts option={chartOption} style={{ height: '500px' }} />
      </Card>
    </div>
  )
}