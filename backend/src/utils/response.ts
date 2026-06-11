import { Response } from 'express';

export function success<T>(res: Response, data: T, message = '操作成功') {
  return res.json({
    code: 0,
    message,
    data
  });
}

export function error(res: Response, message: string, code = 1, status = 400) {
  return res.status(status).json({
    code,
    message,
    data: null
  });
}

export function paginated<T>(res: Response, data: T[], total: number, page: number, pageSize: number, message = '获取成功') {
  return res.json({
    code: 0,
    message,
    data: {
      list: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  });
}
