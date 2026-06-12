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
  Descriptions,
  Row,
  Col,
  Divider,
  Empty,
  Typography
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
  EnvironmentOutlined,
  CoffeeOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/useAuthStore';
import { scheduleApi, ScheduleWithDetails, BookingWithPlayer, BookingDrinks } from '../../api/schedules';
import { bookingApi } from '../../api/bookings';
import { drinkApi, Drink } from '../../api/drinks';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const { Title, Text } = Typography;

interface SelectedDrink {
  drink_id: number;
  drink_name: string;
  price: number;
  quantity: number;
}

interface BookingDrinkSelection {
  [bookingId: number]: SelectedDrink[];
}

const HostSchedules: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [drinkModalVisible, setDrinkModalVisible] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<number | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [drinkLoading, setDrinkLoading] = useState(false);
  const [bookingDrinks, setBookingDrinks] = useState<BookingDrinkSelection>({});
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

  const handleEndSchedule = async (schedule: ScheduleWithDetails) => {
    setCurrentSchedule(schedule);
    endForm.resetFields();
    setBookingDrinks({});
    setEndModalVisible(true);
    await loadDrinks();
  };

  const loadDrinks = async () => {
    setDrinkLoading(true);
    try {
      const response = await drinkApi.getList({ status: 'active', pageSize: 100 });
      setDrinks(response.data.list);
    } catch (error: any) {
      message.error(error.message || '加载饮品列表失败');
    } finally {
      setDrinkLoading(false);
    }
  };

  const handleAddDrink = (bookingId: number) => {
    setCurrentBookingId(bookingId);
    setDrinkModalVisible(true);
  };

  const handleSelectDrink = (drink: Drink) => {
    if (!currentBookingId) return;
    
    if (drink.stock <= 0) {
      message.warning('该饮品库存不足');
      return;
    }

    setBookingDrinks(prev => {
      const current = prev[currentBookingId!] || [];
      const existing = current.find(d => d.drink_id === drink.id);
      
      if (existing) {
        if (existing.quantity >= drink.stock) {
          message.warning('已达库存上限');
          return prev;
        }
        return {
          ...prev,
          [currentBookingId!]: current.map(d =>
            d.drink_id === drink.id ? { ...d, quantity: d.quantity + 1 } : d
          )
        };
      } else {
        return {
          ...prev,
          [currentBookingId!]: [...current, {
            drink_id: drink.id,
            drink_name: drink.name,
            price: drink.price,
            quantity: 1
          }]
        };
      }
    });
  };

  const handleUpdateDrinkQuantity = (bookingId: number, drinkId: number, quantity: number) => {
    const drink = drinks.find(d => d.id === drinkId);
    if (drink && quantity > drink.stock) {
      message.warning('超出库存数量');
      return;
    }

    setBookingDrinks(prev => {
      const current = prev[bookingId] || [];
      if (quantity <= 0) {
        return {
          ...prev,
          [bookingId]: current.filter(d => d.drink_id !== drinkId)
        };
      }
      return {
        ...prev,
        [bookingId]: current.map(d =>
          d.drink_id === drinkId ? { ...d, quantity } : d
        )
      };
    });
  };

  const handleRemoveDrink = (bookingId: number, drinkId: number) => {
    setBookingDrinks(prev => ({
      ...prev,
      [bookingId]: (prev[bookingId] || []).filter(d => d.drink_id !== drinkId)
    }));
  };

  const getBookingDrinkTotal = (bookingId: number): number => {
    const items = bookingDrinks[bookingId] || [];
    return items.reduce((sum: number, item: SelectedDrink) => sum + item.price * item.quantity, 0);
  };

  const getTotalDrinkAmount = () => {
    return Object.values(bookingDrinks).reduce((total: number, items: SelectedDrink[]) => {
      return total + items.reduce((sum: number, item: SelectedDrink) => sum + item.price * item.quantity, 0);
    }, 0);
  };

  const getCheckedInBookings = () => {
    if (!currentSchedule?.bookings) return [];
    return currentSchedule.bookings.filter(b => 
      b.status === 'checked_in' || b.status === 'confirmed'
    );
  };

  const buildBookingDrinksPayload = (): BookingDrinks[] => {
    return Object.entries(bookingDrinks)
      .filter(([_, items]) => items.length > 0)
      .map(([bookingId, items]: [string, SelectedDrink[]]) => ({
        booking_id: parseInt(bookingId),
        drinks: items.map((item: SelectedDrink) => ({
          drink_id: item.drink_id,
          quantity: item.quantity
        }))
      }));
  };

  const handleConfirmEnd = async () => {
    try {
      const values = await endForm.validateFields();
      const bookingDrinksPayload = buildBookingDrinksPayload();
      
      await scheduleApi.end(currentSchedule!.id, {
        ...values,
        booking_drinks: bookingDrinksPayload.length > 0 ? bookingDrinksPayload : undefined
      });
      
      message.success('场次已结束，结算完成');
      setEndModalVisible(false);
      setDrinkModalVisible(false);
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
        title="结束场次 & 结算"
        open={endModalVisible}
        onOk={handleConfirmEnd}
        onCancel={() => setEndModalVisible(false)}
        okText="确认结束并结算"
        cancelText="取消"
        width={720}
        okButtonProps={{ danger: true }}
      >
        <Form form={endForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="actual_players"
                label="实际到场人数"
                rules={[{ required: true, message: '请输入实际到场人数' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="host_rating"
                label="本场表现自评"
              >
                <Rate allowHalf />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="host_comment"
            label="主持人备注"
          >
            <TextArea rows={3} placeholder="记录本场次的情况、玩家反馈等" />
          </Form.Item>
        </Form>

        <Divider style={{ margin: '12px 0' }} />

        <div>
          <Text strong style={{ fontSize: 15 }}>
            <CoffeeOutlined style={{ marginRight: 8 }} />
            饮品选购（按玩家）
          </Text>
          
          {getCheckedInBookings().length === 0 ? (
            <Empty description="暂无已核验玩家" style={{ padding: '20px 0' }} />
          ) : (
            <div style={{ marginTop: 12 }}>
              {getCheckedInBookings().map(booking => (
                <Card
                  key={booking.id}
                  size="small"
                  style={{ marginBottom: 12 }}
                  bodyStyle={{ padding: 12 }}
                  extra={
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddDrink(booking.id)}
                    >
                      添加饮品
                    </Button>
                  }
                  title={
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} src={booking.player_avatar} />
                      <span>{booking.player_name}</span>
                      <Tag color="blue">{booking.player_count}人</Tag>
                    </Space>
                  }
                >
                  {bookingDrinks[booking.id] && bookingDrinks[booking.id].length > 0 ? (
                    <div>
                      {bookingDrinks[booking.id].map(item => (
                        <Row key={item.drink_id} align="middle" style={{ marginBottom: 8 }}>
                          <Col span={10}>
                            <Text>{item.drink_name}</Text>
                          </Col>
                          <Col span={6} style={{ textAlign: 'center' }}>
                            <Space size="small">
                              <Button
                                size="small"
                                shape="circle"
                                icon={<MinusOutlined />}
                                onClick={() => handleUpdateDrinkQuantity(booking.id, item.drink_id, item.quantity - 1)}
                              />
                              <InputNumber
                                size="small"
                                min={1}
                                value={item.quantity}
                                style={{ width: 50, textAlign: 'center' }}
                                onChange={(val) => handleUpdateDrinkQuantity(booking.id, item.drink_id, val || 1)}
                              />
                              <Button
                                size="small"
                                shape="circle"
                                icon={<PlusOutlined />}
                                onClick={() => handleUpdateDrinkQuantity(booking.id, item.drink_id, item.quantity + 1)}
                              />
                            </Space>
                          </Col>
                          <Col span={5} style={{ textAlign: 'right' }}>
                            <Text strong>¥{item.price.toFixed(2)}</Text>
                          </Col>
                          <Col span={2} style={{ textAlign: 'right' }}>
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveDrink(booking.id, item.drink_id)}
                            />
                          </Col>
                        </Row>
                      ))}
                      <div style={{ textAlign: 'right', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #f0f0f0' }}>
                        <Text type="secondary">饮品小计: </Text>
                        <Text strong style={{ color: '#f5222d' }}>¥{getBookingDrinkTotal(booking.id).toFixed(2)}</Text>
                      </div>
                    </div>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>暂未选购饮品</Text>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <Card size="small" title="结算单" style={{ marginTop: 12 }}>
          <List size="small">
            {getCheckedInBookings().map(booking => {
              const ticketTotal = (currentSchedule?.base_price || 0) * booking.player_count;
              const drinkTotal = getBookingDrinkTotal(booking.id);
              const hasDrinks = drinkTotal > 0;
              
              return (
                <div key={booking.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{booking.player_name} ({booking.player_count}人)</div>
                  <div style={{ paddingLeft: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                      <span>剧本票费 × {booking.player_count}</span>
                      <span>¥{ticketTotal.toFixed(2)}</span>
                    </div>
                    {hasDrinks && bookingDrinks[booking.id]?.map(item => (
                      <div key={item.drink_id} style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                        <span>{item.drink_name} × {item.quantity}</span>
                        <span>¥{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginTop: 4, paddingTop: 4, borderTop: '1px dashed #f0f0f0' }}>
                      <span>小计</span>
                      <span style={{ color: hasDrinks ? '#722ed1' : '#1890ff' }}>
                        {hasDrinks ? '（合并结算）' : ''} ¥{(ticketTotal + drinkTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </List>
          
          <Divider style={{ margin: '8px 0' }} />
          
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary">饮品总计: </Text>
            <Text strong style={{ color: '#13c2c2' }}>¥{getTotalDrinkAmount().toFixed(2)}</Text>
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 16 }}>应付总额: </Text>
              <Text strong style={{ fontSize: 24, color: '#f5222d' }}>
                ¥{
                  (getCheckedInBookings().reduce((sum, b) => {
                    return sum + (currentSchedule?.base_price || 0) * b.player_count;
                  }, 0) + getTotalDrinkAmount()).toFixed(2)
                }
              </Text>
            </div>
          </div>
        </Card>
      </Modal>

      <Modal
        title="选择饮品"
        open={drinkModalVisible}
        onCancel={() => setDrinkModalVisible(false)}
        footer={null}
        width={640}
      >
        {drinkLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : drinks.length === 0 ? (
          <Empty description="暂无可用饮品" />
        ) : (
          <Row gutter={[12, 12]}>
            {drinks.map(drink => (
              <Col span={12} key={drink.id}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => handleSelectDrink(drink)}
                  style={{ 
                    cursor: drink.stock > 0 ? 'pointer' : 'not-allowed',
                    opacity: drink.stock > 0 ? 1 : 0.5
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <Space>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24
                      }}
                    >
                      <CoffeeOutlined />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{drink.name}</div>
                      <div style={{ color: '#f5222d', fontWeight: 'bold' }}>¥{drink.price.toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: drink.stock < 10 ? '#f5222d' : '#999' }}>
                        库存: {drink.stock}
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Modal>
    </div>
  );
};

export default HostSchedules;
