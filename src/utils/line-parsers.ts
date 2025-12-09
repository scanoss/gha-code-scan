// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2025, SCANOSS

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

import { LineRange } from '../types/annotations';

/**
 * Sanitizes line range string by removing non-numeric, non-comma, non-dash characters
 * @param str - The string to sanitize
 * @returns Sanitized string containing only digits, commas, and dashes
 */
function sanitizeLineRange(str: string): string {
  return str.replace(/[^0-9,-]/g, '');
}

/**
 * Extracts first and last numbers from a string using regex
 * @param str - The string to extract numbers from
 * @returns Object with first and last numbers as strings, or null if not found
 */
function extractFirstAndLastNumbers(str: string): { first: string; last: string } | null {
  // Sanitize input to handle formats like "L7-L9, L47-L81"
  const sanitized = sanitizeLineRange(str);
  const match = sanitized.match(/^(\d+).*?(\d+)(?!.*\d)/);
  if (match) {
    return {
      first: match[1],
      last: match[2]
    };
  }
  return null;
}

/**
 * Parses various line range string formats into a standardized LineRange object
 *
 * This function handles multiple line range formats commonly used in code analysis tools:
 * - Simple ranges: "4-142"
 * - Complex ranges: "7-9,47-81,99-158" (uses first and last numbers)
 * - Single lines: "25"
 * - Special values: "all" (defaults to line 1)
 * - Prefixed formats: "L7-L9" (strips non-numeric characters)
 *
 * The function is designed to be robust and handle malformed input gracefully by
 * sanitizing the input and falling back to reasonable defaults.
 *
 * @param lineRange - The line range string to parse (various formats supported)
 * @returns Parsed line range object with start and end properties, or null if parsing fails
 *
 * @example
 * ```typescript
 * parseLineRange("15-25")         // { start: 15, end: 25 }
 * parseLineRange("L7-L9,L47-L81") // { start: 7, end: 81 }
 * parseLineRange("42")            // { start: 42, end: 42 }
 * parseLineRange("all")           // { start: 1, end: 1 }
 * parseLineRange("invalid")       // null
 * ```
 */
export function parseLineRange(lineRange: string): LineRange | null {
  if (lineRange === 'all') {
    return { start: 1, end: 1 };
  }

  // Sanitize input first
  const sanitized = sanitizeLineRange(lineRange);

  // Try simple single number first (most common case)
  if (/^\d+$/.test(sanitized)) {
    const singleLine = parseInt(sanitized, 10);
    if (!isNaN(singleLine)) {
      return { start: singleLine, end: singleLine };
    }
  }

  // Handle complex ranges like "7-9,47-81,99-158" using regex to get first and last numbers
  const extracted = extractFirstAndLastNumbers(lineRange);
  if (extracted) {
    const start = parseInt(extracted.first, 10);
    const end = parseInt(extracted.last, 10);

    if (!isNaN(start) && !isNaN(end)) {
      return { start, end };
    }
  }

  return null;
}
