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

import { parseLineRange } from '../src/utils/line-parsers';

describe('Line Parsers', () => {
  describe('parseLineRange', () => {
    describe('simple range formats', () => {
      it('should parse simple range "15-25"', () => {
        const result = parseLineRange('15-25');
        expect(result).toEqual({ start: 15, end: 25 });
      });

      it('should parse simple range "4-142"', () => {
        const result = parseLineRange('4-142');
        expect(result).toEqual({ start: 4, end: 142 });
      });

      it('should parse single line "42"', () => {
        const result = parseLineRange('42');
        expect(result).toEqual({ start: 42, end: 42 });
      });

      it('should parse single line "1"', () => {
        const result = parseLineRange('1');
        expect(result).toEqual({ start: 1, end: 1 });
      });

      it('should parse single line "999"', () => {
        const result = parseLineRange('999');
        expect(result).toEqual({ start: 999, end: 999 });
      });
    });

    describe('complex range formats', () => {
      it('should parse complex range "7-9,47-81,99-158" using first and last', () => {
        const result = parseLineRange('7-9,47-81,99-158');
        expect(result).toEqual({ start: 7, end: 158 });
      });

      it('should parse range with multiple segments "10-20,30-40"', () => {
        const result = parseLineRange('10-20,30-40');
        expect(result).toEqual({ start: 10, end: 40 });
      });

      it('should parse range with three segments "5-10,20-30,40-50"', () => {
        const result = parseLineRange('5-10,20-30,40-50');
        expect(result).toEqual({ start: 5, end: 50 });
      });
    });

    describe('prefixed formats', () => {
      it('should parse prefixed range "L7-L9"', () => {
        const result = parseLineRange('L7-L9');
        expect(result).toEqual({ start: 7, end: 9 });
      });

      it('should parse prefixed complex range "L7-L9,L47-L81"', () => {
        const result = parseLineRange('L7-L9,L47-L81');
        expect(result).toEqual({ start: 7, end: 81 });
      });

      it('should parse prefixed single line "L42"', () => {
        const result = parseLineRange('L42');
        expect(result).toEqual({ start: 42, end: 42 });
      });
    });

    describe('special values', () => {
      it('should handle "all" as line 1', () => {
        const result = parseLineRange('all');
        expect(result).toEqual({ start: 1, end: 1 });
      });
    });

    describe('edge cases and sanitization', () => {
      it('should handle range with spaces "10 - 20"', () => {
        const result = parseLineRange('10 - 20');
        expect(result).toEqual({ start: 10, end: 20 });
      });

      it('should handle range with extra characters "L10-L20abc"', () => {
        const result = parseLineRange('L10-L20abc');
        expect(result).toEqual({ start: 10, end: 20 });
      });

      it('should sanitize and parse range with special characters', () => {
        const result = parseLineRange('10#-#20');
        expect(result).toEqual({ start: 10, end: 20 });
      });

      it('should handle leading/trailing whitespace', () => {
        const result = parseLineRange('  25-50  ');
        expect(result).toEqual({ start: 25, end: 50 });
      });
    });

    describe('invalid inputs', () => {
      it('should return null for empty string', () => {
        const result = parseLineRange('');
        expect(result).toBeNull();
      });

      it('should return null for non-numeric string', () => {
        const result = parseLineRange('invalid');
        expect(result).toBeNull();
      });

      it('should return null for string with no numbers', () => {
        const result = parseLineRange('abc-def');
        expect(result).toBeNull();
      });

      it('should return null for only special characters', () => {
        const result = parseLineRange('---');
        expect(result).toBeNull();
      });

      it('should return null for only letters', () => {
        const result = parseLineRange('LLLL');
        expect(result).toBeNull();
      });
    });

    describe('reverse ranges', () => {
      it('should handle reverse range "50-10" (extracts first and last)', () => {
        const result = parseLineRange('50-10');
        expect(result).toEqual({ start: 50, end: 10 });
      });
    });

    describe('large numbers', () => {
      it('should handle large line numbers', () => {
        const result = parseLineRange('10000-20000');
        expect(result).toEqual({ start: 10000, end: 20000 });
      });

      it('should handle very large single line number', () => {
        const result = parseLineRange('999999');
        expect(result).toEqual({ start: 999999, end: 999999 });
      });
    });
  });
});
