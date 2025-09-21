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
 * Simple in-memory cache for API responses to avoid duplicate requests
 *
 * This cache is designed for single GitHub Actions runs and automatically
 * expires entries after a reasonable time to avoid stale data.
 */
class ApiCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly defaultTtl = 300000; // 5 minutes in milliseconds

  /**
   * Gets a cached value if it exists and hasn't expired
   * @param key - The cache key
   * @param ttl - Time to live in milliseconds (optional, defaults to 5 minutes)
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string, ttl: number = this.defaultTtl): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Sets a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  /**
   * Clears all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the current cache size
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Generates a cache key from multiple parameters
   * @param params - Parameters to include in the key
   * @returns A consistent cache key string
   */
  static generateKey(...params: (string | number | boolean | undefined)[]): string {
    return params
      .filter(p => p !== undefined)
      .map(p => String(p))
      .join(':');
  }
}

/**
 * Global cache instance for API responses
 */
export const apiCache = new ApiCache();

/**
 * Request deduplication utility to prevent multiple identical API calls
 */
class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();

  /**
   * Executes a function only once per key, returning the same promise for duplicate calls
   * @param key - Unique key for the request
   * @param fn - Function to execute
   * @returns Promise that resolves to the function result
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    // Execute the function and cache the promise
    const promise = fn().finally(() => {
      // Remove from pending when complete
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Gets the number of pending requests
   * @returns Number of pending requests
   */
  pendingCount(): number {
    return this.pending.size;
  }

  /**
   * Clears all pending requests (use with caution)
   */
  clear(): void {
    this.pending.clear();
  }
}

/**
 * Global request deduplicator instance
 */
export const requestDeduplicator = new RequestDeduplicator();
