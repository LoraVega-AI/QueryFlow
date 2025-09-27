// Standardized API Response Utilities
// Ensures consistent response format across all endpoints

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  count?: number;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  timestamp: string;
  details?: string;
  code?: string;
}

export class ApiResponseBuilder {
  static success<T>(data: T, message: string = 'Success', count?: number): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(count !== undefined && { count })
    };
  }

  static error(message: string, error: string, statusCode: number = 500, details?: string): ApiError {
    return {
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(statusCode && { code: statusCode.toString() })
    };
  }

  static validationError(message: string, details?: string): ApiError {
    return this.error(message, 'Validation failed', 400, details);
  }

  static notFoundError(resource: string): ApiError {
    return this.error(`${resource} not found`, 'Resource not found', 404);
  }

  static serverError(message: string = 'Internal server error', details?: string): ApiError {
    return this.error(message, 'Internal server error', 500, details);
  }

  static unauthorizedError(message: string = 'Unauthorized'): ApiError {
    return this.error(message, 'Unauthorized', 401);
  }

  static forbiddenError(message: string = 'Forbidden'): ApiError {
    return this.error(message, 'Forbidden', 403);
  }

  static withPagination<T>(
    data: T[], 
    limit: number, 
    offset: number, 
    total: number, 
    message: string = 'Success'
  ): ApiResponse<T[]> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      count: data.length,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    };
  }
}

// Common validation functions
export class ApiValidator {
  static validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  }

  static validateString(value: any, fieldName: string, minLength: number = 1, maxLength?: number): void {
    this.validateRequired(value, fieldName);
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
    if (value.length < minLength) {
      throw new Error(`${fieldName} must be at least ${minLength} characters long`);
    }
    if (maxLength && value.length > maxLength) {
      throw new Error(`${fieldName} must be no more than ${maxLength} characters long`);
    }
  }

  static validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
    this.validateRequired(value, fieldName);
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`${fieldName} must be a valid number`);
    }
    if (min !== undefined && num < min) {
      throw new Error(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && num > max) {
      throw new Error(`${fieldName} must be no more than ${max}`);
    }
  }

  static validateEmail(value: any, fieldName: string): void {
    this.validateString(value, fieldName);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error(`${fieldName} must be a valid email address`);
    }
  }

  static validateEnum(value: any, fieldName: string, allowedValues: string[]): void {
    this.validateRequired(value, fieldName);
    if (!allowedValues.includes(value)) {
      throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
  }

  static validateArray(value: any, fieldName: string, minLength: number = 0): void {
    this.validateRequired(value, fieldName);
    if (!Array.isArray(value)) {
      throw new Error(`${fieldName} must be an array`);
    }
    if (value.length < minLength) {
      throw new Error(`${fieldName} must contain at least ${minLength} items`);
    }
  }
}
