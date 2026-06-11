import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Empty,
  Progress,
  Descriptions,
  List,
  Avatar,
  Pagination
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  UserOutlined,
  BookOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { scheduleApi, ScheduleWithDetails, BookingWithPlayer } from '../../api/schedules';
import { scriptApi, ScriptCategory } from '../../api/scripts';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const ScheduleList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [difficultyFilter, setDifficultyFilter] = useState<string>();
  const [dateFilter, setDateFilter] = useState<string>();
  const [scriptIdFilter, setScriptIdFilter] = useState<number>();
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleWithDetails | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookForm] = Form.useForm();

  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.script_id) {
        setScriptIdFilter(state.script_id);
      }
    }
  }, [location.state]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [pagination.current, pagination.pageSize, categoryFilter, difficultyFilter, dateFilter, scriptIdFilter]);

  const fetchCategories = async () => {
    try {
      const response = await scriptApi.getCategories();
      setCategories(response.data);
    } catch (error: any) {
      message.error(error.message || '获取分类失败');
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };
      if (categoryFilter) params.category = categoryFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (dateFilter) params.date = dateFilter;
      if (scriptIdFilter) params.script_id = scriptIdFilter;

      const response = await scheduleApi.getAvailable(params);
      setSchedules(response.data.list);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error: any) {
      message.error(error.message || '获取场次列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleDetail = async (id: number) => {
    try {
      const response = await scheduleApi.getDetail(id);
      setCurrentSchedule(response.data);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取详情失败');
    }
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

  const getProgressPercent = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const getRemainingSlots = (current: number, max: number) => {
    return max - current;
  };

  const handleBook = (schedule: ScheduleWithDetails) => {
    setCurrentSchedule(schedule);
    bookForm.resetFields();
    bookForm.setFieldsValue({ player_count: 1 });
    setBookModalVisible(true);
  };

  const handleConfirmBook = async () => {
    try {
      const values = await bookForm.validateFields();
      setBookingLoading(true);

      await scheduleApi.book(currentSchedule!.id, values);

      message.success('预订成功！请前往订单页面完成支付');
      setBookModalVisible(false);
      fetchSchedules();
      navigate('/orders');
    } catch (error: any) {
      message.error(error.message || '预订失败');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleResetFilters = () => {
    setCategoryFilter(undefined);
    setDifficultyFilter(undefined);
    setDateFilter(undefined);
    setScriptIdFilter(undefined);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const disabledDate = (current: dayjs.Dayjs) => {
    return current && current < dayjs().startOf('day');
  };

  return (
    <div>
      <Card>
        <Space wrap>
          <span style={{ color: '#888' }}>分类:</span>
          <Select
            placeholder="全部分类"
            style={{ width: 140 }}
            allowClear
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          >
            {categories.map((cat) => (
              <Option key={cat.name} value={cat.name}>{cat.name}</Option>
            ))}
          </Select>

          <span style={{ color: '#888' }}>难度:</span>
          <Select
            placeholder="全部难度"
            style={{ width: 140 }}
            allowClear
            value={difficultyFilter}
            onChange={(value) => {
              setDifficultyFilter(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          >
            <Option value="easy">新手友好</Option>
            <Option value="medium">中等难度</Option>
            <Option value="hard">烧脑进阶</Option>
            <Option value="nightmare">噩梦难度</Option>
          </Select>

          <span style={{ color: '#888' }}>日期:</span>
          <DatePicker
            placeholder="选择日期"
            style={{ width: 180 }}
            allowClear
            disabledDate={disabledDate}
            value={dateFilter ? dayjs(dateFilter) : null}
            onChange={(date) => {
              setDateFilter(date ? date.format('YYYY-MM-DD') : '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          />

          <Button onClick={handleResetFilters}>重置筛选</Button>
        </Space>
      </Card>

      <Card
        title={`可拼场列表 (${pagination.total})`}
        style={{ marginTop: 16 }}
        loading={loading}
        bodyStyle={{ padding: 16 }}
      >
        {schedules.length === 0 ? (
          <Empty description="暂无可拼场的场次" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {schedules.map((schedule) => (
                <Col xs={24} lg={12} key={schedule.id}>
                  <Card
                    hoverable
                    bodyStyle={{ padding: 16 }}
                    actions={[
                      <Button type="link" onClick={() => fetchScheduleDetail(schedule.id)}>
                        详情
                      </Button>,
                      <Button
                        type="primary"
                        icon={<QrcodeOutlined />}
                        disabled={getRemainingSlots(schedule.current_players, schedule.max_players) === 0}
                        onClick={() => handleBook(schedule)}
                      >
                        立即拼场
                      </Button>
                    ]}
                  >
                    <Row gutter={16}>
                      <Col span={6}>
                        <div
                          style={{
                            height: 100,
                            background: schedule.cover_image
                              ? `url(${schedule.cover_image}) center/cover`
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 24,
                            fontWeight: 'bold'
                          }}
                        >
                          {!schedule.cover_image && schedule.script_name.charAt(0)}
                        </div>
                      </Col>
                      <Col span={18}>
                        <div style={{ marginBottom: 8 }}>
                          <Space>
                            <span style={{ fontSize: 16, fontWeight: 600 }}>{schedule.script_name}</span>
                            <Tag color="blue">{schedule.script_category}</Tag>
                            {getDifficultyTag(schedule.script_difficulty)}
                          </Space>
                        </div>

                        <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                          <Space size={16}>
                            <Space>
                              <CalendarOutlined style={{ color: '#888' }} />
                              <span>{dayjs(schedule.start_time).format('YYYY-MM-DD')}</span>
                            </Space>
                            <Space>
                              <ClockCircleOutlined style={{ color: '#888' }} />
                              <span>{dayjs(schedule.start_time).format('HH:mm')} - {dayjs(schedule.end_time).format('HH:mm')}</span>
                            </Space>
                          </Space>
                          <Space size={16}>
                            <Space>
                              <EnvironmentOutlined style={{ color: '#888' }} />
                              <span>{schedule.room_name}</span>
                            </Space>
                            <Space>
                              <UserOutlined style={{ color: '#888' }} />
                              <span>主持人: {schedule.host_name}</span>
                            </Space>
                          </Space>
                        </Space>

                        <Row align="middle">
                          <Col flex="auto">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ color: '#888' }}>拼场进度</span>
                              <span>
                                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                                  {schedule.current_players}/{schedule.max_players}人
                                </span>
                                <span style={{ color: '#888', marginLeft: 8 }}>
                                  剩余{getRemainingSlots(schedule.current_players, schedule.max_players)}位
                                </span>
                              </span>
                            </div>
                            <Progress
                              percent={getProgressPercent(schedule.current_players, schedule.max_players)}
                              showInfo={false}
                              size="small"
                              strokeColor={getRemainingSlots(schedule.current_players, schedule.max_players) === 0 ? '#d9d9d9' : '#1890ff'}
                            />
                          </Col>
                          <Col style={{ marginLeft: 16, textAlign: 'right' }}>
                            <span style={{ color: '#ff4d4f', fontSize: 20, fontWeight: 'bold' }}>
                              ¥{schedule.base_price}
                            </span>
                            <span style={{ color: '#888', marginLeft: 4 }}>/人</span>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
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
          </>
        )}
      </Card>

      <Modal
        title="拼场详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>,
          currentSchedule && (
            <Button
              key="book"
              type="primary"
              icon={<QrcodeOutlined />}
              disabled={getRemainingSlots(currentSchedule.current_players, currentSchedule.max_players) === 0}
              onClick={() => {
                setDetailModalVisible(false);
                handleBook(currentSchedule);
              }}
            >
              立即拼场
            </Button>
          )
        ]}
        width={700}
      >
        {currentSchedule && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div
                  style={{
                    height: 140,
                    background: currentSchedule.cover_image
                      ? `url(${currentSchedule.cover_image}) center/cover`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 32,
                    fontWeight: 'bold'
                  }}
                >
                  {!currentSchedule.cover_image && currentSchedule.script_name.charAt(0)}
                </div>
              </Col>
              <Col span={16}>
                <h2 style={{ marginBottom: 8 }}>{currentSchedule.script_name}</h2>
                <Space style={{ marginBottom: 12 }}>
                  <Tag color="blue">{currentSchedule.script_category}</Tag>
                  {getDifficultyTag(currentSchedule.script_difficulty)}
                  <span style={{ color: '#ff4d4f', fontSize: 18, fontWeight: 'bold' }}>
                    ¥{currentSchedule.base_price}/人
                  </span>
                </Space>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="时间">
                    {dayjs(currentSchedule.start_time).format('YYYY-MM-DD HH:mm')} - {dayjs(currentSchedule.end_time).format('HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="房间">{currentSchedule.room_name}</Descriptions.Item>
                  <Descriptions.Item label="主持人">{currentSchedule.host_name}</Descriptions.Item>
                  <Descriptions.Item label="人数">
                    {currentSchedule.current_players}/{currentSchedule.max_players}人
                    <span style={{ color: '#888', marginLeft: 8 }}>
                      (剩余{getRemainingSlots(currentSchedule.current_players, currentSchedule.max_players)}位)
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            {currentSchedule.description && (
              <Card title="剧本简介" size="small" style={{ marginBottom: 16 }}>
                <p style={{ margin: 0 }}>{currentSchedule.description}</p>
              </Card>
            )}

            <Card
              title={
                <Space>
                  <UserOutlined />
                  <span>已报名玩家</span>
                </Space>
              }
              size="small"
            >
              {currentSchedule.bookings && currentSchedule.bookings.length > 0 ? (
                <List
                  dataSource={currentSchedule.bookings}
                  renderItem={(booking: BookingWithPlayer) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} src={booking.player_avatar} />}
                        title={
                          <Space>
                            <span>{booking.player_name}</span>
                            <Tag color="blue">{booking.player_count}人</Tag>
                          </Space>
                        }
                        description={`报名时间: ${dayjs(booking.booked_at).format('YYYY-MM-DD HH:mm')}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无玩家报名" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="确认拼场"
        open={bookModalVisible}
        onOk={handleConfirmBook}
        onCancel={() => setBookModalVisible(false)}
        confirmLoading={bookingLoading}
        okText="确认预订"
        cancelText="取消"
        width={500}
      >
        {currentSchedule && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="剧本">{currentSchedule.script_name}</Descriptions.Item>
                <Descriptions.Item label="时间">
                  {dayjs(currentSchedule.start_time).format('YYYY-MM-DD HH:mm')} - {dayjs(currentSchedule.end_time).format('HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="房间">{currentSchedule.room_name}</Descriptions.Item>
                <Descriptions.Item label="主持人">{currentSchedule.host_name}</Descriptions.Item>
                <Descriptions.Item label="单价">
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{currentSchedule.base_price}/人</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Form form={bookForm} layout="vertical">
              <Form.Item
                name="player_count"
                label="预订人数"
                rules={[
                  { required: true, message: '请输入预订人数' },
                  {
                    validator: (_, value) => {
                      const remaining = getRemainingSlots(currentSchedule.current_players, currentSchedule.max_players);
                      if (value > remaining) {
                        return Promise.reject(new Error(`最多可预订 ${remaining} 人`));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  min={1}
                  max={getRemainingSlots(currentSchedule.current_players, currentSchedule.max_players)}
                  style={{ width: '100%' }}
                  addonAfter={`剩余${getRemainingSlots(currentSchedule.current_players, currentSchedule.max_players)}位`}
                />
              </Form.Item>
              <Form.Item
                name="player_names"
                label="同行玩家姓名"
                extra="如有多位玩家，请用逗号分隔"
              >
                <TextArea rows={2} placeholder="例如：张三,李四" />
              </Form.Item>
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>预估总价</span>
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => (
                      <span style={{ color: '#ff4d4f', fontSize: 24, fontWeight: 'bold' }}>
                        ¥{(getFieldValue('player_count') || 1) * currentSchedule.base_price!}
                      </span>
                    )}
                  </Form.Item>
                </div>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleList;
