import { HttpStatus } from './httpStatus.js';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Invalid request', details?: unknown): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(HttpStatus.CONFLICT, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS', message);
  }
}