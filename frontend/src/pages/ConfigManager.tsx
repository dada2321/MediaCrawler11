import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Select,
  InputNumber,
  Space,
  Typography,
  Row,
  Col,
  message,
  Tabs,
  Upload,
  Alert,
} from 'antd'
import {
  SaveOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfig, updateConfig, importConfig, exportConfig } from '../services/api'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

export default function ConfigManager() {
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('basic')
  const queryClient = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  })

  const updateConfigMutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      message.success('配置更新成功')
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.message}`)
    },
  })

  const exportConfigMutation = useMutation({
    mutationFn: exportConfig,
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'mediacrawler_config.json')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      message.success('配置导出成功')
    },
  })

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      updateConfigMutation.mutate(values)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleReset = () => {
    form.resetFields()
    if (config) {
      form.setFieldsValue(config)
    }
  }

  const handleExport = () => {
    exportConfigMutation.mutate()
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string)
        form.setFieldsValue(importedConfig)
        message.success('配置导入成功')
      } catch (error) {
        message.error('配置文件格式错误')
      }
    }
    reader.readAsText(file)
    return false // Prevent upload
  }

  // Set form values when config is loaded
  if (config && !form.getFieldValue('platform')) {
    form.setFieldsValue(config)
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          配置管理
        </Title>
        <p style={{ margin: '8px 0 0 0', color: '#666' }}>
          管理爬虫的各项配置参数
        </p>
      </div>

      <Card>
        <Space style={{ marginBottom: 24 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={updateConfigMutation.isPending}
          >
            保存配置
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exportConfigMutation.isPending}
          >
            导出配置
          </Button>
          <Upload
            beforeUpload={handleImport}
            showUploadList={false}
            accept=".json"
          >
            <Button icon={<UploadOutlined />}>
              导入配置
            </Button>
          </Upload>
        </Space>

        <Form
          form={form}
          layout="vertical"
          loading={isLoading}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="基础配置" key="basic">
              <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="platform" label="默认平台">
                    <Select placeholder="选择默认平台">
                      <Option value="xhs">小红书</Option>
                      <Option value="dy">抖音</Option>
                      <Option value="ks">快手</Option>
                      <Option value="bili">B站</Option>
                      <Option value="wb">微博</Option>
                      <Option value="tieba">贴吧</Option>
                      <Option value="zhihu">知乎</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="crawlerType" label="默认爬取类型">
                    <Select placeholder="选择爬取类型">
                      <Option value="search">关键词搜索</Option>
                      <Option value="detail">帖子详情</Option>
                      <Option value="creator">创作者主页</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="keywords" label="默认关键词">
                    <TextArea
                      rows={3}
                      placeholder="输入默认关键词，多个关键词用英文逗号分隔"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="loginType" label="默认登录方式">
                    <Select placeholder="选择登录方式">
                      <Option value="qrcode">二维码登录</Option>
                      <Option value="phone">手机号登录</Option>
                      <Option value="cookie">Cookie登录</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="saveDataOption" label="数据保存方式">
                    <Select placeholder="选择保存方式">
                      <Option value="sqlite">SQLite数据库</Option>
                      <Option value="json">JSON文件</Option>
                      <Option value="csv">CSV文件</Option>
                      <Option value="db">MySQL数据库</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="爬取配置" key="crawler">
              <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="startPage" label="起始页码">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxNotesCount" label="最大帖子数量">
                    <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxConcurrency" label="并发数量">
                    <InputNumber min={1} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxSleepSec" label="爬取间隔(秒)">
                    <InputNumber min={0} max={60} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="enableComments" label="爬取评论" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="enableSubComments" label="爬取二级评论" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="enableMedia" label="下载媒体文件" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxCommentsCount" label="最大评论数(单帖)">
                    <InputNumber min={0} max={1000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="enableWordcloud" label="生成词云" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="浏览器配置" key="browser">
              <Alert
                message="浏览器配置"
                description="这些设置会影响爬虫的运行方式和反检测能力"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="headless" label="无头模式" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="saveLoginState" label="保存登录状态" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="enableCdpMode" label="启用CDP模式" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="cdpDebugPort" label="CDP调试端口">
                    <InputNumber min={1000} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="customBrowserPath" label="自定义浏览器路径">
                    <Input placeholder="留空则自动检测浏览器路径" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="browserLaunchTimeout" label="浏览器启动超时(秒)">
                    <InputNumber min={10} max={300} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="autoCloseBrowser" label="自动关闭浏览器" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="代理配置" key="proxy">
              <Alert
                message="IP代理配置"
                description="启用代理可以提高爬取成功率，避免IP被封"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="enableIpProxy" label="启用IP代理" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="ipProxyPoolCount" label="代理池数量">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="ipProxyProvider" label="代理提供商">
                    <Select placeholder="选择代理提供商">
                      <Option value="kuaidaili">快代理</Option>
                      <Option value="wandouhttp">豌豆HTTP</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="数据库配置" key="database">
              <Alert
                message="数据库配置"
                description="MySQL数据库配置，仅在选择MySQL作为保存方式时生效"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="dbHost" label="数据库主机">
                    <Input placeholder="localhost" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="dbPort" label="数据库端口">
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="dbUser" label="用户名">
                    <Input placeholder="root" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="dbPassword" label="密码">
                    <Input.Password placeholder="数据库密码" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="dbName" label="数据库名">
                    <Input placeholder="mediacrawler" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Form>
      </Card>
    </div>
  )
}