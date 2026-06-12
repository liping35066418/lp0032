import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Button } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import Dashboard from '../pages/admin/Dashboard';
import ScriptManagement from '../pages/admin/ScriptManagement';
import CategoryManagement from '../pages/admin/CategoryManagement';
import ScheduleManagement from '../pages/admin/ScheduleManagement';
import RoomManagement from '../pages/admin/RoomManagement';
import UserManagement from '../pages/admin/UserManagement';
import OrderManagement from '../pages/admin/OrderManagement';
import DrinkManagement from '../pages/admin/DrinkManagement';
import Statistics from '../pages/admin/Statistics';
import Profile from '../pages/Profile';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '数据概览' },
    { key: '/scripts', icon: <BookOutlined />, label: '剧本管理' },
    { key: '/categories', icon: <FolderOutlined />, label: '分类管理' },
    { key: '/schedules', icon: <CalendarOutlined />, label: '场次管理' },
    { key: '/rooms', icon: <SettingOutlined />, label: '房间管理' },
    { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/orders', icon: <ShoppingOutlined />, label: '订单管理' },
    { key: '/drinks', icon: <ShoppingOutlined />, label: '饮品管理' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
    { key: '/profile', icon: <UserOutlined />, label: '个人中心' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout }
    ]
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
          background: 'rgba(255,255,255,0.1)'
        }}>
          {collapsed ? '🎭' : '🎭 剧本杀管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <span style={{ color: '#8c8c8c' }}>欢迎，店长</span>
            <Dropdown menu={userMenu}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} src={user?.avatar} />
                <span>{user?.name}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scripts" element={<ScriptManagement />} />
            <Route path="/categories" element={<CategoryManagement />} />
            <Route path="/schedules" element={<ScheduleManagement />} />
            <Route path="/rooms" element={<RoomManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/drinks" element={<DrinkManagement />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
