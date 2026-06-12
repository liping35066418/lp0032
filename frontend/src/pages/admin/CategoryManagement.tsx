import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Typography,
  Card,
  Switch
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { categoriesApi, CategoryWithCount } from '../../api';
import { statusMap } from '../../types';
import { useCategoryStore } from '../../store/useCategoryStore';

const { Title, Text } = Typography;

interface CategoryFormData {
  name: string;
}

const CategoryManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { categories, fetchAllCategories, refreshCategories } = useCategoryStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [form] = Form.useForm<CategoryFormData>();

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchAllCategories();
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    form.setFieldsValue({ name: category.name });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await categoriesApi.deleteCategory(id);
      message.success('删除成功');
      await refreshCategories();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: 'active' | 'inactive') => {
    try {
      await categoriesApi.updateCategoryStatus(id, status);
      message.success('状态更新成功');
      await refreshCategories();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCategory) {
        await categoriesApi.updateCategory(editingCategory.id, values);
        message.success('更新成功');
      } else {
        await categoriesApi.createCategory(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      await refreshCategories();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <FolderOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: '关联剧本数',
      dataIndex: 'script_count',
      key: 'script_count',
      width: 120,
      render: (count: number) => (
        <Tag color="blue">{count} 个</Tag>
      )
    },
    {
      title: '已上架剧本数',
      dataIndex: 'published_count',
      key: 'published_count',
      width: 140,
      render: (count: number) => (
        <Tag color="success">{count} 个</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: 'active' | 'inactive') => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: CategoryWithCount) => (
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
            title={record.status === 'active' ? '确定停用该分类吗？' : '确定启用该分类吗？'}
            description={record.status === 'active' ? '停用后该分类将不可用' : '启用后该分类将恢复可用'}
            onConfirm={() => handleStatusChange(record.id, record.status === 'active' ? 'inactive' : 'active')}
            okText="确定"
            cancelText="取消"
          >
            <Switch
              checked={record.status === 'active'}
              checkedChildren="启用"
              unCheckedChildren="停用"
              size="small"
            />
          </Popconfirm>
          <Popconfirm
            title="确定删除该分类吗？"
            description="删除后无法恢复"
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
          📁 分类管理
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
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增分类
          </Button>
        </div>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" maxLength={50} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryManagement;
