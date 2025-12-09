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

import { CHECK_NAME, STATUS_NAME, formatCheckName } from '../src/app.config';

describe('App Config', () => {
  describe('constants', () => {
    it('should export CHECK_NAME constant', () => {
      expect(CHECK_NAME).toBe('Policy Check');
    });

    it('should export STATUS_NAME constant', () => {
      expect(STATUS_NAME).toBe('Status Check');
    });
  });

  describe('formatCheckName', () => {
    describe('when scanning root directory', () => {
      it('should return base name unchanged when scanPath is "."', () => {
        expect(formatCheckName('Policy Check: Undeclared', '.')).toBe('Policy Check: Undeclared');
      });

      it('should return base name unchanged when scanPath is empty', () => {
        expect(formatCheckName('Policy Check: Copyleft', '')).toBe('Policy Check: Copyleft');
      });

      it('should return base name unchanged when scanPath is undefined', () => {
        expect(formatCheckName('Status Check: Upload', undefined as any)).toBe('Status Check: Upload');
      });
    });

    describe('when scanning subfolder', () => {
      it('should append scan path for single-level folder', () => {
        expect(formatCheckName('Policy Check: Undeclared', 'src')).toBe('Policy Check: Undeclared - src');
      });

      it('should append scan path for nested folders', () => {
        expect(formatCheckName('Policy Check: Copyleft', 'packages/api/lib')).toBe(
          'Policy Check: Copyleft - packages/api/lib'
        );
      });

      it('should work with status checks', () => {
        expect(formatCheckName('Status Check: Dependency Track Upload', 'frontend')).toBe(
          'Status Check: Dependency Track Upload - frontend'
        );
      });

      it('should handle paths with special characters', () => {
        expect(formatCheckName('Policy Check: Test', 'src-v2')).toBe('Policy Check: Test - src-v2');
        expect(formatCheckName('Policy Check: Test', 'packages.new')).toBe('Policy Check: Test - packages.new');
      });
    });

    describe('format consistency', () => {
      it('should use " - " as separator', () => {
        const result = formatCheckName('Policy Check: Test', 'src');
        expect(result).toContain(' - ');
        expect(result).toBe('Policy Check: Test - src');
      });

      it('should not add extra whitespace', () => {
        const result = formatCheckName('Policy Check: Test', 'src/api');
        expect(result).not.toMatch(/\s{2,}/); // No double spaces
        expect(result.split(' - ')).toHaveLength(2);
      });
    });

    describe('real-world examples', () => {
      it('should format undeclared policy check name correctly', () => {
        expect(formatCheckName(`${CHECK_NAME}: Undeclared`, 'src/backend')).toBe(
          'Policy Check: Undeclared - src/backend'
        );
      });

      it('should format copyleft policy check name correctly', () => {
        expect(formatCheckName(`${CHECK_NAME}: Copyleft`, 'packages/frontend')).toBe(
          'Policy Check: Copyleft - packages/frontend'
        );
      });

      it('should format dependency track policy check name correctly', () => {
        expect(formatCheckName(`${CHECK_NAME}: Dependency Track`, 'services/api')).toBe(
          'Policy Check: Dependency Track - services/api'
        );
      });

      it('should format status check name correctly', () => {
        expect(formatCheckName(`${STATUS_NAME}: Dependency Track Upload`, 'lib/core')).toBe(
          'Status Check: Dependency Track Upload - lib/core'
        );
      });
    });
  });
});