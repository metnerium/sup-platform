import { Response } from 'express';

export const success = (res: Response, data: any, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const error = (res: Response, message: string, statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export const created = (res: Response, data: any) => {
  return success(res, data, 201);
};

export const noContent = (res: Response) => {
  return res.status(204).send();
};

export const badRequest = (res: Response, message: string) => {
  return error(res, message, 400);
};

export const unauthorized = (res: Response, message: string = 'Unauthorized') => {
  return error(res, message, 401);
};

export const forbidden = (res: Response, message: string = 'Forbidden') => {
  return error(res, message, 403);
};

export const notFound = (res: Response, message: string = 'Not found') => {
  return error(res, message, 404);
};
