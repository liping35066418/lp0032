import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Button } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import PlayerHome from '../pages/player/PlayerHome';
import ScriptList from '../pages/player/ScriptList';
import ScheduleList from '../pages/player/ScheduleList';
import MyBookings from '../pages/player/MyBookings';
import MyOrders from '../pages/player/MyOrders';
import Profile from '../pages/Profile';

const { Header, Sider, Content } = Layout;

const PlayerLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/scripts', icon: <BookOutlined />, label: '剧本库' },
    { key: '/schedules', icon: <CalendarOutlined />, label: '拼场大厅' },
    { key: '/bookings', icon: <CalendarOutlined />, label: '我的预订' },
    { key: '/orders', icon: <ShoppingCartOutlined />, label: '我的订单' },
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
          {collapsed ? '🎭' : '🎭 剧本杀'}
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
            <Route path="/" element={<PlayerHome />} />
            <Route path="/scripts" element={<ScriptList />} />
            <Route path="/schedules" element={<ScheduleList />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PlayerLayout;
