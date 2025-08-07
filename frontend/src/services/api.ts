import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

// Dashboard APIs
export const getStats = () => api.get('/stats')
export const getPlatformData = () => api.get('/stats/platform')
export const getRecentActivity = () => api.get('/stats/activity')

// Crawler APIs
export const getCrawlerStatus = () => api.get('/crawler/status')
export const getCrawlerTasks = () => api.get('/crawler/tasks')
export const startCrawler = (params: any) => api.post('/crawler/start', params)
export const stopCrawler = () => api.post('/crawler/stop')

// Data APIs
export interface GetPostsParams {
  platform?: string
  keyword?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export const getPosts = (params: GetPostsParams) => api.get('/data/posts', { params })
export const getComments = (postId: string) => api.get(`/data/posts/${postId}/comments`)

export interface ExportDataParams {
  platform?: string
  keyword?: string
  startDate?: string
  endDate?: string
  postIds?: string[]
  format?: 'csv' | 'json' | 'xlsx'
}

export const exportData = (params: ExportDataParams) => 
  api.post('/data/export', params, { responseType: 'blob' })

// Config APIs
export const getConfig = () => api.get('/config')
export const updateConfig = (config: any) => api.put('/config', config)
export const exportConfig = () => api.get('/config/export')
export const importConfig = (config: any) => api.post('/config/import', config)

export default api