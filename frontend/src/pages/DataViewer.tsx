import { useState } from 'react'
import {
  Card,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Modal,
  message,
  DatePicker,
  Drawer,
  Image,
  Tooltip,
} from 'antd'
import DataTable from '../components/DataTable'
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getPosts, getComments, exportData } from '../services/api'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select
const { Search } = Input
const { RangePicker } = DatePicker

const platforms = [
  { value: 'all', label: '全部平台' },
  { value: 'xhs', label: '小红书', color: 'red' },
  { value: 'dy', label: '抖音', color: 'blue' },
  { value: 'ks', label: '快手', color: 'orange' },
  { value: 'bili', label: 'B站', color: 'cyan' },
  { value: 'wb', label: '微博', color: 'volcano' },
  { value: 'tieba', label: '贴吧', color: 'purple' },
  { value: 'zhihu', label: '知乎', color: 'geekblue' },
]

export default function DataViewer() {
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [commentsVisible, setCommentsVisible] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['posts', selectedPlatform, searchKeyword, dateRange],
    queryFn: () => getPosts({
      platform: selectedPlatform,
      keyword: searchKeyword,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
  })

  const { data: comments } = useQuery({
    queryKey: ['comments', selectedPost?.id],
    queryFn: () => getComments(selectedPost?.id),
    enabled: !!selectedPost?.id,
  })

  const exportMutation = useMutation({
    mutationFn: exportData,
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `mediacrawler_data_${dayjs().format('YYYY-MM-DD')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      message.success('数据导出成功')
    },
    onError: (error: any) => {
      message.error(`导出失败: ${error.message}`)
    },
  })

  const handleExport = () => {
    exportMutation.mutate({
      platform: selectedPlatform,
      keyword: searchKeyword,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      postIds: selectedRowKeys,
    })
  }

  const showPostDetail = (record: any) => {
    setSelectedPost(record)
    setDrawerVisible(true)
  }

  const showComments = (record: any) => {
    setSelectedPost(record)
    setCommentsVisible(true)
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      ellipsis: true,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 80,
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => (
        <Tooltip title={title}>
          <span>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
      ellipsis: true,
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: 120,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '点赞数',
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 80,
      sorter: (a: any, b: any) => a.likeCount - b.likeCount,
    },
    {
      title: '评论数',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 80,
      sorter: (a: any, b: any) => a.commentCount - b.commentCount,
    },
    {
      title: '浏览数',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 80,
      sorter: (a: any, b: any) => a.viewCount - b.viewCount,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showPostDetail(record)}
          >
            详情
          </Button>
          <Button
            size="small"
            onClick={() => showComments(record)}
            disabled={!record.commentCount}
          >
            评论
          </Button>
        </Space>
      ),
    },
  ]

  const commentColumns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '点赞',
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 80,
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: string[]) => {
      setSelectedRowKeys(selectedRowKeys)
    },
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          数据管理
        </Title>
        <p style={{ margin: '8px 0 0 0', color: '#666' }}>
          查看、搜索和导出爬取的数据
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              style={{ width: '100%' }}
              placeholder="选择平台"
            >
              {platforms.map(platform => (
                <Option key={platform.value} value={platform.value}>
                  {platform.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="搜索关键词"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={() => refetch()}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exportMutation.isPending}
                disabled={selectedRowKeys.length === 0}
              >
                导出
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Data Table */}
      <Card className="data-table">
        <DataTable
          columns={columns}
          dataSource={posts}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Post Detail Drawer */}
      <Drawer
        title="帖子详情"
        placement="right"
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedPost && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>标题:</strong> {selectedPost.title}
              </div>
              <div>
                <strong>作者:</strong> {selectedPost.author}
              </div>
              <div>
                <strong>平台:</strong>{' '}
                <Tag color={platforms.find(p => p.value === selectedPost.platform)?.color}>
                  {platforms.find(p => p.value === selectedPost.platform)?.label}
                </Tag>
              </div>
              <div>
                <strong>发布时间:</strong> {dayjs(selectedPost.publishTime).format('YYYY-MM-DD HH:mm:ss')}
              </div>
              <div>
                <strong>互动数据:</strong>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={8}>点赞: {selectedPost.likeCount}</Col>
                  <Col span={8}>评论: {selectedPost.commentCount}</Col>
                  <Col span={8}>浏览: {selectedPost.viewCount}</Col>
                </Row>
              </div>
              <div>
                <strong>内容:</strong>
                <div style={{ 
                  marginTop: 8, 
                  padding: 12, 
                  background: '#f5f5f5', 
                  borderRadius: 4,
                  maxHeight: 200,
                  overflow: 'auto'
                }}>
                  {selectedPost.content}
                </div>
              </div>
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div>
                  <strong>图片:</strong>
                  <div style={{ marginTop: 8 }}>
                    <Image.PreviewGroup>
                      {selectedPost.images.map((img: string, index: number) => (
                        <Image
                          key={index}
                          width={100}
                          height={100}
                          src={img}
                          style={{ margin: 4, objectFit: 'cover' }}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                </div>
              )}
              <div>
                <strong>链接:</strong>{' '}
                <a href={selectedPost.url} target="_blank" rel="noopener noreferrer">
                  查看原文
                </a>
              </div>
            </Space>
          </div>
        )}
      </Drawer>

      {/* Comments Modal */}
      <Modal
        title={`评论列表 - ${selectedPost?.title}`}
        open={commentsVisible}
        onCancel={() => setCommentsVisible(false)}
        width={800}
        footer={null}
      >
        <DataTable
          columns={commentColumns}
          dataSource={comments}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      </Modal>
    </div>
  )
}