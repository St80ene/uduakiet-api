// import { PaginationMeta } from '../dto/pagination-query.dto';

// export interface ApiResponseData<T> {
//   [key: string]: T[];
//   meta: PaginationMeta;
// }
export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data?: T;
  error?: any;
}

export function successResponse<T>(message: string, data?: T): ApiResponse<T> {
  return {
    status: true,
    message,
    data,
  };
}

export function errorResponse(
  message: string,
  error?: unknown,
): ApiResponse<null> {
  return {
    status: false,
    message,
    error,
  };
}
