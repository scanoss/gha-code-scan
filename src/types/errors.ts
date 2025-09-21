// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
*/

/**
 * Base interface for all custom errors in the application
 */
export interface BaseError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Error codes for different types of application errors
 */
export enum ErrorCode {
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_REQUIRED_PARAM = 'MISSING_REQUIRED_PARAM',

  // API errors
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  SCANOSS_API_ERROR = 'SCANOSS_API_ERROR',
  DEPENDENCY_TRACK_ERROR = 'DEPENDENCY_TRACK_ERROR',

  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',

  // Processing errors
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ANNOTATION_ERROR = 'ANNOTATION_ERROR',

  // Network errors
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error implements BaseError {
  readonly name: string = 'AppError';
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Creates a formatted error message with context
   */
  toFormattedMessage(): string {
    let formatted = `${this.message}`;

    if (this.context) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      formatted += ` (${contextStr})`;
    }

    return formatted;
  }
}

/**
 * Configuration-related error
 */
export class ConfigError extends AppError {
  readonly name: string = 'ConfigError';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.INVALID_CONFIG, context);
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * API-related error with additional HTTP context
 */
export class ApiError extends AppError {
  readonly name: string = 'ApiError';
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, code: ErrorCode, status?: number, url?: string, context?: Record<string, unknown>) {
    super(message, code, { ...context, status, url });
    this.status = status;
    this.url = url;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * File system operation error
 */
export class FileSystemError extends AppError {
  readonly name: string = 'FileSystemError';
  readonly filePath: string;

  constructor(message: string, code: ErrorCode, filePath: string, context?: Record<string, unknown>) {
    super(message, code, { ...context, filePath });
    this.filePath = filePath;
    Object.setPrototypeOf(this, FileSystemError.prototype);
  }
}

/**
 * Error factory functions for common error scenarios
 */
export const ErrorFactory = {
  /**
   * Creates a configuration error
   */
  configError: (message: string, context?: Record<string, unknown>) => new ConfigError(message, context),

  /**
   * Creates a GitHub API error
   */
  githubApiError: (message: string, status?: number, url?: string, context?: Record<string, unknown>) =>
    new ApiError(message, ErrorCode.GITHUB_API_ERROR, status, url, context),

  /**
   * Creates a file not found error
   */
  fileNotFoundError: (filePath: string, context?: Record<string, unknown>) =>
    new FileSystemError(`File not found: ${filePath}`, ErrorCode.FILE_NOT_FOUND, filePath, context),

  /**
   * Creates a parsing error
   */
  parsingError: (message: string, context?: Record<string, unknown>) =>
    new AppError(message, ErrorCode.PARSING_ERROR, context),

  /**
   * Creates a validation error
   */
  validationError: (message: string, context?: Record<string, unknown>) =>
    new AppError(message, ErrorCode.VALIDATION_ERROR, context)
};
