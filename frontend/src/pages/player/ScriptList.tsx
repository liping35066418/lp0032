import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Slider,
  Drawer,
  Descriptions,
  List,
  message,
  Empty,
  Pagination
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  StarOutlined,
  BookOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { scriptApi, Script, ScriptCategory, ScriptDifficulty } from '../../api/scripts';
import { scheduleApi } from '../../api/schedules';

const { Search } = Input;
const { Option } = Select;

const ScriptList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12, total: 0 });
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [difficultyFilter, setDifficultyFilter] = useState<string>();
  const [playerCountFilter, setPlayerCountFilter] = useState<[number, number]>([1, 10]);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [relatedSchedules, setRelatedSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    if (location.state && (location.state as any).category) {
      setCategoryFilter((location.state as any).category);
    }
  }, [location.state]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [pagination.current, pagination.pageSize, keyword, categoryFilter, difficultyFilter, playerCountFilter]);

  const fetchCategories = async () => {
    try {
      const response = await scriptApi.getCategories();
      setCategories(response.data);
    } catch (error: any) {
      message.error(error.message || '获取分类失败');
    }
  };

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        status: 'published'
      };
      if (keyword) params.keyword = keyword;
      if (categoryFilter) params.category = categoryFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (playerCountFilter[0] > 1) params.minPlayers = playerCountFilter[0];
      if (playerCountFilter[1] < 10) params.maxPlayers = playerCountFilter[1];

      const response = await scriptApi.getList(params);
      setScripts(response.data.list);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error: any) {
      message.error(error.message || '获取剧本列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedSchedules = async (scriptId: number) => {
    setSchedulesLoading(true);
    try {
      const response = await scheduleApi.getAvailable({ script_id: scriptId, pageSize: 5 });
      setRelatedSchedules(response.data.list);
    } catch (error: any) {
      message.error(error.message || '获取场次失败');
    } finally {
      setSchedulesLoading(false);
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

  const handleViewDetail = async (script: Script) => {
    setCurrentScript(script);
    setDetailDrawerVisible(true);
    await fetchRelatedSchedules(script.id);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setCategoryFilter(undefined);
    setDifficultyFilter(undefined);
    setPlayerCountFilter([1, 10]);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Search
            placeholder="搜索剧本名称、描述、标签"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

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
                <Option key={cat.name} value={cat.name}>{cat.name} ({cat.count})</Option>
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

            <Button onClick={handleResetFilters}>重置筛选</Button>
          </Space>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap' }}>人数:</span>
            <Slider
              range
              min={1}
              max={10}
              value={playerCountFilter}
              style={{ flex: 1, maxWidth: 300 }}
              onChange={(value) => {
                setPlayerCountFilter(value as [number, number]);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
            />
            <span style={{ color: '#888', minWidth: 80 }}>
              {playerCountFilter[0]}-{playerCountFilter[1]}人
            </span>
          </div>
        </Space>
      </Card>

      <Card
        title={`剧本列表 (${pagination.total})`}
        style={{ marginTop: 16 }}
        loading={loading}
        bodyStyle={{ padding: 16 }}
      >
        {scripts.length === 0 ? (
          <Empty description="没有找到符合条件的剧本" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {scripts.map((script) => (
                <Col xs={24} sm={12} lg={6} key={script.id}>
                  <Card
                    hoverable
                    cover={
                      <div
                        style={{
                          height: 200,
                          background: script.cover_image
                            ? `url(${script.cover_image}) center/cover`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 32,
                          fontWeight: 'bold'
                        }}
                      >
                        {!script.cover_image && script.name.charAt(0)}
                      </div>
                    }
                    onClick={() => handleViewDetail(script)}
                    bodyStyle={{ padding: 12 }}
                  >
                    <Card.Meta
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{script.name}</span>
                          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{script.base_price}</span>
                        </div>
                      }
                      description={
                        <div>
                          <Space style={{ marginBottom: 8 }}>
                            <Tag color="blue">{script.category}</Tag>
                            {getDifficultyTag(script.difficulty)}
                          </Space>
                          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                            {script.description?.substring(0, 50)}...
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
                            <Space>
                              <TeamOutlined />
                              <span>{script.min_players}-{script.max_players}人</span>
                            </Space>
                            <Space>
                              <ClockCircleOutlined />
                              <span>{script.duration}分钟</span>
                            </Space>
                          </div>
                        </div>
                      }
                    />
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

      <Drawer
        title="剧本详情"
        placement="right"
        width={520}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        extra={
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => navigate('/schedules', { state: { script_id: currentScript?.id } })}
          >
            查看可约场次
          </Button>
        }
      >
        {currentScript && (
          <div>
            <div
              style={{
                height: 240,
                background: currentScript.cover_image
                  ? `url(${currentScript.cover_image}) center/cover`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 48,
                fontWeight: 'bold'
              }}
            >
              {!currentScript.cover_image && currentScript.name.charAt(0)}
            </div>

            <h2 style={{ marginBottom: 8 }}>{currentScript.name}</h2>
            <Space style={{ marginBottom: 16 }}>
              <Tag color="blue">{currentScript.category}</Tag>
              {getDifficultyTag(currentScript.difficulty)}
              <span style={{ color: '#ff4d4f', fontSize: 20, fontWeight: 'bold' }}>
                ¥{currentScript.base_price}/人
              </span>
            </Space>

            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="玩家人数">
                <TeamOutlined /> {currentScript.min_players}-{currentScript.max_players}人
              </Descriptions.Item>
              <Descriptions.Item label="游戏时长">
                <ClockCircleOutlined /> {currentScript.duration}分钟
              </Descriptions.Item>
              {currentScript.author && (
                <Descriptions.Item label="作者">{currentScript.author}</Descriptions.Item>
              )}
              {currentScript.publisher && (
                <Descriptions.Item label="发行">{currentScript.publisher}</Descriptions.Item>
              )}
            </Descriptions>

            {currentScript.description && (
              <Card title="剧本简介" size="small" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{currentScript.description}</p>
              </Card>
            )}

            {currentScript.tags && (
              <Card title="剧本标签" size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                  {currentScript.tags.split(',').map((tag, index) => (
                    <Tag key={index}>{tag.trim()}</Tag>
                  ))}
                </Space>
              </Card>
            )}

            <Card
              title="可预约场次"
              size="small"
              loading={schedulesLoading}
              extra={
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate('/schedules', { state: { script_id: currentScript?.id } })}
                >
                  查看全部
                </Button>
              }
            >
              {relatedSchedules.length === 0 ? (
                <Empty description="暂无可预约场次" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={relatedSchedules}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => navigate('/schedules', { state: { script_id: currentScript?.id } })}
                        >
                          预约
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={item.script_name}
                        description={
                          <Space>
                            <span>{item.start_time?.split('T')[0]} {item.start_time?.split('T')[1]?.substring(0, 5)}</span>
                            <Tag color="blue">{item.room_name}</Tag>
                            <span>{item.current_players}/{item.max_players}人</span>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ScriptList;
