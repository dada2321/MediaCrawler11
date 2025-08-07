import { useState } from 'react'
import {
  Card,
  Form,
  Select,
  Input,
  Switch,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Table,
  Tag,
  Modal,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCrawlerStatus, startCrawler, stopCrawler, getCrawlerTasks } from '../services/api'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

const platforms = [
  { value: 'xhs', label: '小红书', color: 'red' },
  { value: 'dy', label: '抖音', color: 'blue' },
  { value: 'ks', label: '快手', color: 'orange' },
  { value: 'bili', label: 'B站', color: 'cyan' },
  { value: 'wb', label: '微博', color: 'volcano' },
  { value: 'tieba', label: '贴吧', color: 'purple' },
  { value: 'zhihu', label: '知乎', color: 'geekblue' },
]

const crawlerTypes = [
  { value: 'search', label: '关键词搜索' },
  { value: 'detail', label: '帖子详情' },
  { value: 'creator', label: '创作者主页' },
]

const loginTypes = [
  { value: 'qrcode', label: '二维码登录' },
  { value: 'phone', label: '手机号登录' },
  { value: 'cookie', label: 'Cookie登录' },
]

export default function CrawlerControl() {
  const [form] = Form.useForm()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const queryClient = useQueryClient()

  const { data: crawlerStatus } = useQuery({
    queryKey: ['crawlerStatus'],
    queryFn: getCrawlerStatus,
    refetchInterval: 5000,
  })

  const { data: crawlerTasks } = useQuery({
    queryKey: ['crawlerTasks'],
    queryFn: getCrawlerTasks,
    refetchInterval: 10000,
  })

  const startCrawlerMutation = useMutation({
    mutationFn: startCrawler,
    onSuccess: () => {
      message.success('爬虫启动成功')
      queryClient.invalidateQueries({ queryKey: ['crawlerStatus'] })
      queryClient.invalidateQueries({ queryKey: ['crawlerTasks'] })
    },
    onError: (error: any) => {
      message.error(`启动失败: ${error.message}`)
    },
  })

  const stopCrawlerMutation = useMutation({
    mutationFn: stopCrawler,
    onSuccess: () => {
      message.success('爬虫已停止')
      queryClient.invalidateQueries({ queryKey: ['crawlerStatus'] })
      queryClient.invalidateQueries({ queryKey: ['crawlerTasks'] })
    },
    onError: (error: any) => {
      message.error(`停止失败: ${error.message}`)
    },
  })

  const handleStart = async () => {
    try {
      const values = await form.validateFields()
      startCrawlerMutation.mutate(values)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleStop = () => {
    stopCrawlerMutation.mutate()
  }

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: string) => {
        const platformInfo = platforms.find(p => p.value === platform)
        return (
          <Tag color={platformInfo?.color}>
            {platformInfo?.label || platform}
          </Tag>
        )
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeInfo = crawlerTypes.find(t => t.value === type)
        return typeInfo?.label || type
      },
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          running: { color: 'green', text: '运行中' },
          stopped: { color: 'red', text: '已停止' },
          pending: { color: 'orange', text: '等待中' },
          completed: { color: 'blue', text: '已完成' },
          error: { color: 'volcano', text: '错误' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 100,
      render: (progress: number) => `${progress || 0}%`,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => {
              Modal.info({
                title: '任务详情',
                content: (
                  <div>
                    <p><strong>任务ID:</strong> {record.id}</p>
                    <p><strong>平台:</strong> {record.platform}</p>
                    <p><strong>类型:</strong> {record.type}</p>
                    <p><strong>关键词:</strong> {record.keywords}</p>
                    <p><strong>状态:</strong> {record.status}</p>
                    <p><strong>进度:</strong> {record.progress}%</p>
                    <p><strong>开始时间:</strong> {record.startTime}</p>
                    <p><strong>日志:</strong></p>
                    <pre style={{ background: '#f5f5f5', padding: '8px', maxHeight: '200px', overflow: 'auto' }}>
                      {record.logs || '暂无日志'}
                    </pre>
                  </div>
                ),
                width: 600,
              })
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          爬虫控制
        </Title>
        <p style={{ margin: '8px 0 0 0', color: '#666' }}>
          启动、停止和监控爬虫任务
        </p>
      </div>

      {/* Status Alert */}
      {crawlerStatus && (
        <Alert
          message={`爬虫状态: ${crawlerStatus.status === 'running' ? '运行中' : '已停止'}`}
          description={crawlerStatus.message}
          type={crawlerStatus.status === 'running' ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Control Panel */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="启动新任务" extra={<SettingOutlined />}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                platform: 'xhs',
                type: 'search',
                loginType: 'qrcode',
                enableComments: true,
                enableSubComments: false,
                maxCount: 200,
                saveDataOption: 'sqlite',
              }}
            >
              <Form.Item name="platform" label="选择平台" rules={[{ required: true }]}>
                <Select>
                  {platforms.map(platform => (
                    <Option key={platform.value} value={platform.value}>
                      {platform.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="type" label="爬取类型" rules={[{ required: true }]}>
                <Select>
                  {crawlerTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="keywords" label="关键词" rules={[{ required: true }]}>
                <TextArea
                  rows={3}
                  placeholder="请输入关键词，多个关键词用英文逗号分隔"
                />
              </Form.Item>

              <Form.Item name="loginType" label="登录方式">
                <Select>
                  {loginTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="enableComments" label="爬取评论" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="enableSubComments" label="爬取二级评论" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="maxCount" label="最大数量">
                <Input type="number" placeholder="最大爬取数量" />
              </Form.Item>

              <Form.Item name="saveDataOption" label="数据保存方式">
                <Select>
                  <Option value="sqlite">SQLite</Option>
                  <Option value="json">JSON文件</Option>
                  <Option value="csv">CSV文件</Option>
                  <Option value="db">MySQL数据库</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStart}
                    loading={startCrawlerMutation.isPending}
                    disabled={crawlerStatus?.status === 'running'}
                  >
                    启动爬虫
                  </Button>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={handleStop}
                    loading={stopCrawlerMutation.isPending}
                    disabled={crawlerStatus?.status !== 'running'}
                  >
                    停止爬虫
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="实时状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>当前状态:</strong>{' '}
                <Tag color={crawlerStatus?.status === 'running' ? 'green' : 'red'}>
                  {crawlerStatus?.status === 'running' ? '运行中' : '已停止'}
                </Tag>
              </div>
              <div>
                <strong>运行时间:</strong> {crawlerStatus?.uptime || '0分钟'}
              </div>
              <div>
                <strong>已爬取:</strong> {crawlerStatus?.crawledCount || 0} 条数据
              </div>
              <div>
                <strong>错误数:</strong> {crawlerStatus?.errorCount || 0}
              </div>
              <div>
                <strong>内存使用:</strong> {crawlerStatus?.memoryUsage || '0MB'}
              </div>
              <div>
                <strong>CPU使用:</strong> {crawlerStatus?.cpuUsage || '0%'}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Tasks Table */}
      <Card title="任务列表" style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={crawlerTasks}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}