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
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
  Card,
  Avatar,
  Switch
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  ReloadOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { usersApi, User, UserRole, PaginatedResponse } from '../../api';
import { roleMap } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserFormData {
  username: string;
  password?: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
}

const UserManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 10,
    role: '' as UserRole | '',
    keyword: ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm<UserFormData>();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { ...queryParams };
      if (!params.keyword) delete params.keyword;
      if (!params.role) delete params.role;

      const res = await usersApi.getList(params);
      setUsers(res.data);
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
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'player' });
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await usersApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleRoleChange = async (id: number, role: UserRole) => {
    try {
      await usersApi.update(id, { role });
      message.success('角色更新成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        const updateData: Partial<User> & { password?: string } = {
          name: values.name,
          phone: values.phone,
          role: values.role,
          avatar: values.avatar
        };
        if (values.password) {
          updateData.password = values.password;
        }
        await usersApi.update(editingUser.id, updateData);
        message.success('更新成功');
      } else {
        await usersApi.create(values as Required<UserFormData>);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
    }
  };

  const handleSearch = (value: string) => {
    setQueryParams(prev => ({ ...prev, page: 1, keyword: value }));
  };

  const handleTableChange = (pagination: any) => {
    setQueryParams(prev => ({
      ...prev,
      page: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>@{record.username}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone?: string) => phone || <Text type="secondary">未设置</Text>
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => {
        const info = roleMap[role];
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '角色管理',
      key: 'role_manage',
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>设为:</Text>
          <Switch
            size="small"
            checked={record.role === 'admin'}
            onChange={(checked) => handleRoleChange(record.id, checked ? 'admin' : 'player')}
            checkedChildren="管理员"
            unCheckedChildren="管理员"
            disabled={record.role === 'admin'}
          />
          <Switch
            size="small"
            checked={record.role === 'host'}
            onChange={(checked) => handleRoleChange(record.id, checked ? 'host' : 'player')}
            checkedChildren="主持人"
            unCheckedChildren="主持人"
            disabled={record.role === 'host'}
          />
        </Space>
      )
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该用户吗？"
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
          👥 用户管理
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
              placeholder="搜索用户名、姓名、手机号"
              prefix={<SearchOutlined />}
              allowClear
              value={queryParams.keyword}
              onChange={(e) => setQueryParams(prev => ({ ...prev, keyword: e.target.value }))}
              onPressEnter={(e) => handleSearch(e.currentTarget.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="选择角色"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.role || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, role: value || '' }))}
            >
              <Option value="admin">管理员</Option>
              <Option value="host">主持人</Option>
              <Option value="player">玩家</Option>
            </Select>
          </Col>
          <Col xs={24} md={12}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增用户
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={users?.list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.pageSize,
            total: users?.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'player' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? '新密码(不修改留空)' : '密码'}
            rules={editingUser ? [] : [
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              placeholder={editingUser ? '不修改请留空' : '请输入密码'}
              prefix={<KeyOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="真实姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="host">主持人</Option>
              <Option value="player">玩家</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="avatar"
            label="头像URL"
          >
            <Input placeholder="请输入头像图片链接" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
