import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Button, Space, Calendar, Badge, message } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/useAuthStore';
import { statisticsApi, DailySchedule } from '../../api/statistics';
import { scheduleApi } from '../../api/schedules';

const HostDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [todaySchedules, setTodaySchedules] = useState<DailySchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  useEffect(() => {
    fetchDailyStats();
  }, [selectedDate]);

  const fetchDailyStats = async () => {
    setLoading(true);
    try {
      const response = await statisticsApi.getDaily({
        date: selectedDate.format('YYYY-MM-DD')
      });
      setDailyStats(response.data);
      const mySchedules = response.data.schedules.filter(
        (s: DailySchedule) => s.host_id === user?.id
      );
      setTodaySchedules(mySchedules);
    } catch (error: any) {
      message.error(error.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待确认' },
      confirmed: { color: 'blue', text: '已确认' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'default', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleStartSchedule = async (id: number) => {
    try {
      await scheduleApi.start(id);
      message.success('场次已开始');
      fetchDailyStats();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEndSchedule = async (id: number) => {
    try {
      await scheduleApi.end(id);
      message.success('场次已结束');
      fetchDailyStats();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const getDateCellContent = (value: dayjs.Dayjs) => {
    const isToday = value.isSame(dayjs(), 'day');
    const isSelected = value.isSame(selectedDate, 'day');
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4px 0',
          borderRadius: '4px',
          background: isSelected ? '#1890ff' : isToday ? '#e6f7ff' : 'transparent',
          color: isSelected ? '#fff' : isToday ? '#1890ff' : 'inherit',
          cursor: 'pointer'
        }}
      >
        {value.date()}
      </div>
    );
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="今日场次"
              value={todaySchedules.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="进行中"
              value={todaySchedules.filter(s => s.status === 'in_progress').length}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="已完成"
              value={todaySchedules.filter(s => s.status === 'completed').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="今日服务玩家"
              value={todaySchedules.reduce((sum, s) => sum + s.player_count, 0)}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title={`${selectedDate.format('YYYY年MM月DD日')} 我的场次`}
            extra={
              <Button type="primary" onClick={() => navigate('/schedules')}>
                查看全部场次
              </Button>
            }
            loading={loading}
          >
            {todaySchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <CalendarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>今日暂无场次安排</p>
              </div>
            ) : (
              <List
                dataSource={todaySchedules}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    actions={[
                      item.status === 'confirmed' && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleStartSchedule(item.id)}
                        >
                          开始
                        </Button>
                      ),
                      item.status === 'in_progress' && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleEndSchedule(item.id)}
                        >
                          结束
                        </Button>
                      )
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge
                          status={
                            item.status === 'in_progress' ? 'processing' :
                            item.status === 'completed' ? 'success' :
                            item.status === 'cancelled' ? 'default' : 'warning'
                          }
                        />
                      }
                      title={
                        <Space>
                          <span style={{ fontWeight: 500 }}>{item.script_name}</span>
                          {getStatusTag(item.status)}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Space>
                            <ClockCircleOutlined />
                            <span>{dayjs(item.start_time).format('HH:mm')} - {dayjs(item.end_time).format('HH:mm')}</span>
                          </Space>
                          <Space>
                            <TeamOutlined />
                            <span>{item.room_name} · {item.player_count}/{item.max_players} 人</span>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="快速操作">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                type="primary"
                block
                size="large"
                icon={<CalendarOutlined />}
                onClick={() => navigate('/schedules')}
              >
                管理我的场次
              </Button>
              <Button
                block
                size="large"
                icon={<UserOutlined />}
                onClick={() => navigate('/profile')}
              >
                个人信息设置
              </Button>
            </Space>

            <Card
              title="日历"
              style={{ marginTop: 16 }}
              bodyStyle={{ padding: 0 }}
            >
              <Calendar
                fullscreen={false}
                onSelect={(date) => setSelectedDate(date)}
                dateCellRender={getDateCellContent}
                headerRender={({ value, onChange }) => (
                  <div style={{ padding: 8, textAlign: 'center' }}>
                    <Space>
                      <Button size="small" onClick={() => onChange(value.subtract(1, 'month'))}>上一月</Button>
                      <span style={{ fontWeight: 500 }}>
                        {value.format('YYYY年MM月')}
                      </span>
                      <Button size="small" onClick={() => onChange(value.add(1, 'month'))}>下一月</Button>
                    </Space>
                  </div>
                )}
              />
            </Card>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HostDashboard;
