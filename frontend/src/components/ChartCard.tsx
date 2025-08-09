import { Card, Statistic } from 'antd'
import type { StatisticProps } from 'antd'
import { ReactNode } from 'react'

interface ChartCardProps extends Pick<StatisticProps, 'title' | 'value' | 'loading'> {
  /** 图标 */
  icon?: ReactNode
  /** 数值颜色 */
  color?: string
}

export default function ChartCard({ title, value, icon, color = '#1677ff', loading }: ChartCardProps) {
  return (
    <Card className="stats-card">
      <Statistic
        title={title}
        value={value}
        loading={loading}
        prefix={icon}
        valueStyle={{ color }}
      />
    </Card>
  )
}