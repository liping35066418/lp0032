# 剧本杀门店综合运营平台

一个功能完整的剧本杀门店运营管理系统，支持剧本管理、场次编排、拼场组队、消费结算等全流程。

## 系统架构

- **后端服务**: Node.js + Express + TypeScript + SQLite (端口: 8672)
- **前端页面**: React + TypeScript + Vite + Ant Design (端口: 3672)
- **双端口独立运行**: 前后端完全分离，运行资源独立

## 功能特性

### 🎭 剧本管理
- 题材分类、难度标签、人数适配、时长标注
- 剧本资料批量维护与状态上下架
- 支持封面、标签、作者、出版社等信息管理

### 📅 场次编排
- 房间、主持人、时间段三方绑定
- 自动校验场地与人员占用冲突
- 状态流转：待确认 → 已确认 → 进行中 → 已完成 / 已取消

### 👥 拼场组队
- 玩家自主组队报名
- 人数补齐实时提醒
- 满员后自动锁定场次

### 💰 消费结算
- 到店核验、开场计时、结束结算全流程
- 到店消费与饮品附加消费合并计价
- 支持临时改场、取消场次、费用退回

### 👤 多角色权限
- **店长**: 全功能管理，数据统计汇总
- **主持人**: 场次管理、玩家核验、现场结算
- **玩家**: 剧本浏览、拼场报名、订单管理

### 📊 数据统计
- 营收趋势分析
- 剧本销量排行
- 主持人绩效统计
- 房间利用率分析
- 分类营收占比

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 初始化数据库（可选，包含测试数据）

```bash
npm run seed
```

### 3. 启动开发环境

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend   # 后端: http://localhost:8672
npm run dev:frontend  # 前端: http://localhost:3672
```

### 4. 访问系统

- 前端地址: http://localhost:3672
- 后端API: http://localhost:8672/api
- 健康检查: http://localhost:8672/api/health

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 店长 | admin | 123456 |
| 主持人 | host1 | 123456 |
| 主持人 | host2 | 123456 |
| 玩家 | player1 | 123456 |
| 玩家 | player2 | 123456 |

## 项目结构

```
.
├── backend/                    # 后端服务 (8672端口)
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   ├── database/          # 数据库模型和初始化
│   │   ├── middleware/        # 中间件
│   │   ├── routes/            # API路由
│   │   ├── utils/             # 工具函数
│   │   ├── server.ts          # 服务入口
│   │   └── seed.ts            # 数据种子
│   ├── data/                  # SQLite数据库文件
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # 前端页面 (3672端口)
│   ├── src/
│   │   ├── api/               # API接口
│   │   ├── layouts/           # 布局组件
│   │   ├── pages/             # 页面组件
│   │   │   ├── admin/         # 店长视图
│   │   │   ├── host/          # 主持人视图
│   │   │   └── player/        # 玩家视图
│   │   ├── store/             # 状态管理
│   │   ├── types/             # 类型定义
│   │   └── main.tsx           # 入口文件
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── package.json               # 根目录配置
```

## API接口

### 认证模块
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息

### 剧本模块
- `GET /api/scripts` - 获取剧本列表
- `GET /api/scripts/categories` - 获取剧本分类
- `GET /api/scripts/:id` - 获取剧本详情
- `POST /api/scripts` - 创建剧本
- `PUT /api/scripts/:id` - 更新剧本
- `PATCH /api/scripts/:id/status` - 更新剧本状态
- `POST /api/scripts/batch/status` - 批量更新状态
- `DELETE /api/scripts/:id` - 删除剧本

### 场次模块
- `GET /api/schedules` - 获取场次列表
- `GET /api/schedules/available` - 获取可拼场列表
- `GET /api/schedules/:id` - 获取场次详情
- `POST /api/schedules` - 创建场次
- `PUT /api/schedules/:id` - 更新场次
- `POST /api/schedules/:id/book` - 预订场次
- `POST /api/schedules/:id/start` - 开始场次
- `POST /api/schedules/:id/end` - 结束场次
- `POST /api/schedules/:id/cancel` - 取消场次

### 预订模块
- `GET /api/bookings` - 获取预订列表
- `GET /api/bookings/my` - 获取我的预订
- `GET /api/bookings/:id` - 获取预订详情
- `POST /api/bookings/:id/checkin` - 核验入场
- `POST /api/bookings/:id/cancel` - 取消预订
- `PUT /api/bookings/:id` - 修改预订

### 订单模块
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/my` - 获取我的订单
- `GET /api/orders/:id` - 获取订单详情
- `POST /api/orders/:id/pay` - 支付订单
- `POST /api/orders/:id/refund` - 退款
- `POST /api/orders/onsite` - 现场结算

### 统计模块
- `GET /api/statistics/overview` - 数据概览
- `GET /api/statistics/revenue` - 营收趋势
- `GET /api/statistics/scripts` - 剧本统计
- `GET /api/statistics/hosts` - 主持人统计
- `GET /api/statistics/rooms` - 房间统计
- `GET /api/statistics/daily` - 每日统计

## 核心业务流程

### 场次排期流程
1. 店长/主持人创建场次，选择剧本、房间、主持人、时间段
2. 系统自动校验房间和主持人是否有时间冲突
3. 场次创建成功，状态为"待确认"
4. 玩家报名拼场，人数达到上限后自动锁定并确认为"已确认"

### 玩家拼场流程
1. 玩家浏览可拼场场次
2. 选择场次，填写预订人数和同行人姓名
3. 系统生成订单，玩家完成支付
4. 到店后主持人核验入场
5. 游戏结束，订单完成

### 现场结算流程
1. 主持人开始场次，记录开始时间
2. 游戏过程中可添加饮品等附加消费
3. 结束场次，系统自动计算时长和费用
4. 合并剧本费用和附加消费，生成最终结算单
5. 玩家完成支付

## 技术栈

### 后端
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **数据验证**: Zod

### 前端
- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **UI组件**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router 6
- **图表**: ECharts
- **HTTP客户端**: Axios
- **日期处理**: Day.js

## 生产部署

```bash
# 构建
npm run build

# 启动后端服务
npm run start:backend

# 启动前端服务
npm run start:frontend
```

## 许可证

MIT License
