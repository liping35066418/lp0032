import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  message,
  Descriptions,
  Empty,
  Pagination,
  Radio,
  List
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CreditCardOutlined,
  ReloadOutlined,
  EyeOutlined,
  PayCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { orderApi, OrderWithDetails, OrderItem } from '../../api/orders';

const { Option } = Select;

const MyOrders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>();
  const [typeFilter, setTypeFilter] = useState<string>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderWithDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize, statusFilter, typeFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await orderApi.getMyOrders(params);
      setOrders(response.data.list);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error: any) {
      message.error(error.message || '获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待支付' },
      paid: { color: 'green', text: '已支付' },
      refunded: { color: 'purple', text: '已退款' },
      cancelled: { color: 'default', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      ticket: { color: 'blue', text: '门票' },
      drink: { color: 'green', text: '饮品' },
      package: { color: 'purple', text: '套餐' },
      refund: { color: 'red', text: '退款' }
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPaymentMethodText = (method?: string) => {
    const methodMap: Record<string, string> = {
      wechat: '微信支付',
      alipay: '支付宝',
      onsite: '现场支付',
      auto: '自动退款',
      manual: '人工退款'
    };
    return methodMap[method || ''] || method || '-';
  };

  const handleViewDetail = async (order: OrderWithDetails) => {
    try {
      const response = await orderApi.getDetail(order.id);
      setCurrentOrder(response.data);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取详情失败');
    }
  };

  const handlePay = (order: OrderWithDetails) => {
    setCurrentOrder(order);
    setPaymentMethod('wechat');
    setPayModalVisible(true);
  };

  const handleConfirmPay = async () => {
    if (!currentOrder) return;

    setPayLoading(true);
    try {
      await orderApi.pay(currentOrder.id, paymentMethod);
      message.success('支付成功');
      setPayModalVisible(false);
      fetchOrders();
    } catch (error: any) {
      message.error(error.message || '支付失败');
    } finally {
      setPayLoading(false);
    }
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '商品',
      key: 'item',
      width: 180,
      render: (_: any, record: OrderWithDetails) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.script_name || '其他消费'}</div>
          <div style={{ marginTop: 4 }}>
            {getTypeTag(record.type)}
          </div>
        </div>
      )
    },
    {
      title: '时间',
      key: 'time',
      width: 180,
      render: (_: any, record: OrderWithDetails) => (
        <Space direction="vertical" size={0}>
          <span style={{ color: '#888' }}>
            创建: {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
          </span>
          {record.paid_at && (
            <span style={{ color: '#888' }}>
              支付: {dayjs(record.paid_at).format('YYYY-MM-DD HH:mm')}
            </span>
          )}
        </Space>
      )
    },
    {
      title: '场次信息',
      key: 'schedule',
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.start_time) return '-';
        return (
          <Space direction="vertical" size={0}>
            <span>{dayjs(record.start_time).format('YYYY-MM-DD')}</span>
            <span style={{ color: '#888' }}>
              {dayjs(record.start_time).format('HH:mm')} - {dayjs(record.end_time).format('HH:mm')}
            </span>
            {record.room_name && (
              <span style={{ color: '#888' }}>{record.room_name}</span>
            )}
          </Space>
        );
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: OrderWithDetails) => (
        <span
          style={{
            color: record.type === 'refund' ? '#52c41a' : '#ff4d4f',
            fontWeight: 'bold',
            fontSize: 16
          }}
        >
          {record.type === 'refund' ? '+' : '¥'}
          {amount.toFixed(2)}
        </span>
      )
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method?: string) => getPaymentMethodText(method)
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
      width: 160,
      render: (_: any, record: OrderWithDetails) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && record.type !== 'refund' && (
            <Button
              type="primary"
              size="small"
              icon={<PayCircleOutlined />}
              onClick={() => handlePay(record)}
            >
              支付
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title="我的订单"
        extra={
          <Space>
            <Select
              placeholder="类型筛选"
              style={{ width: 120 }}
              allowClear
              value={typeFilter}
              onChange={setTypeFilter}
            >
              <Option value="ticket">门票</Option>
              <Option value="drink">饮品</Option>
              <Option value="package">套餐</Option>
              <Option value="refund">退款</Option>
            </Select>
            <Select
              placeholder="状态筛选"
              style={{ width: 120 }}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="pending">待支付</Option>
              <Option value="paid">已支付</Option>
              <Option value="refunded">已退款</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchOrders}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="暂无订单记录" /> }}
        />

        {orders.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
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
        )}
      </Card>

      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {currentOrder && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="订单编号" span={2}>
                  <span style={{ fontFamily: 'monospace' }}>{currentOrder.order_no}</span>
                </Descriptions.Item>
                <Descriptions.Item label="订单类型">{getTypeTag(currentOrder.type)}</Descriptions.Item>
                <Descriptions.Item label="订单状态">{getStatusTag(currentOrder.status)}</Descriptions.Item>
                {currentOrder.script_name && (
                  <Descriptions.Item label="剧本名称">{currentOrder.script_name}</Descriptions.Item>
                )}
                {currentOrder.start_time && (
                  <Descriptions.Item label="场次时间">
                    {dayjs(currentOrder.start_time).format('YYYY-MM-DD HH:mm')} - {dayjs(currentOrder.end_time).format('HH:mm')}
                  </Descriptions.Item>
                )}
                {currentOrder.room_name && (
                  <Descriptions.Item label="房间">{currentOrder.room_name}</Descriptions.Item>
                )}
                {currentOrder.host_name && (
                  <Descriptions.Item label="主持人">{currentOrder.host_name}</Descriptions.Item>
                )}
                <Descriptions.Item label="创建时间">
                  {dayjs(currentOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                {currentOrder.paid_at && (
                  <Descriptions.Item label="支付时间">
                    {dayjs(currentOrder.paid_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                {currentOrder.payment_method && (
                  <Descriptions.Item label="支付方式">
                    {getPaymentMethodText(currentOrder.payment_method)}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="订单金额" span={2}>
                  <span
                    style={{
                      color: currentOrder.type === 'refund' ? '#52c41a' : '#ff4d4f',
                      fontWeight: 'bold',
                      fontSize: 20
                    }}
                  >
                    {currentOrder.type === 'refund' ? '+' : '¥'}
                    {currentOrder.amount.toFixed(2)}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {currentOrder.items && currentOrder.items.length > 0 && (
              <Card title="订单明细" size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 0 }}>
                <List
                  dataSource={currentOrder.items}
                  renderItem={(item: OrderItem) => (
                    <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                      <List.Item.Meta
                        title={item.item_name}
                        description={
                          <Space>
                            <Tag color="blue">{item.item_type}</Tag>
                            <span>单价: ¥{item.unit_price.toFixed(2)}</span>
                            <span>数量: {item.quantity}</span>
                          </Space>
                        }
                      />
                      <span style={{ fontWeight: 'bold' }}>¥{item.subtotal.toFixed(2)}</span>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
                {currentOrder.status === 'pending' && currentOrder.type !== 'refund' && (
                  <Button
                    type="primary"
                    icon={<PayCircleOutlined />}
                    onClick={() => {
                      setDetailModalVisible(false);
                      handlePay(currentOrder);
                    }}
                  >
                    立即支付
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="订单支付"
        open={payModalVisible}
        onOk={handleConfirmPay}
        onCancel={() => setPayModalVisible(false)}
        confirmLoading={payLoading}
        okText="确认支付"
        cancelText="取消"
        width={480}
      >
        {currentOrder && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="订单编号">
                  <span style={{ fontFamily: 'monospace' }}>{currentOrder.order_no}</span>
                </Descriptions.Item>
                <Descriptions.Item label="商品名称">
                  {currentOrder.script_name || '其他消费'}
                </Descriptions.Item>
                <Descriptions.Item label="支付金额">
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 24 }}>
                    ¥{currentOrder.amount.toFixed(2)}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>选择支付方式</div>
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio.Button value="wechat" style={{ width: '100%', padding: '12px 16px' }}>
                    <Space>
                      <span style={{ fontSize: 18 }}>💚</span>
                      <span>微信支付</span>
                    </Space>
                  </Radio.Button>
                  <Radio.Button value="alipay" style={{ width: '100%', padding: '12px 16px' }}>
                    <Space>
                      <span style={{ fontSize: 18 }}>💙</span>
                      <span>支付宝</span>
                    </Space>
                  </Radio.Button>
                </Space>
              </Radio.Group>
            </div>

            <div style={{ padding: 12, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
              <Space>
                <CreditCardOutlined style={{ color: '#fa8c16' }} />
                <span style={{ color: '#fa8c16' }}>
                  温馨提示：支付成功后将自动跳转，如需取消请在开场前24小时操作
                </span>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyOrders;
