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
  Card,
  Image,
  Progress,
  Popover
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  CoffeeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { drinksApi, Drink, PaginatedResponse } from '../../api';
import { statusMap } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DrinkFormData {
  name: string;
  category?: string;
  price: number;
  image?: string;
  description?: string;
  status: 'active' | 'inactive';
  stock: number;
}

interface StockFormData {
  stock?: number;
  change?: number;
}

const DrinkManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [drinks, setDrinks] = useState<PaginatedResponse<Drink> | null>(null);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    category: '',
    status: 'all' as 'active' | 'inactive' | 'all'
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [stockDrink, setStockDrink] = useState<Drink | null>(null);
  const [form] = Form.useForm<DrinkFormData>();
  const [stockForm] = Form.useForm<StockFormData>();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { ...queryParams };
      if (!params.keyword) delete params.keyword;
      if (!params.category) delete params.category;
      if (params.status === 'all') delete params.status;

      const [drinksRes, categoriesRes] = await Promise.all([
        drinksApi.getList(params),
        drinksApi.getCategories()
      ]);
      setDrinks(drinksRes.data);
      setCategories(categoriesRes.data);
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
    setEditingDrink(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', stock: 0 });
    setModalVisible(true);
  };

  const handleEdit = (drink: Drink) => {
    setEditingDrink(drink);
    form.setFieldsValue(drink);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await drinksApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: 'active' | 'inactive') => {
    try {
      await drinksApi.update(id, { status });
      message.success('状态更新成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const handleStock = (drink: Drink) => {
    setStockDrink(drink);
    stockForm.resetFields();
    setStockModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingDrink) {
        await drinksApi.update(editingDrink.id, values);
        message.success('更新成功');
      } else {
        await drinksApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
    }
  };

  const handleStockSubmit = async () => {
    if (!stockDrink) return;
    try {
      const values = await stockForm.validateFields();
      await drinksApi.updateStock(stockDrink.id, values);
      message.success('库存更新成功');
      setStockModalVisible(false);
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

  const getStockProgress = (stock: number) => {
    if (stock === 0) return { percent: 0, status: 'exception' as const };
    if (stock < 10) return { percent: 30, status: 'exception' as const };
    if (stock < 50) return { percent: 60, status: 'active' as const };
    return { percent: 100, status: 'success' as const };
  };

  const columns = [
    {
      title: '图片',
      dataIndex: 'image',
      key: 'image',
      width: 80,
      render: (image: string, record: Drink) => (
        image ? (
          <Image
            width={60}
            height={60}
            src={image}
            style={{ borderRadius: 4, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: '#f0f0f0',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24
            }}
          >
            <CoffeeOutlined style={{ color: '#999' }} />
          </div>
        )
      )
    },
    {
      title: '饮品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Drink) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.category && (
            <Tag color="green" style={{ margin: 0, fontSize: 10 }}>
              {record.category}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => (
        <Text strong style={{ color: '#f5222d', fontSize: 16 }}>¥{price.toFixed(2)}</Text>
      )
    },
    {
      title: '库存',
      key: 'stock',
      width: 200,
      render: (_: any, record: Drink) => {
        const stockInfo = getStockProgress(record.stock);
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <InboxOutlined style={{ color: '#999' }} />
                <Text>库存: <Text strong>{record.stock}</Text></Text>
              </Space>
              <Button
                type="link"
                size="small"
                onClick={() => handleStock(record)}
              >
                调整库存
              </Button>
            </Space>
            <Progress
              {...stockInfo}
              showInfo={false}
              size="small"
            />
            {record.stock < 10 && (
              <Text type="danger" style={{ fontSize: 11 }}>
                库存不足，请及时补货
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: 'active' | 'inactive') => {
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
      width: 180,
      render: (_: any, record: Drink) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popover
            content={
              <Space direction="vertical" size="small">
                <Button
                  type="link"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  onClick={() => handleStock(record)}
                >
                  入库
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<ArrowDownOutlined />}
                  onClick={() => handleStock(record)}
                >
                  出库
                </Button>
              </Space>
            }
            trigger="click"
          >
            <Button type="link" size="small">
              库存操作
            </Button>
          </Popover>
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleStatusChange(record.id, 'inactive')}
            >
              下架
            </Button>
          )}
          {record.status === 'inactive' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleStatusChange(record.id, 'active')}
            >
              上架
            </Button>
          )}
          <Popconfirm
            title="确定删除该饮品吗？"
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
          ☕ 饮品管理
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
              placeholder="搜索饮品名称、描述"
              prefix={<SearchOutlined />}
              allowClear
              value={queryParams.keyword}
              onChange={(e) => setQueryParams(prev => ({ ...prev, page: 1, keyword: e.target.value }))}
              onPressEnter={(e) => setQueryParams(prev => ({ ...prev, page: 1, keyword: e.currentTarget.value }))}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.category || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, category: value || '' }))}
            >
              {categories.map(cat => (
                <Option key={cat.name} value={cat.name}>{cat.name} ({cat.count})</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              value={queryParams.status}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, status: value }))}
            >
              <Option value="all">全部</Option>
              <Option value="active">上架</Option>
              <Option value="inactive">下架</Option>
            </Select>
          </Col>
          <Col xs={24} md={10}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增饮品
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={drinks?.list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.pageSize,
            total: drinks?.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingDrink ? '编辑饮品' : '新增饮品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'active', stock: 0 }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="饮品名称"
                rules={[{ required: true, message: '请输入饮品名称' }]}
              >
                <Input placeholder="请输入饮品名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="category"
                label="分类"
              >
                <Select
                  placeholder="请选择或输入分类"
                  allowClear
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <Button
                          type="text"
                          size="small"
                          block
                          onClick={() => {
                            const newCat = prompt('请输入新分类名称');
                            if (newCat) {
                              form.setFieldsValue({ category: newCat });
                            }
                          }}
                        >
                          + 添加新分类
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {categories.map(cat => (
                    <Option key={cat.name} value={cat.name}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="价格(元)"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  min={0}
                  step={0.5}
                  style={{ width: '100%' }}
                  placeholder="请输入价格"
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stock"
                label="库存数量"
                rules={[{ required: true, message: '请输入库存数量' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入库存数量"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="image"
            label="图片URL"
          >
            <Input placeholder="请输入饮品图片链接" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入饮品描述" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">上架</Option>
              <Option value="inactive">下架</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="调整库存"
        open={stockModalVisible}
        onOk={handleStockSubmit}
        onCancel={() => setStockModalVisible(false)}
        width={400}
        destroyOnClose
      >
        {stockDrink && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>饮品: <Text strong>{stockDrink.name}</Text></Text>
              <Text>当前库存: <Text strong>{stockDrink.stock}</Text></Text>
            </Space>
          </div>
        )}
        <Form form={stockForm} layout="vertical">
          <Form.Item
            name="change"
            label="库存变动"
            tooltip="正数为入库，负数为出库"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="输入变动数量，正数入库，负数出库"
              addonBefore={
                <Space>
                  <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                </Space>
              }
            />
          </Form.Item>
          <div style={{ textAlign: 'center', color: '#999', marginBottom: 16 }}>
            或
          </div>
          <Form.Item
            name="stock"
            label="直接设置库存"
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="直接设置库存数量"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DrinkManagement;
