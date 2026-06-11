import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import HostLayout from './layouts/HostLayout';
import PlayerLayout from './layouts/PlayerLayout';

const App: React.FC = () => {
  const { isLoading, isAuthenticated, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const getLayout = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminLayout />;
      case 'host':
        return <HostLayout />;
      case 'player':
        return <PlayerLayout />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/*" element={getLayout()} />
    </Routes>
  );
};

export default App;
