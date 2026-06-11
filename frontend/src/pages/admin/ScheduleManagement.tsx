import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Badge,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Tag,
  message,
  Popconfirm,
  Typography,
  Card,
  Row,
  Col,
  List,
  Descriptions,
  Tooltip,
  Divider,
  Alert
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  StopOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  WarningOutlined,
  TeamOutlined,
  HomeOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { CalendarProps } from 'antd/es/calendar';
import dayjs, { Dayjs } from 'dayjs';
import {
  schedulesApi,
  scriptsApi,
  roomsApi,
  usersApi,
  ScheduleWithDetails,
  Script,
  Room,
  User
} from '../../api';
import { statusMap, difficultyMap } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface ScheduleFormData {
  script_id: number;
  room_id: number;
  host_id: number;
  start_time: string;
  end_time: string;
  notes?: string;
}

const ScheduleManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [monthSchedules, setMonthSchedules] = useState<ScheduleWithDetails[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hosts, setHosts] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithDetails | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ScheduleWithDetails | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [form] = Form.useForm<ScheduleFormData>();

  const loadMonthSchedules = useCallback(async (date: Dayjs) => {
    setLoading(true);
    try {
      const startDate = date.startOf('month').format('YYYY-MM-DD');
      const endDate = date.endOf('month').format('YYYY-MM-DD');
      const res = await schedulesApi.getList({
        start_date: startDate,
        end_date: endDate,
        pageSize: 100,
        include_bookings: true
      });
      setMonthSchedules(res.data.list);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDaySchedules = async (date: Dayjs) => {
    setLoading(true);
    try {
      const targetDate = date.format('YYYY-MM-DD');
      const res = await schedulesApi.getList({
        start_date: targetDate,
        end_date: targetDate,
        pageSize: 100,
        include_bookings: true
      });
      setSchedules(res.data.list);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [scriptsRes, roomsRes, hostsRes] = await Promise.all([
        scriptsApi.getList({ pageSize: 100, status: 'published' }),
        roomsApi.getList({ pageSize: 100, status: 'active' }),
        usersApi.getHosts()
      ]);
      setScripts(scriptsRes.data.list);
      setRooms(roomsRes.data.list);
      setHosts(hostsRes.data);
    } catch (error: any) {
      message.error(error.message || '加载选项失败');
    }
  };

  useEffect(() => {
    loadMonthSchedules(selectedDate);
    loadDaySchedules(selectedDate);
    loadOptions();
  }, [selectedDate, loadMonthSchedules]);

  const checkConflict = async (values: ScheduleFormData) => {
    try {
      const availableRooms = await roomsApi.getAvailable({
        start_time: values.start_time,
        end_time: values.end_time,
        exclude_schedule_id: editingSchedule?.id
      });
      const availableHosts = await usersApi.getHosts({
        available: true,
        start_time: values.start_time,
        end_time: values.end_time,
        exclude_schedule_id: editingSchedule?.id
      });

      const roomConflict = !availableRooms.data.some(r => r.id === values.room_id);
      const hostConflict = !availableHosts.data.some(h => h.id === values.host_id);

      if (roomConflict || hostConflict) {
        const warnings = [];
        if (roomConflict) warnings.push('该房间在所选时间段已被占用');
        if (hostConflict) warnings.push('该主持人在所选时间段已有安排');
        setConflictWarning(warnings.join('，'));
        return false;
      }
      setConflictWarning(null);
      return true;
    } catch {
      return true;
    }
  };

  const handleDateSelect: CalendarProps<Dayjs>['onSelect'] = (date) => {
    setSelectedDate(date);
  };

  const handlePanelChange = (date: Dayjs) => {
    setSelectedDate(date);
  };

  const getListData = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    return monthSchedules.filter(s => dayjs(s.start_time).format('YYYY-MM-DD') === dateStr);
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    return (
      <ul className="schedule-calendar-events">
        {listData.slice(0, 2).map(item => (
          <li key={item.id}>
            <Badge
              status={item.status === 'cancelled' ? 'default' : item.status === 'completed' ? 'success' : 'processing'}
              text={
                <Text ellipsis style={{ fontSize: 11, maxWidth: 80 }}>
                  {dayjs(item.start_time).format('HH:mm')} {item.script_name}
                </Text>
              }
            />
          </li>
        ))}
        {listData.length > 2 && (
          <li style={{ color: '#999', fontSize: 11 }}>+{listData.length - 2} 更多</li>
        )}
      </ul>
    );
  };

  const handleAdd = () => {
    setEditingSchedule(null);
    form.resetFields();
    setConflictWarning(null);
    const defaultStart = selectedDate.hour(14).minute(0);
    const defaultEnd = defaultStart.add(4, 'hour');
    form.setFieldsValue({
      start_time: defaultStart.format('YYYY-MM-DD HH:mm:ss'),
      end_time: defaultEnd.format('YYYY-MM-DD HH:mm:ss')
    });
    setModalVisible(true);
  };

  const handleEdit = (schedule: ScheduleWithDetails) => {
    setEditingSchedule(schedule);
    form.setFieldsValue({
      script_id: schedule.script_id,
      room_id: schedule.room_id,
      host_id: schedule.host_id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      notes: schedule.notes
    });
    setConflictWarning(null);
    setModalVisible(true);
  };

  const handleView = (schedule: ScheduleWithDetails) => {
    setViewingSchedule(schedule);
    setDetailVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const hasConflict = await checkConflict(values);
      if (hasConflict === false) {
        return;
      }

      if (editingSchedule) {
        await schedulesApi.update(editingSchedule.id, values);
        message.success('更新成功');
      } else {
        await schedulesApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadMonthSchedules(selectedDate);
      loadDaySchedules(selectedDate);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await schedulesApi.start(id);
      message.success('场次已开始');
      loadMonthSchedules(selectedDate);
      loadDaySchedules(selectedDate);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEnd = async (id: number) => {
    try {
      await schedulesApi.end(id);
      message.success('场次已结束');
      loadMonthSchedules(selectedDate);
      loadDaySchedules(selectedDate);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await schedulesApi.cancel(id);
      message.success('场次已取消');
      loadMonthSchedules(selectedDate);
      loadDaySchedules(selectedDate);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await schedulesApi.delete(id);
      message.success('删除成功');
      loadMonthSchedules(selectedDate);
      loadDaySchedules(selectedDate);
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleTimeChange = async (_: any, dateStrings: [string, string]) => {
    const [start, end] = dateStrings;
    if (start && end) {
      const scriptId = form.getFieldValue('script_id');
      const roomId = form.getFieldValue('room_id');
      const hostId = form.getFieldValue('host_id');
      
      if (roomId && hostId) {
        await checkConflict({
          script_id: scriptId,
          room_id: roomId,
          host_id: hostId,
          start_time: start,
          end_time: end
        });
      }
    }
  };

  const scheduleStatusActions = (schedule: ScheduleWithDetails) => {
    const actions: React.ReactNode[] = [];
    
    actions.push(
      <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(schedule)}>
        详情
      </Button>
    );

    if (schedule.status === 'pending' || schedule.status === 'confirmed') {
      actions.push(
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(schedule)}>
          编辑
        </Button>
      );
    }

    if (schedule.status === 'confirmed') {
      actions.push(
        <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(schedule.id)}>
          开始
        </Button>
      );
    }

    if (schedule.status === 'in_progress') {
      actions.push(
        <Button type="link" size="small" icon={<StopOutlined />} onClick={() => handleEnd(schedule.id)}>
          结束
        </Button>
      );
    }

    if (schedule.status === 'pending' || schedule.status === 'confirmed') {
      actions.push(
        <Popconfirm
          title="确定取消该场次吗？"
          description="取消后相关预订将自动退款"
          onConfirm={() => handleCancel(schedule.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<CloseOutlined />}>
            取消
          </Button>
        </Popconfirm>
      );
    }

    if (schedule.status === 'pending' || schedule.status === 'cancelled') {
      actions.push(
        <Popconfirm
          title="确定删除该场次吗？"
          onConfirm={() => handleDelete(schedule.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      );
    }

    return actions;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          📅 场次管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增场次
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card bordered={false} title="日历视图">
            <Calendar
              value={selectedDate}
              onSelect={handleDateSelect}
              onPanelChange={handlePanelChange}
              dateCellRender={dateCellRender}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            title={`${selectedDate.format('YYYY-MM-DD')} 场次安排`}
            loading={loading}
          >
            {schedules.length > 0 ? (
              <List
                dataSource={schedules}
                renderItem={(schedule) => {
                  const statusInfo = statusMap[schedule.status];
                  const diffInfo = difficultyMap[schedule.script_difficulty];
                  
                  return (
                    <List.Item
                      key={schedule.id}
                      style={{
                        padding: 16,
                        background: schedule.status === 'cancelled' ? '#fafafa' : '#fff',
                        borderRadius: 8,
                        marginBottom: 12,
                        border: '1px solid #f0f0f0'
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <Space>
                            <Text strong style={{ fontSize: 16 }}>{schedule.script_name}</Text>
                            <Tag color={diffInfo?.color}>{diffInfo?.text}</Tag>
                            <Tag color={statusInfo?.color}>{statusInfo?.text}</Tag>
                            {schedule.is_locked ? <Tag color="red">已满</Tag> : null}
                          </Space>
                        </div>

                        <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                          <Space>
                            <ClockCircleOutlined style={{ color: '#999' }} />
                            <Text type="secondary">
                              {dayjs(schedule.start_time).format('HH:mm')} - {dayjs(schedule.end_time).format('HH:mm')}
                            </Text>
                          </Space>
                          <Space>
                            <HomeOutlined style={{ color: '#999' }} />
                            <Text type="secondary">{schedule.room_name}</Text>
                          </Space>
                          <Space>
                            <UserOutlined style={{ color: '#999' }} />
                            <Text type="secondary">DM: {schedule.host_name}</Text>
                          </Space>
                          <Space>
                            <TeamOutlined style={{ color: '#999' }} />
                            <Text type="secondary">
                              {schedule.current_players}/{schedule.max_players} 人
                              {schedule.min_players && schedule.current_players < schedule.min_players && (
                                <Tooltip title="未达到最少人数">
                                  <WarningOutlined style={{ color: '#faad14', marginLeft: 4 }} />
                                </Tooltip>
                              )}
                            </Text>
                          </Space>
                        </Space>

                        <Space wrap>
                          {scheduleStatusActions(schedule)}
                        </Space>

                        {schedule.bookings && schedule.bookings.length > 0 && (
                          <>
                            <Divider style={{ margin: '12px 0' }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>预订列表:</Text>
                            <Space wrap style={{ marginTop: 4 }}>
                              {schedule.bookings.map(booking => (
                                <Tag key={booking.id} color={booking.status === 'cancelled' ? 'default' : 'blue'}>
                                  {booking.player_name} ({booking.player_count}人)
                                </Tag>
                              ))}
                            </Space>
                          </>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <Text type="secondary">该日暂无场次安排</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingSchedule ? '编辑场次' : '新增场次'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="script_id"
            label="选择剧本"
            rules={[{ required: true, message: '请选择剧本' }]}
          >
            <Select placeholder="请选择剧本" showSearch optionFilterProp="children">
              {scripts.map(script => (
                <Option key={script.id} value={script.id}>
                  {script.name} ({script.min_players}-{script.max_players}人, {script.duration}分钟)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name={['start_time', 'end_time']}
            label="场次时间"
            rules={[{ required: true, message: '请选择时间' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              onChange={handleTimeChange}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="room_id"
                label="选择房间"
                rules={[{ required: true, message: '请选择房间' }]}
              >
                <Select placeholder="请选择房间" showSearch optionFilterProp="children">
                  {rooms.map(room => (
                    <Option key={room.id} value={room.id}>
                      {room.name} (容纳{room.capacity}人)
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="host_id"
                label="选择主持人"
                rules={[{ required: true, message: '请选择主持人' }]}
              >
                <Select placeholder="请选择主持人" showSearch optionFilterProp="children">
                  {hosts.map(host => (
                    <Option key={host.id} value={host.id}>
                      {host.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {conflictWarning && (
            <Alert
              message="时间冲突"
              description={conflictWarning}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea rows={3} placeholder="场次备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="场次详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {viewingSchedule && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="剧本" span={2}>
                <Space>
                  <Text strong>{viewingSchedule.script_name}</Text>
                  <Tag color={difficultyMap[viewingSchedule.script_difficulty]?.color}>
                    {difficultyMap[viewingSchedule.script_difficulty]?.text}
                  </Tag>
                  <Tag>{viewingSchedule.script_category}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[viewingSchedule.status]?.color}>
                  {statusMap[viewingSchedule.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="时间">
                {dayjs(viewingSchedule.start_time).format('YYYY-MM-DD HH:mm')}
                <br />
                至 {dayjs(viewingSchedule.end_time).format('HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="房间">{viewingSchedule.room_name}</Descriptions.Item>
              <Descriptions.Item label="主持人">{viewingSchedule.host_name}</Descriptions.Item>
              <Descriptions.Item label="人数">
                {viewingSchedule.current_players}/{viewingSchedule.max_players} 人
                (最少{viewingSchedule.min_players}人)
              </Descriptions.Item>
              {viewingSchedule.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {viewingSchedule.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {viewingSchedule.bookings && viewingSchedule.bookings.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>预订列表 ({viewingSchedule.bookings.length})</Title>
                <List
                  size="small"
                  dataSource={viewingSchedule.bookings}
                  renderItem={(booking) => (
                    <List.Item key={booking.id}>
                      <Space>
                        <Text strong>{booking.player_name}</Text>
                        <Tag>{booking.player_count}人</Tag>
                        <Text type="secondary">{booking.player_phone}</Text>
                        <Tag color={statusMap[booking.status]?.color}>
                          {statusMap[booking.status]?.text}
                        </Tag>
                        {booking.player_names && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            玩家: {booking.player_names}
                          </Text>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      <style>{`
        .schedule-calendar-events {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .schedule-calendar-events li {
          margin-bottom: 2px;
        }
      `}</style>
    </div>
  );
};

export default ScheduleManagement;
