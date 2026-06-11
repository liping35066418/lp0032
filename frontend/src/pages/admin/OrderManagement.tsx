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
  DatePicker,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
  Card,
  Descriptions,
  List
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  RollbackOutlined,
  EyeOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  ordersApi,
  Order,
  OrderStatus,
  OrderType,
  PaginatedResponse,
  OrderItem
} from '../../api';
import { statusMap, orderTypeMap, paymentMethodMap } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface OrderWithDetails extends Order {
  user_name?: string;
  user_phone?: string;
  script_name?: string;
  start_time?: string;
  end_time?: string;
  items?: OrderItem[];
}

const OrderManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PaginatedResponse<OrderWithDetails> | null>(null);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 10,
    status: '' as OrderStatus | '',
    type: '' as OrderType | '',
    keyword: '',
    start_date: '',
    end_date: ''
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<OrderWithDetails | null>(null);
  const [refundingOrder, setRefundingOrder] = useState<OrderWithDetails | null>(null);
  const [refundForm] = Form.useForm<{ reason: string }>();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { ...queryParams };
      if (!params.status) delete params.status;
      if (!params.type) delete params.type;
      if (!params.keyword) delete params.keyword;
      if (!params.start_date) delete params.start_date;
      if (!params.end_date) delete params.end_date;

      const res = await ordersApi.getList(params);
      setOrders(res.data);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryParams]);

  const handleView = async (order: OrderWithDetails) => {
    try {
      const res = await ordersApi.getDetail(order.id);
      setViewingOrder(res.data);
      setDetailVisible(true);
    } catch (error: any) {
      message.error(error.message || '加载详情失败');
    }
  };

  const handleRefund = (order: OrderWithDetails) => {
    setRefundingOrder(order);
    refundForm.resetFields();
    setRefundVisible(true);
  };

  const confirmRefund = async () => {
    if (!refundingOrder) return;
    try {
      const values = await refundForm.validateFields();
      await ordersApi.refund(refundingOrder.id, values.reason);
      message.success('退款成功');
      setRefundVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '退款失败');
    }
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setQueryParams(prev => ({
        ...prev,
        page: 1,
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD')
      }));
    } else {
      setQueryParams(prev => ({
        ...prev,
        page: 1,
        start_date: '',
        end_date: ''
      }));
    }
  };

  const handleTableChange = (pagination: any) => {
    setQueryParams(prev => ({
      ...prev,
      page: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const getOrderTypeColor = (type: OrderType) => {
    const colors: Record<OrderType, string> = {
      ticket: 'blue',
      drink: 'green',
      package: 'purple',
      refund: 'red'
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string) => (
        <Space>
          <CreditCardOutlined style={{ color: '#1890ff' }} />
          <Text code>{text}</Text>
        </Space>
      )
    },
    {
      title: '用户',
      key: 'user',
      width: 120,
      render: (_: any, record: OrderWithDetails) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.user_name}</Text>
          {record.user_phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user_phone}</Text>
          )}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: OrderType) => (
        <Tag color={getOrderTypeColor(type)}>{orderTypeMap[type]}</Tag>
      )
    },
    {
      title: '剧本',
      dataIndex: 'script_name',
      key: 'script_name',
      width: 150,
      render: (text: string) => text || <Text type="secondary">-</Text>
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number, record: OrderWithDetails) => (
        <Text
          strong
          style={{ color: record.type === 'refund' ? '#52c41a' : '#f5222d' }}
        >
          {record.type === 'refund' ? '-' : '+'}¥{amount.toFixed(2)}
        </Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: OrderStatus) => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method?: string) => method ? paymentMethodMap[method] || method : <Text type="secondary">-</Text>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: OrderWithDetails) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            详情
          </Button>
          {record.status === 'paid' && record.type !== 'refund' && (
            <Popconfirm
              title="确定退款该订单吗？"
              description="退款后将生成退款订单，相关预订将被取消"
              onConfirm={() => handleRefund(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<RollbackOutlined />}
              >
                退款
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          📋 订单管理
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
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="搜索订单号、用户名"
              prefix={<SearchOutlined />}
              allowClear
              value={queryParams.keyword}
              onChange={(e) => setQueryParams(prev => ({ ...prev, page: 1, keyword: e.target.value }))}
              onPressEnter={(e) => setQueryParams(prev => ({ ...prev, page: 1, keyword: e.currentTarget.value }))}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="订单类型"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.type || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, type: value || '' }))}
            >
              <Option value="ticket">门票</Option>
              <Option value="drink">饮品</Option>
              <Option value="package">套餐</Option>
              <Option value="refund">退款</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="订单状态"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.status || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, status: value || '' }))}
            >
              <Option value="pending">待支付</Option>
              <Option value="paid">已支付</Option>
              <Option value="refunded">已退款</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateChange}
            />
          </Col>
          <Col xs={24} md={5}>
            <Space>
              <Button
                onClick={() => {
                  setQueryParams({
                    page: 1,
                    pageSize: 10,
                    status: '',
                    type: '',
                    keyword: '',
                    start_date: '',
                    end_date: ''
                  });
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={orders?.list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.pageSize,
            total: orders?.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条，合计金额: ¥${
              orders?.list.reduce((sum, order) => {
                return sum + (order.type === 'refund' ? -order.amount : order.amount);
              }, 0).toFixed(2)
            }`
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {viewingOrder && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单号" span={2}>
                {viewingOrder.order_no}
              </Descriptions.Item>
              <Descriptions.Item label="用户">
                {viewingOrder.user_name}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                {viewingOrder.user_phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="订单类型">
                <Tag color={getOrderTypeColor(viewingOrder.type)}>
                  {orderTypeMap[viewingOrder.type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <Text strong style={{ color: viewingOrder.type === 'refund' ? '#52c41a' : '#f5222d' }}>
                  {viewingOrder.type === 'refund' ? '-' : '+'}¥{viewingOrder.amount.toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={statusMap[viewingOrder.status]?.color}>
                  {statusMap[viewingOrder.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {viewingOrder.payment_method ? paymentMethodMap[viewingOrder.payment_method] || viewingOrder.payment_method : '-'}
              </Descriptions.Item>
              {viewingOrder.script_name && (
                <Descriptions.Item label="相关剧本" span={2}>
                  {viewingOrder.script_name}
                </Descriptions.Item>
              )}
              {viewingOrder.start_time && (
                <Descriptions.Item label="场次时间" span={2}>
                  {dayjs(viewingOrder.start_time).format('YYYY-MM-DD HH:mm')} - {dayjs(viewingOrder.end_time).format('HH:mm')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(viewingOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {viewingOrder.paid_at && (
                <Descriptions.Item label="支付时间" span={2}>
                  {dayjs(viewingOrder.paid_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {viewingOrder.items && viewingOrder.items.length > 0 && (
              <div>
                <Title level={5} style={{ marginBottom: 12 }}>订单明细</Title>
                <List
                  size="small"
                  dataSource={viewingOrder.items}
                  renderItem={(item: OrderItem) => (
                    <List.Item key={item.id}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <Text strong>{item.item_name}</Text>
                          <Text type="secondary">x{item.quantity}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ¥{item.unit_price.toFixed(2)}
                          </Text>
                        </Space>
                        <Text strong>¥{item.subtotal.toFixed(2)}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="确认退款"
        open={refundVisible}
        onOk={confirmRefund}
        onCancel={() => setRefundVisible(false)}
        okText="确认退款"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        {refundingOrder && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>订单号: <Text code>{refundingOrder.order_no}</Text></Text>
              <Text>退款金额: <Text strong style={{ color: '#52c41a' }}>¥{refundingOrder.amount.toFixed(2)}</Text></Text>
              <Text type="danger">⚠️ 退款后相关预订将被自动取消</Text>
            </Space>
          </div>
        )}
        <Form form={refundForm} layout="vertical">
          <Form.Item
            name="reason"
            label="退款原因"
          >
            <Input.TextArea rows={3} placeholder="请输入退款原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderManagement;
