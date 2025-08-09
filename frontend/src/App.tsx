import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import Sidebar from './components/Sidebar'
import HeaderBar from './components/HeaderBar'
import Dashboard from './pages/Dashboard'
import CrawlerControl from './pages/CrawlerControl'
import DataViewer from './pages/DataViewer'
import ConfigManager from './pages/ConfigManager'
import Analytics from './pages/Analytics'
import './App.css'

const { Content } = Layout

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <HeaderBar />
        <Content style={{ padding: '24px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crawler" element={<CrawlerControl />} />
            <Route path="/data" element={<DataViewer />} />
            <Route path="/config" element={<ConfigManager />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App