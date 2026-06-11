import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  message,
  Space,
  Descriptions,
  Tag,
  Divider,
  Upload,
  Row,
  Col
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth';
import type { UploadChangeParam } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        phone: user.phone || ''
      });
      setAvatarUrl(user.avatar);
    }
  }, [user, form]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      form.setFieldsValue({
        name: user.name,
        phone: user.phone || ''
      });
      setAvatarUrl(user.avatar);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const updateData: any = {
        name: values.name,
        phone: values.phone || undefined
      };
      if (avatarUrl !== user?.avatar) {
        updateData.avatar = avatarUrl;
      }

      const response = await authApi.updateProfile(updateData);
      setUser(response.data);
      message.success('个人信息更新成功');
      setIsEditing(false);
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.status === 'done') {
      const response = info.file.response;
      if (response && response.data && response.data.url) {
        setAvatarUrl(response.data.url);
        message.success('头像上传成功');
      } else {
        message.error('头像上传失败');
      }
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  const beforeAvatarUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('请上传图片文件');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB');
      return false;
    }
    return true;
  };

  const getRoleTag = (role: string) => {
    const roleMap: Record<string, { color: string; text: string }> = {
      admin: { color: 'red', text: '管理员' },
      host: { color: 'blue', text: '主持人' },
      player: { color: 'green', text: '玩家' }
    };
    const config = roleMap[role] || { color: 'default', text: role };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const uploadButton = (
    <div>
      <CameraOutlined style={{ fontSize: 24, color: '#888' }} />
      <div style={{ marginTop: 8, color: '#888' }}>更换头像</div>
    </div>
  );

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              {isEditing ? (
                <Upload
                  name="avatar"
                  listType="picture-circle"
                  showUploadList={false}
                  action="/api/upload/avatar"
                  beforeUpload={beforeAvatarUpload}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  headers={{
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
                  ) : (
                    uploadButton
                  )}
                </Upload>
              ) : (
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  src={avatarUrl}
                  style={{ marginBottom: 16 }}
                />
              )}
            </div>
            <h2 style={{ marginBottom: 8 }}>{user?.name}</h2>
            <div style={{ marginBottom: 16 }}>
              {getRoleTag(user?.role || '')}
            </div>
            <Descriptions column={1} size="small" style={{ textAlign: 'left' }}>
              <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {user?.created_at ? dayjs(user.created_at).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="账号状态">
                <Tag color="green">正常</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title="个人信息"
            extra={
              !isEditing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  编辑
                </Button>
              ) : (
                <Space>
                  <Button onClick={handleCancel}>取消</Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={loading}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </Space>
              )
            }
          >
            <Form
              form={form}
              layout="vertical"
              disabled={!isEditing}
              initialValues={{
                name: user?.name,
                phone: user?.phone || ''
              }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="name"
                    label="姓名"
                    rules={[{ required: true, message: '请输入姓名' }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="请输入姓名"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    label="手机号"
                    rules={[
                      {
                        pattern: /^1[3-9]\d{9}$/,
                        message: '请输入正确的手机号'
                      }
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="请输入手机号"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              <Descriptions column={2} size="small">
                <Descriptions.Item label="用户角色">
                  {getRoleTag(user?.role || '')}
                </Descriptions.Item>
                <Descriptions.Item label="用户名">
                  {user?.username}
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {user?.created_at ? dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="最后更新">
                  {user?.updated_at ? dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Form>
          </Card>

          <Card
            title="账号安全"
            style={{ marginTop: 16 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card
                  size="small"
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onClick={() => message.info('修改密码功能开发中')}
                >
                  <Space>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#e6f7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1890ff'
                    }}>
                      🔒
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>修改密码</div>
                      <div style={{ color: '#888', fontSize: 12 }}>定期修改密码更安全</div>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card
                  size="small"
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onClick={() => message.info('绑定手机功能开发中')}
                >
                  <Space>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#f6ffed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#52c41a'
                    }}>
                      📱
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>绑定手机</div>
                      <div style={{ color: '#888', fontSize: 12 }}>
                        {user?.phone ? '已绑定' : '未绑定'}
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
