import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Space,
  Typography,
  List,
  Tag,
  Statistic,
  Spin,
  Button,
  Table
} from 'antd';
import {
  ReloadOutlined,
  TrophyOutlined,
  UserOutlined,
  StarOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingOutlined,
  BookOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs, { Dayjs } from 'dayjs';
import {
  statisticsApi,
  RevenueData,
  ScriptStats,
  HostStats,
  CategoryStats
} from '../../api';
import { difficultyMap } from '../../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface DateRange {
  start_date: string;
  end_date: string;
}

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [scriptStats, setScriptStats] = useState<ScriptStats[]>([]);
  const [hostStats, setHostStats] = useState<HostStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day');
  const [dateRange, setDateRange] = useState<DateRange>({
    start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD')
  });
  const [activeTab, setActiveTab] = useState<'revenue' | 'scripts' | 'hosts' | 'categories'>('revenue');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      };

      const [revenueRes, scriptRes, hostRes, categoryRes] = await Promise.all([
        statisticsApi.getRevenue({ ...params, group_by: groupBy }),
        statisticsApi.getScriptStats(params),
        statisticsApi.getHostStats(params),
        statisticsApi.getCategoryStats()
      ]);

      setRevenueData(revenueRes.data.reverse());
      setScriptStats(scriptRes.data);
      setHostStats(hostRes.data);
      setCategoryStats(categoryRes.data);
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, groupBy]);

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange({
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD')
      });
    }
  };

  const getRevenueChartOption = () => {
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const date = params[0].axisValue;
          let result = `<div style="font-weight:bold;margin-bottom:8px">${date}</div>`;
          params.forEach((param: any) => {
            result += `<div style="display:flex;justify-content:space-between;gap:24px"><span>${param.marker}${param.seriesName}</span><span style="font-weight:bold">¥${param.value.toFixed(2)}</span></div>`;
          });
          return result;
        }
      },
      legend: {
        data: ['营收', '退款'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: revenueData.map(item => item.date)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      series: [
        {
          name: '营收',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
                { offset: 1, color: 'rgba(82, 196, 26, 0)' }
              ]
            }
          },
          lineStyle: {
            color: '#52c41a',
            width: 2
          },
          itemStyle: {
            color: '#52c41a'
          },
          data: revenueData.map(item => item.revenue)
        },
        {
          name: '退款',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0)' }
              ]
            }
          },
          lineStyle: {
            color: '#ff4d4f',
            width: 2
          },
          itemStyle: {
            color: '#ff4d4f'
          },
          data: revenueData.map(item => item.refund)
        }
      ]
    };
  };

  const getScriptChartOption = () => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      yAxis: {
        type: 'category',
        data: scriptStats.slice(0, 10).map(item => item.name).reverse()
      },
      series: [
        {
          name: '营收',
          type: 'bar',
          data: scriptStats.slice(0, 10).map(item => item.revenue).reverse(),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#722ed1' },
                { offset: 1, color: '#9254de' }
              ]
            },
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: '¥{c}'
          }
        }
      ]
    };
  };

  const getHostChartOption = () => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['带场次数', '服务玩家'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: hostStats.slice(0, 10).map(item => item.name).reverse()
      },
      series: [
        {
          name: '带场次数',
          type: 'bar',
          stack: 'total',
          data: hostStats.slice(0, 10).map(item => item.completed_count).reverse(),
          itemStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '服务玩家',
          type: 'bar',
          stack: 'total',
          data: hostStats.slice(0, 10).map(item => item.player_count).reverse(),
          itemStyle: {
            color: '#13c2c2'
          }
        }
      ]
    };
  };

  const getCategoryChartOption = () => {
    const data = categoryStats.map(item => ({
      value: item.revenue,
      name: item.name
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ¥{c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center'
      },
      series: [
        {
          name: '分类营收',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              formatter: '{b}\n¥{c}'
            }
          },
          labelLine: {
            show: false
          },
          data: data,
          color: ['#722ed1', '#1890ff', '#13c2c2', '#52c41a', '#faad14', '#fa8c16', '#eb2f96', '#f5222d']
        }
      ]
    };
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue - item.refund, 0);
  const totalOrders = revenueData.reduce((sum, item) => sum + item.order_count, 0);
  const totalScriptRevenue = scriptStats.reduce((sum, item) => sum + item.revenue, 0);

  const scriptColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => {
        const medals = ['🥇', '🥈', '🥉'];
        return <Text strong>{medals[index] || `#${index + 1}`}</Text>;
      }
    },
    {
      title: '剧本名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="purple">{category}</Tag>
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => {
        const info = difficultyMap[difficulty];
        return <Tag color={info?.color}>{info?.text}</Tag>;
      }
    },
    {
      title: '开本场次',
      dataIndex: 'schedule_count',
      key: 'schedule_count'
    },
    {
      title: '服务玩家',
      dataIndex: 'player_count',
      key: 'player_count'
    },
    {
      title: '营收',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => <Text strong style={{ color: '#f5222d' }}>¥{value.toFixed(2)}</Text>
    }
  ];

  const hostColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => {
        const medals = ['🥇', '🥈', '🥉'];
        return <Text strong>{medals[index] || `#${index + 1}`}</Text>;
      }
    },
    {
      title: '主持人',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: HostStats) => (
        <Space>
          <Text strong>{name}</Text>
          {record.avg_rating > 0 && (
            <Tag color="gold">
              <StarOutlined /> {record.avg_rating.toFixed(1)}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: '带场次数',
      dataIndex: 'completed_count',
      key: 'completed_count'
    },
    {
      title: '服务玩家',
      dataIndex: 'player_count',
      key: 'player_count'
    },
    {
      title: '评分',
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      render: (rating: number) => rating > 0 ? `${rating.toFixed(1)}` : '-'
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          📊 数据统计
        </Title>
        <Space>
          <RangePicker
            value={[dayjs(dateRange.start_date), dayjs(dateRange.end_date)]}
            onChange={handleDateChange}
          />
          <Select
            value={groupBy}
            onChange={setGroupBy}
            style={{ width: 120 }}
          >
            <Option value="day">按日</Option>
            <Option value="month">按月</Option>
            <Option value="year">按年</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8}>
            <Card bordered={false}>
              <Statistic
                title={<Space size="small"><DollarOutlined /> 总营收</Space>}
                value={totalRevenue}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card bordered={false}>
              <Statistic
                title={<span><ShoppingOutlined /> 订单数</span>}
                value={totalOrders}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card bordered={false}>
              <Statistic
                title={<span><BookOutlined /> 剧本营收</span>}
                value={totalScriptRevenue}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          bordered={false}
          tabList={[
            { key: 'revenue', label: '📈 营收趋势' },
            { key: 'scripts', label: '🎭 剧本排行' },
            { key: 'hosts', label: '🎤 主持人排行' },
            { key: 'categories', label: '🎯 分类占比' }
          ]}
          activeTabKey={activeTab}
          onTabChange={(key) => setActiveTab(key as any)}
        >
          {activeTab === 'revenue' && (
            <div>
              <ReactECharts
                option={getRevenueChartOption()}
                style={{ height: 400 }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          )}

          {activeTab === 'scripts' && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ReactECharts
                  option={getScriptChartOption()}
                  style={{ height: 400 }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </Col>
              <Col xs={24} lg={12}>
                <Table
                  dataSource={scriptStats}
                  columns={scriptColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Col>
            </Row>
          )}

          {activeTab === 'hosts' && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ReactECharts
                  option={getHostChartOption()}
                  style={{ height: 400 }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </Col>
              <Col xs={24} lg={12}>
                <Table
                  dataSource={hostStats}
                  columns={hostColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Col>
            </Row>
          )}

          {activeTab === 'categories' && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ReactECharts
                  option={getCategoryChartOption()}
                  style={{ height: 400 }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </Col>
              <Col xs={24} lg={12}>
                <List
                  dataSource={categoryStats}
                  renderItem={(item, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: ['#722ed1', '#1890ff', '#13c2c2', '#52c41a', '#faad14', '#fa8c16'][index % 6],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 'bold'
                            }}
                          >
                            {index + 1}
                          </div>
                        }
                        title={item.name}
                        description={
                          <Space>
                            <Tag>剧本数: {item.script_count}</Tag>
                            <Tag color="blue">场次: {item.schedule_count}</Tag>
                          </Space>
                        }
                      />
                      <Text strong style={{ color: '#f5222d' }}>
                        ¥{item.revenue.toFixed(2)}
                      </Text>
                    </List.Item>
                  )}
                />
              </Col>
            </Row>
          )}
        </Card>
      </Spin>
    </div>
  );
};

export default Statistics;
