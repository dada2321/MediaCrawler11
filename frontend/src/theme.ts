import { theme as antdTheme, type ThemeConfig } from 'antd'

// 全局 Ant Design 主题配置，保证颜色、圆角、字体等统一
const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff', // 主品牌色
    colorInfo: '#1677ff',
    borderRadius: 6,
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`,
    wireframe: false,
  },
  algorithm: antdTheme.defaultAlgorithm,
}

export default theme;