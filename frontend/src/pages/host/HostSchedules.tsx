import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Modal,
  Form,
  Input,
  InputNumber,
  Rate,
  message,
  Popconfirm,
  Avatar,
  List,
  Descriptions
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  QrcodeOutlined,
  EyeOutlined,
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/useAuthStore';
import { scheduleApi, ScheduleWithDetails, BookingWithPlayer } from '../../api/schedules';
import { bookingApi } from '../../api/bookings';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const HostSchedules: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleWithDetails | null>(null);
  const [endForm] = Form.useForm();

  useEffect(() => {
    fetchSchedules();
  }, [pagination.current, pagination.pageSize, statusFilter, dateRange]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        host_id: user?.id,
        include_bookings: true
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await scheduleApi.getList(params);
      setSchedules(response.data.list);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error: any) {
      message.error(error.message || '获取场次列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待拼场' },
      confirmed: { color: 'blue', text: '已确认' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'default', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getBookingStatusTag = (status: string) => {
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

  const handleViewDetail = async (schedule: ScheduleWithDetails) => {
    try {
      const response = await scheduleApi.getDetail(schedule.id);
      setCurrentSchedule(response.data);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取详情失败');
    }
  };

  const handleStartSchedule = async (id: number) => {
    try {
      await scheduleApi.start(id);
      message.success('场次已开始');
      fetchSchedules();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEndSchedule = (schedule: ScheduleWithDetails) => {
    setCurrentSchedule(schedule);
    endForm.resetFields();
    setEndModalVisible(true);
  };

  const handleConfirmEnd = async () => {
    try {
      const values = await endForm.validateFields();
      await scheduleApi.end(currentSchedule!.id, values);
      message.success('场次已结束');
      setEndModalVisible(false);
      fetchSchedules();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleCancelSchedule = async (id: number) => {
    try {
      await scheduleApi.cancel(id);
      message.success('场次已取消');
      fetchSchedules();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleCheckIn = async (bookingId: number) => {
    try {
      await bookingApi.checkIn(bookingId);
      message.success('核验成功');
      if (currentSchedule) {
        const response = await scheduleApi.getDetail(currentSchedule.id);
        setCurrentSchedule(response.data);
      }
    } catch (error: any) {
      message.error(error.message || '核验失败');
    }
  };

  const columns = [
    {
      title: '剧本名称',
      dataIndex: 'script_name',
      key: 'script_name',
      width: 180,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: '时间',
      key: 'time',
      width: 200,
      render: (_: any, record: ScheduleWithDetails) => (
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
      title: '人数',
      key: 'players',
      width: 100,
      render: (_: any, record: ScheduleWithDetails) => (
        <span>
          {record.current_players}/{record.max_players}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: any, record: ScheduleWithDetails) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'confirmed' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartSchedule(record.id)}
            >
              开始
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleEndSchedule(record)}
            >
              结束
            </Button>
          )}
          {(record.status === 'pending' || record.status === 'confirmed') && (
            <Popconfirm
              title="确认取消该场次？"
              description="取消后相关预订将自动退款"
              onConfirm={() => handleCancelSchedule(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
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
        title="我的场次"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchSchedules}
          >
            刷新
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="状态筛选"
            style={{ width: 140 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="pending">待拼场</Option>
            <Option value="confirmed">已确认</Option>
            <Option value="in_progress">进行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />
        </Space>

        <Table
          loading={loading}
          columns={columns}
          dataSource={schedules}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize }))
          }}
        />
      </Card>

      <Modal
        title="场次详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {currentSchedule && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="剧本名称">{currentSchedule.script_name}</Descriptions.Item>
              <Descriptions.Item label="类型">{currentSchedule.script_category}</Descriptions.Item>
              <Descriptions.Item label="时间">
                {dayjs(currentSchedule.start_time).format('YYYY-MM-DD HH:mm')} - {dayjs(currentSchedule.end_time).format('HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="房间">{currentSchedule.room_name}</Descriptions.Item>
              <Descriptions.Item label="主持人">{currentSchedule.host_name}</Descriptions.Item>
              <Descriptions.Item label="人数">
                {currentSchedule.current_players}/{currentSchedule.max_players}人
              </Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(currentSchedule.status)}</Descriptions.Item>
            </Descriptions>

            <Card
              title="预订列表"
              size="small"
              style={{ marginTop: 16 }}
              bodyStyle={{ padding: 0 }}
            >
              {currentSchedule.bookings && currentSchedule.bookings.length > 0 ? (
                <List
                  dataSource={currentSchedule.bookings}
                  renderItem={(booking: BookingWithPlayer) => (
                    <List.Item
                      key={booking.id}
                      actions={[
                        booking.status === 'confirmed' && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<QrcodeOutlined />}
                            onClick={() => handleCheckIn(booking.id)}
                          >
                            核验
                          </Button>
                        )
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} src={booking.player_avatar} />}
                        title={
                          <Space>
                            <span>{booking.player_name}</span>
                            {getBookingStatusTag(booking.status)}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={0}>
                            <span>联系电话: {booking.player_phone}</span>
                            <span>预订人数: {booking.player_count}人</span>
                            {booking.player_names && <span>同行玩家: {booking.player_names}</span>}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                  暂无预订
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="结束场次"
        open={endModalVisible}
        onOk={handleConfirmEnd}
        onCancel={() => setEndModalVisible(false)}
        okText="确认结束"
        cancelText="取消"
      >
        <Form form={endForm} layout="vertical">
          <Form.Item
            name="actual_players"
            label="实际到场人数"
            rules={[{ required: true, message: '请输入实际到场人数' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="host_rating"
            label="本场表现自评"
          >
            <Rate allowHalf />
          </Form.Item>
          <Form.Item
            name="host_comment"
            label="主持人备注"
          >
            <TextArea rows={4} placeholder="记录本场次的情况、玩家反馈等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HostSchedules;
