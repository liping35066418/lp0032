import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  message,
  Popconfirm,
  Descriptions,
  Empty,
  Pagination
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CloseOutlined,
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { bookingApi, BookingWithDetails } from '../../api/bookings';

const { Option } = Select;

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<BookingWithDetails | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [pagination.current, pagination.pageSize, statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };
      if (statusFilter) params.status = statusFilter;

      const response = await bookingApi.getMyBookings(params);
      setBookings(response.data.list);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error: any) {
      message.error(error.message || '获取预订列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待确认' },
      confirmed: { color: 'blue', text: '已确认' },
      checked_in: { color: 'processing', text: '已核验' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'default', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getDifficultyTag = (difficulty: string) => {
    const difficultyMap: Record<string, { color: string; text: string }> = {
      easy: { color: 'green', text: '新手友好' },
      medium: { color: 'blue', text: '中等难度' },
      hard: { color: 'orange', text: '烧脑进阶' },
      nightmare: { color: 'red', text: '噩梦难度' }
    };
    const config = difficultyMap[difficulty] || { color: 'default', text: difficulty };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleViewDetail = async (booking: BookingWithDetails) => {
    try {
      const response = await bookingApi.getDetail(booking.id);
      setCurrentBooking(response.data);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取详情失败');
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      await bookingApi.cancel(id);
      message.success('取消成功，费用已原路退回');
      fetchBookings();
    } catch (error: any) {
      message.error(error.message || '取消失败');
    }
  };

  const canCancel = (booking: BookingWithDetails) => {
    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'checked_in') {
      return false;
    }
    if (booking.schedule_status === 'in_progress' || booking.schedule_status === 'completed') {
      return false;
    }
    return true;
  };

  const columns = [
    {
      title: '剧本名称',
      dataIndex: 'script_name',
      key: 'script_name',
      width: 150,
      render: (text: string, record: BookingWithDetails) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 11 }}>{record.category}</Tag>
            {record.difficulty && getDifficultyTag(record.difficulty)}
          </div>
        </div>
      )
    },
    {
      title: '时间',
      key: 'time',
      width: 180,
      render: (_: any, record: BookingWithDetails) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(record.start_time).format('YYYY-MM-DD')}</span>
          <span style={{ color: '#888' }}>
            {dayjs(record.start_time).format('HH:mm')} - {dayjs(record.end_time).format('HH:mm')}
          </span>
        </Space>
      )
    },
    {
      title: '房间',
      dataIndex: 'room_name',
      key: 'room_name',
      width: 100
    },
    {
      title: '主持人',
      dataIndex: 'host_name',
      key: 'host_name',
      width: 100
    },
    {
      title: '预订人数',
      dataIndex: 'player_count',
      key: 'player_count',
      width: 100,
      render: (count: number) => `${count}人`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '预订时间',
      key: 'booked_at',
      width: 160,
      render: (_: any, record: BookingWithDetails) => (
        <span style={{ color: '#888' }}>
          {dayjs(record.booked_at).format('YYYY-MM-DD HH:mm')}
        </span>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: BookingWithDetails) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {canCancel(record) && (
            <Popconfirm
              title="确认取消该预订？"
              description="取消后费用将原路退回"
              onConfirm={() => handleCancelBooking(record.id)}
              okText="确认"
              cancelText="再想想"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
              >
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title="我的预订"
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              style={{ width: 140 }}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="pending">待确认</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="checked_in">已核验</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchBookings}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={bookings}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="暂无预订记录" /> }}
        />

        {bookings.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
              onChange={(page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total })}
            />
          </div>
        )}
      </Card>

      <Modal
        title="预订详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {currentBooking && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="剧本名称">{currentBooking.script_name}</Descriptions.Item>
                <Descriptions.Item label="类型">
                  <Tag color="blue">{currentBooking.category}</Tag>
                  {currentBooking.difficulty && getDifficultyTag(currentBooking.difficulty)}
                </Descriptions.Item>
                <Descriptions.Item label="时间">
                  {dayjs(currentBooking.start_time).format('YYYY-MM-DD HH:mm')} - {dayjs(currentBooking.end_time).format('HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="房间">{currentBooking.room_name}</Descriptions.Item>
                <Descriptions.Item label="主持人">{currentBooking.host_name}</Descriptions.Item>
                <Descriptions.Item label="状态">{getStatusTag(currentBooking.status)}</Descriptions.Item>
                <Descriptions.Item label="预订人数">{currentBooking.player_count}人</Descriptions.Item>
                <Descriptions.Item label="单价">
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{currentBooking.base_price}/人</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {currentBooking.player_names && (
              <Card title="同行玩家" size="small" style={{ marginBottom: 16 }}>
                <p style={{ margin: 0 }}>{currentBooking.player_names}</p>
              </Card>
            )}

            <Card size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="预订时间">
                  {dayjs(currentBooking.booked_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                {currentBooking.checked_in_at && (
                  <Descriptions.Item label="核验时间">
                    {dayjs(currentBooking.checked_in_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="订单金额">
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 16 }}>
                    ¥{currentBooking.player_count * (currentBooking.base_price || 0)}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
                {currentBooking.status !== 'cancelled' && currentBooking.status !== 'completed' && (
                  <Button
                    type="primary"
                    onClick={() => navigate('/orders')}
                  >
                    查看订单
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyBookings;
