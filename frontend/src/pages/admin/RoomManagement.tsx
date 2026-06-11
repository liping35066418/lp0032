import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
  Card
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { roomsApi, Room, RoomStatus, PaginatedResponse } from '../../api';
import { statusMap } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface RoomFormData {
  name: string;
  capacity: number;
  facilities?: string;
  status: RoomStatus;
}

const RoomManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<PaginatedResponse<Room> | null>(null);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 10,
    status: '' as RoomStatus | ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm<RoomFormData>();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { ...queryParams };
      if (!params.status) delete params.status;

      const res = await roomsApi.getList(params);
      setRooms(res.data);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryParams]);

  const handleAdd = () => {
    setEditingRoom(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalVisible(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.setFieldsValue(room);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await roomsApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: RoomStatus) => {
    try {
      await roomsApi.update(id, { status });
      message.success('状态更新成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRoom) {
        await roomsApi.update(editingRoom.id, values);
        message.success('更新成功');
      } else {
        await roomsApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
    }
  };

  const handleTableChange = (pagination: any) => {
    setQueryParams(prev => ({
      ...prev,
      page: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const getFacilitiesTags = (facilities?: string) => {
    if (!facilities) return null;
    return facilities.split(/[,，、]/).map((f, i) => (
      <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
        {f.trim()}
      </Tag>
    ));
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '房间名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '容纳人数',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (capacity: number) => (
        <Space>
          <SettingOutlined />
          <Text>{capacity}人</Text>
        </Space>
      )
    },
    {
      title: '设施',
      dataIndex: 'facilities',
      key: 'facilities',
      render: (facilities: string) => (
        <Space wrap size={4}>
          {getFacilitiesTags(facilities) || <Text type="secondary">暂无</Text>}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: RoomStatus) => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Room) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleStatusChange(record.id, 'maintenance')}
            >
              维护
            </Button>
          )}
          {record.status === 'maintenance' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleStatusChange(record.id, 'active')}
            >
              启用
            </Button>
          )}
          {record.status === 'inactive' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleStatusChange(record.id, 'active')}
            >
              启用
            </Button>
          )}
          {record.status !== 'inactive' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleStatusChange(record.id, 'inactive')}
            >
              停用
            </Button>
          )}
          <Popconfirm
            title="确定删除该房间吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          🏠 房间管理
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadData}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索房间名称"
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.status || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, status: value || '' }))}
            >
              <Option value="active">启用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Col>
          <Col xs={24} md={12}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增房间
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={rooms?.list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.pageSize,
            total: rooms?.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingRoom ? '编辑房间' : '新增房间'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="name"
            label="房间名称"
            rules={[{ required: true, message: '请输入房间名称' }]}
          >
            <Input placeholder="请输入房间名称，如：古风房、日式房等" />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容纳人数"
            rules={[{ required: true, message: '请输入容纳人数' }]}
          >
            <InputNumber
              min={2}
              max={20}
              style={{ width: '100%' }}
              placeholder="最多容纳人数"
              addonAfter="人"
            />
          </Form.Item>

          <Form.Item
            name="facilities"
            label="配套设施"
          >
            <TextArea
              rows={3}
              placeholder="请输入配套设施，多个设施用逗号分隔，如：投影仪、音响、空调等"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">启用</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomManagement;
