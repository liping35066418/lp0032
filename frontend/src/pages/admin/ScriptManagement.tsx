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
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UpOutlined,
  DownOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { scriptsApi, Script, ScriptStatus, ScriptDifficulty, PaginatedResponse } from '../../api';
import { statusMap, difficultyMap } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ScriptFormData {
  name: string;
  description?: string;
  category: string;
  difficulty: ScriptDifficulty;
  min_players: number;
  max_players: number;
  duration: number;
  base_price: number;
  cover_image?: string;
  tags?: string;
  materials?: string;
  author?: string;
  publisher?: string;
  status: ScriptStatus;
}

const ScriptManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<PaginatedResponse<Script> | null>(null);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 10,
    keyword: '',
    category: '',
    difficulty: '',
    status: '' as ScriptStatus | ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [form] = Form.useForm<ScriptFormData>();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { ...queryParams };
      if (!params.keyword) delete params.keyword;
      if (!params.category) delete params.category;
      if (!params.difficulty) delete params.difficulty;
      if (!params.status) delete params.status;

      const [scriptsRes, categoriesRes] = await Promise.all([
        scriptsApi.getList(params),
        scriptsApi.getCategories()
      ]);
      setScripts(scriptsRes.data);
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
    setEditingScript(null);
    form.resetFields();
    form.setFieldsValue({ status: 'draft' });
    setModalVisible(true);
  };

  const handleEdit = (script: Script) => {
    setEditingScript(script);
    form.setFieldsValue(script);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await scriptsApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: ScriptStatus) => {
    try {
      await scriptsApi.updateStatus(id, status);
      message.success('状态更新成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const handleBatchStatus = async (status: ScriptStatus) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的剧本');
      return;
    }
    try {
      await scriptsApi.batchUpdateStatus(selectedRowKeys as number[], status);
      message.success(`成功更新 ${selectedRowKeys.length} 个剧本`);
      setSelectedRowKeys([]);
      loadData();
    } catch (error: any) {
      message.error(error.message || '批量操作失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingScript) {
        await scriptsApi.update(editingScript.id, values);
        message.success('更新成功');
      } else {
        await scriptsApi.create(values);
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
      title: '封面',
      dataIndex: 'cover_image',
      key: 'cover_image',
      width: 80,
      render: (image: string) => (
        image ? (
          <Image
            width={60}
            height={80}
            src={image}
            style={{ borderRadius: 4, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 80,
              background: '#f0f0f0',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24
            }}
          >
            📖
          </div>
        )
      )
    },
    {
      title: '剧本名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Script) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.tags && (
            <Space size={4}>
              {record.tags.split(',').map((tag, i) => (
                <Tag key={i} color="blue" style={{ margin: 0, fontSize: 10 }}>
                  {tag.trim()}
                </Tag>
              ))}
            </Space>
          )}
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => <Tag color="purple">{category}</Tag>
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: ScriptDifficulty) => {
        const info = difficultyMap[difficulty];
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '人数',
      key: 'players',
      width: 100,
      render: (_: any, record: Script) => (
        <Text>{record.min_players}-{record.max_players}人</Text>
      )
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number) => <Text>{duration}分钟</Text>
    },
    {
      title: '价格',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 100,
      render: (price: number) => <Text strong style={{ color: '#f5222d' }}>¥{price}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ScriptStatus) => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Script) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<UpOutlined />}
              onClick={() => handleStatusChange(record.id, 'published')}
            >
              上架
            </Button>
          )}
          {record.status === 'published' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DownOutlined />}
              onClick={() => handleStatusChange(record.id, 'offline')}
            >
              下架
            </Button>
          )}
          {record.status === 'offline' && (
            <Button
              type="link"
              size="small"
              icon={<UpOutlined />}
              onClick={() => handleStatusChange(record.id, 'published')}
            >
              上架
            </Button>
          )}
          <Popconfirm
            title="确定删除该剧本吗？"
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

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          📖 剧本管理
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
              placeholder="搜索剧本名称、描述、标签"
              prefix={<SearchOutlined />}
              allowClear
              value={queryParams.keyword}
              onChange={(e) => setQueryParams(prev => ({ ...prev, keyword: e.target.value }))}
              onPressEnter={(e) => handleSearch(e.currentTarget.value)}
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
              placeholder="选择难度"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.difficulty || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, difficulty: value || '' }))}
            >
              <Option value="easy">简单</Option>
              <Option value="medium">中等</Option>
              <Option value="hard">困难</Option>
              <Option value="nightmare">噩梦</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={queryParams.status || undefined}
              onChange={(value) => setQueryParams(prev => ({ ...prev, page: 1, status: value || '' }))}
            >
              <Option value="draft">草稿</Option>
              <Option value="published">已上架</Option>
              <Option value="offline">已下架</Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增剧本
              </Button>
            </Space>
          </Col>
        </Row>

        {selectedRowKeys.length > 0 && (
          <Row style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Col span={24}>
              <Space>
                <Text>已选择 <Text strong>{selectedRowKeys.length}</Text> 项</Text>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleBatchStatus('published')}
                >
                  批量上架
                </Button>
                <Button
                  size="small"
                  onClick={() => handleBatchStatus('offline')}
                >
                  批量下架
                </Button>
                <Button
                  size="small"
                  onClick={() => setSelectedRowKeys([])}
                >
                  取消选择
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      <Card bordered={false}>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={scripts?.list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.pageSize,
            total: scripts?.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingScript ? '编辑剧本' : '新增剧本'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'draft' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="剧本名称"
                rules={[{ required: true, message: '请输入剧本名称' }]}
              >
                <Input placeholder="请输入剧本名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select
                  placeholder="请选择或输入分类"
                  mode={undefined as any}
                  allowClear
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <Checkbox onChange={(e) => {
                          if (e.target.checked) {
                            const input = document.createElement('input');
                            input.placeholder = '输入新分类';
                            input.style.width = '100%';
                            input.onblur = function() {
                              if (input.value) {
                                form.setFieldsValue({ category: input.value });
                              }
                            };
                            e.target.parentElement!.innerHTML = '';
                            e.target.parentElement!.appendChild(input);
                            input.focus();
                          }
                        }}>
                          添加新分类
                        </Checkbox>
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
            <Col span={8}>
              <Form.Item
                name="difficulty"
                label="难度"
                rules={[{ required: true, message: '请选择难度' }]}
              >
                <Select placeholder="请选择难度">
                  <Option value="easy">简单</Option>
                  <Option value="medium">中等</Option>
                  <Option value="hard">困难</Option>
                  <Option value="nightmare">噩梦</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="min_players"
                label="最少人数"
                rules={[{ required: true, message: '请输入最少人数' }]}
              >
                <InputNumber min={2} max={20} style={{ width: '100%' }} placeholder="最少人数" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="max_players"
                label="最多人数"
                rules={[{ required: true, message: '请输入最多人数' }]}
              >
                <InputNumber min={2} max={20} style={{ width: '100%' }} placeholder="最多人数" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration"
                label="时长(分钟)"
                rules={[{ required: true, message: '请输入时长' }]}
              >
                <InputNumber min={30} step={30} style={{ width: '100%' }} placeholder="游戏时长" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="base_price"
                label="价格(元)"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber min={0} step={10} style={{ width: '100%' }} placeholder="基础价格" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="cover_image"
            label="封面图片URL"
          >
            <Input placeholder="请输入封面图片链接" />
          </Form.Item>

          <Form.Item
            name="description"
            label="剧本描述"
          >
            <TextArea rows={3} placeholder="请输入剧本描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Input placeholder="多个标签用逗号分隔" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="materials"
                label="配套材料"
              >
                <Input placeholder="配套材料清单" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="author"
                label="作者"
              >
                <Input placeholder="剧本作者" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="publisher"
                label="发行商"
              >
                <Input placeholder="发行商" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="draft">草稿</Option>
              <Option value="published">已上架</Option>
              <Option value="offline">已下架</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScriptManagement;
