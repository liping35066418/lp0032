import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Typography,
  Spin,
  Empty,
  Button
} from 'antd';
import {
  UserOutlined,
  BookOutlined,
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  UserAddOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { statisticsApi, ordersApi, OverviewData, DailyData } from '../../api';
import { statusMap, orderTypeMap, Order, OrderStatus } from '../../types';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [recentOrders, setRecentOrders] = useState<(Order & { user_name?: string; script_name?: string })[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, dailyRes, ordersRes] = await Promise.all([
        statisticsApi.getOverview(),
        statisticsApi.getDaily(),
        ordersApi.getList({ page: 1, pageSize: 5 })
      ]);
      setOverview(overviewRes.data);
      setDailyData(dailyRes.data);
      setRecentOrders(ordersRes.data.list);
    } catch (error: any) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = overview ? [
    { title: '总用户', value: overview.totalUsers, icon: <UserOutlined />, color: '#1890ff' },
    { title: '总剧本', value: overview.totalScripts, icon: <BookOutlined />, color: '#722ed1' },
    { title: '可用房间', value: overview.totalRooms, icon: <HomeOutlined />, color: '#13c2c2' },
    { title: '主持人', value: overview.totalHosts, icon: <TeamOutlined />, color: '#fa8c16' },
    { title: '总营收', value: overview.totalRevenue, prefix: '¥', icon: <DollarOutlined />, color: '#52c41a' },
    { title: '总订单', value: overview.totalOrders, icon: <ShoppingOutlined />, color: '#eb2f96' },
    { title: '完成场次', value: overview.completedSchedules, icon: <CalendarOutlined />, color: '#faad14' },
    { title: '服务玩家', value: overview.totalPlayers, icon: <UserAddOutlined />, color: '#2f54eb' }
  ] : [];

  const scheduleColumns = [
    {
      title: '剧本',
      dataIndex: 'script_name',
      key: 'script_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '时间',
      key: 'time',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(record.start_time).format('HH:mm')}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(record.end_time).format('HH:mm')} 结束
          </Text>
        </Space>
      )
    },
    {
      title: '房间',
      dataIndex: 'room_name',
      key: 'room_name'
    },
    {
      title: '主持人',
      dataIndex: 'host_name',
      key: 'host_name'
    },
    {
      title: '玩家',
      key: 'players',
      render: (_: any, record: any) => (
        <Text>{record.player_count} 人</Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    }
  ];

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      render: (text: string) => <Text code>{text}</Text>
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => orderTypeMap[type] || type
    },
    {
      title: '剧本',
      dataIndex: 'script_name',
      key: 'script_name'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <Text strong style={{ color: '#f5222d' }}>¥{amount.toFixed(2)}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => {
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => dayjs(time).format('MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          🎭 数据概览
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadData}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {statCards.map((card, index) => (
            <Col xs={12} sm={8} md={6} key={index}>
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Space>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${card.color}15`,
                      color: card.color,
                      fontSize: 24
                    }}
                  >
                    {card.icon}
                  </div>
                  <Statistic
                    title={card.title}
                    value={card.value}
                    prefix={card.prefix}
                    valueStyle={{ color: card.color }}
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={`📅 今日场次 (${dayjs().format('YYYY-MM-DD')})`}
              bordered={false}
              extra={dailyData ? (
                <Space>
                  <Text type="secondary">营收: <Text strong style={{ color: '#f5222d' }}>¥{dailyData.totalRevenue.toFixed(2)}</Text></Text>
                  <Text type="secondary">玩家: <Text strong>{dailyData.totalPlayers} 人</Text></Text>
                </Space>
              ) : null}
            >
              {dailyData?.schedules && dailyData.schedules.length > 0 ? (
                <Table
                  dataSource={dailyData.schedules}
                  columns={scheduleColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty description="今日暂无场次" />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="💰 最近订单"
              bordered={false}
            >
              {recentOrders.length > 0 ? (
                <Table
                  dataSource={recentOrders}
                  columns={orderColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty description="暂无订单" />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;
