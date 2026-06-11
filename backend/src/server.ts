import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import { initDatabase } from './database/schema';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import scriptRoutes from './routes/scripts';
import roomRoutes from './routes/rooms';
import scheduleRoutes from './routes/schedules';
import bookingRoutes from './routes/bookings';
import orderRoutes from './routes/orders';
import drinkRoutes from './routes/drinks';
import statisticsRoutes from './routes/statistics';

initDatabase();

const app = express();

app.use(cors({
  origin: ['http://localhost:3672', 'http://127.0.0.1:3672'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    message: '服务运行正常',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      port: PORT
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drinks', drinkRoutes);
app.use('/api/statistics', statisticsRoutes);

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    data: null
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`剧本杀门店综合运营平台后端服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
});

export default app;
