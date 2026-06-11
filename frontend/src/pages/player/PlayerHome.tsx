import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Carousel,
  List,
  Avatar,
  message,
  Skeleton,
  Progress,
  Statistic
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  RightOutlined,
  FireOutlined,
  StarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { scriptApi, Script, ScriptCategory } from '../../api/scripts';
import { scheduleApi, ScheduleWithDetails } from '../../api/schedules';

const PlayerHome: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendedScripts, setRecommendedScripts] = useState<Script[]>([]);
  const [hotSchedules, setHotSchedules] = useState<ScheduleWithDetails[]>([]);
  const [categories, setCategories] = useState<ScriptCategory[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scriptsRes, schedulesRes, categoriesRes] = await Promise.all([
        scriptApi.getList({ status: 'published', pageSize: 8 }),
        scheduleApi.getAvailable({ pageSize: 6 }),
        scriptApi.getCategories()
      ]);
      setRecommendedScripts(scriptsRes.data.list);
      setHotSchedules(schedulesRes.data.list);
      setCategories(categoriesRes.data);
    } catch (error: any) {
      message.error(error.message || '获取数据失败');
    } finally {
      setLoading(false);
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

  const getProgressPercent = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const banners = [
    {
      id: 1,
      title: '新店开业',
      subtitle: '全场剧本8折优惠',
      image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1200&h=400&fit=crop',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 2,
      title: '热门新本',
      subtitle: '《迷雾山庄》震撼上线',
      image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1200&h=400&fit=crop',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 3,
      title: '周末拼场',
      subtitle: '立即预约，享专属折扣',
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&h=400&fit=crop',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];

  return (
    <div>
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }}>
        <Carousel autoplay effect="fade">
          {banners.map((banner) => (
            <div key={banner.id}>
              <div
                style={{
                  height: 240,
                  background: banner.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${banner.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.3
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  <h2 style={{ color: '#fff', fontSize: 32, marginBottom: 8, fontWeight: 'bold' }}>
                    {banner.title}
                  </h2>
                  <p style={{ color: '#fff', fontSize: 18, opacity: 0.9 }}>
                    {banner.subtitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </Card>

      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#ff4d4f' }} />
            <span>热门拼场</span>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/schedules')}>
            查看全部 <RightOutlined />
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Skeleton loading={loading} active paragraph={{ rows: 3 }}>
          {hotSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <CalendarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>暂无可拼场的场次</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {hotSchedules.map((schedule) => (
                <Col xs={24} sm={12} lg={8} key={schedule.id}>
                  <Card
                    hoverable
                    onClick={() => navigate('/schedules')}
                    bodyStyle={{ padding: 16 }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{schedule.script_name}</span>
                        <Tag color="blue">{schedule.script_category}</Tag>
                      </Space>
                    </div>
                    <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
                      <Space>
                        <ClockCircleOutlined />
                        <span>{dayjs(schedule.start_time).format('MM-DD HH:mm')}</span>
                      </Space>
                      <Space>
                        <EnvironmentOutlined />
                        <span>{schedule.room_name}</span>
                      </Space>
                      <Space>
                        <UserOutlined />
                        <span>主持人: {schedule.host_name}</span>
                      </Space>
                    </Space>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#888' }}>拼场进度</span>
                        <span style={{ color: '#1890ff', fontWeight: 500 }}>
                          {schedule.current_players}/{schedule.max_players}人
                        </span>
                      </div>
                      <Progress
                        percent={getProgressPercent(schedule.current_players, schedule.max_players)}
                        showInfo={false}
                        size="small"
                        strokeColor="#1890ff"
                      />
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <span style={{ color: '#ff4d4f', fontSize: 20, fontWeight: 'bold' }}>
                        ¥{schedule.base_price}
                      </span>
                      <span style={{ color: '#888', marginLeft: 4 }}>/人</span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Skeleton>
      </Card>

      <Card
        title={
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            <span>推荐剧本</span>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/scripts')}>
            查看全部 <RightOutlined />
          </Button>
        }
      >
        <Skeleton loading={loading} active paragraph={{ rows: 3 }}>
          {recommendedScripts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <StarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>暂无推荐剧本</p>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {recommendedScripts.map((script) => (
                <Col xs={24} sm={12} lg={6} key={script.id}>
                  <Card
                    hoverable
                    cover={
                      <div
                        style={{
                          height: 180,
                          background: script.cover_image
                            ? `url(${script.cover_image}) center/cover`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 24,
                          fontWeight: 'bold'
                        }}
                      >
                        {!script.cover_image && script.name.charAt(0)}
                      </div>
                    }
                    onClick={() => navigate('/scripts')}
                    bodyStyle={{ padding: 12 }}
                  >
                    <Card.Meta
                      title={
                        <Space>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{script.name}</span>
                          {getDifficultyTag(script.difficulty)}
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                            {script.category} · {script.duration}分钟
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Space size={4}>
                              <TeamOutlined style={{ fontSize: 12 }} />
                              <span style={{ fontSize: 12 }}>
                                {script.min_players}-{script.max_players}人
                              </span>
                            </Space>
                            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                              ¥{script.base_price}
                            </span>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Skeleton>
      </Card>

      {categories.length > 0 && (
        <Card
          title="剧本分类"
          style={{ marginTop: 16 }}
        >
          <Row gutter={[8, 8]}>
            {categories.map((category) => (
              <Col key={category.name}>
                <Tag
                  color="blue"
                  style={{
                    fontSize: 14,
                    padding: '4px 12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate('/scripts', { state: { category: category.name } })}
                >
                  {category.name} ({category.count})
                </Tag>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};

export default PlayerHome;
