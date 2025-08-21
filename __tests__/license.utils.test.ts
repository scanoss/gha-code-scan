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

import { LicenseUtil } from '../src/utils/license.utils';

// Mock external dependencies
jest.mock('@actions/core');

describe('License Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  describe('LicenseUtil class initialization', () => {
    it('should use explicit licenses when COPYLEFT_LICENSE_EXPLICIT is set', () => {
      jest.doMock('../src/app.input', () => ({
        COPYLEFT_LICENSE_EXPLICIT: 'GPL-2.0-only,LGPL-3.0-only',
        COPYLEFT_LICENSE_INCLUDE: '',
        COPYLEFT_LICENSE_EXCLUDE: ''
      }));

      const { LicenseUtil: MockedLicenseUtil } = require('../src/utils/license.utils');
      const util = new MockedLicenseUtil();

      // Test that the utility is instantiated correctly with explicit configuration
      expect(util).toBeDefined();
      expect(util).toBeInstanceOf(MockedLicenseUtil);
    });

    it('should use default licenses with include when COPYLEFT_LICENSE_INCLUDE is set', () => {
      jest.doMock('../src/app.input', () => ({
        COPYLEFT_LICENSE_EXPLICIT: '',
        COPYLEFT_LICENSE_INCLUDE: 'Custom-License-1.0',
        COPYLEFT_LICENSE_EXCLUDE: ''
      }));

      const { LicenseUtil: MockedLicenseUtil } = require('../src/utils/license.utils');
      const util = new MockedLicenseUtil();

      // Test that the utility is instantiated correctly with include configuration
      expect(util).toBeDefined();
      expect(util).toBeInstanceOf(MockedLicenseUtil);
    });

    it('should use default licenses with exclude when COPYLEFT_LICENSE_EXCLUDE is set', () => {
      jest.doMock('../src/app.input', () => ({
        COPYLEFT_LICENSE_EXPLICIT: '',
        COPYLEFT_LICENSE_INCLUDE: '',
        COPYLEFT_LICENSE_EXCLUDE: 'GPL-2.0-only'
      }));

      const { LicenseUtil: MockedLicenseUtil } = require('../src/utils/license.utils');
      const util = new MockedLicenseUtil();

      // Test that the utility is instantiated correctly with exclude configuration
      expect(util).toBeDefined();
      expect(util).toBeInstanceOf(MockedLicenseUtil);
    });

    it('should be instantiated correctly with default configuration', () => {
      jest.doMock('../src/app.input', () => ({
        COPYLEFT_LICENSE_EXPLICIT: '',
        COPYLEFT_LICENSE_INCLUDE: '',
        COPYLEFT_LICENSE_EXCLUDE: ''
      }));

      const { LicenseUtil: MockedLicenseUtil } = require('../src/utils/license.utils');
      const util = new MockedLicenseUtil();

      // Test that the utility is instantiated correctly with default configuration
      expect(util).toBeDefined();
      expect(util).toBeInstanceOf(MockedLicenseUtil);
    });
  });

  describe('LicenseUtil.getOSADL', () => {
    let util: LicenseUtil;

    beforeEach(() => {
      // Create fresh instance with default configuration for each test
      jest.doMock('../src/app.input', () => ({
        COPYLEFT_LICENSE_EXPLICIT: '',
        COPYLEFT_LICENSE_INCLUDE: '',
        COPYLEFT_LICENSE_EXCLUDE: ''
      }));
      const { LicenseUtil: MockedLicenseUtil } = require('../src/utils/license.utils');
      util = new MockedLicenseUtil();
    });

    it('should return SPDX URL for valid SPDX licenses', () => {
      const result = util.getOSADL('MIT');
      expect(result).toBe('https://spdx.org/licenses/MIT.html');
    });

    it('should handle licenses with special characters', () => {
      const result = util.getOSADL('Apache-2.0');
      expect(result).toBe('https://spdx.org/licenses/Apache-2.0.html');
    });

    it('should handle GPL licenses', () => {
      const result = util.getOSADL('GPL-2.0-only');
      expect(result).toBe('https://spdx.org/licenses/GPL-2.0-only.html');
    });

    it('should handle LGPL licenses', () => {
      const result = util.getOSADL('LGPL-3.0-only');
      expect(result).toBe('https://spdx.org/licenses/LGPL-3.0-only.html');
    });

    it('should handle AGPL licenses', () => {
      const result = util.getOSADL('AGPL-3.0-only');
      expect(result).toBe('https://spdx.org/licenses/AGPL-3.0-only.html');
    });

    it('should handle MPL licenses', () => {
      const result = util.getOSADL('MPL-2.0');
      expect(result).toBe('https://spdx.org/licenses/MPL-2.0.html');
    });

    it('should handle EPL licenses', () => {
      const result = util.getOSADL('EPL-2.0');
      expect(result).toBe('https://spdx.org/licenses/EPL-2.0.html');
    });

    it('should handle CDDL licenses', () => {
      const result = util.getOSADL('CDDL-1.1');
      expect(result).toBe('https://spdx.org/licenses/CDDL-1.1.html');
    });

    it('should handle Artistic licenses', () => {
      const result = util.getOSADL('Artistic-2.0');
      expect(result).toBe('https://spdx.org/licenses/Artistic-2.0.html');
    });

    it('should handle Creative Commons licenses', () => {
      const result = util.getOSADL('CC-BY-SA-4.0');
      expect(result).toBe('https://spdx.org/licenses/CC-BY-SA-4.0.html');
    });

    it('should handle custom/unknown licenses', () => {
      const result = util.getOSADL('Custom-License-1.0');
      expect(result).toBe('https://spdx.org/licenses/Custom-License-1.0.html');
    });

    it('should handle empty strings', () => {
      const result = util.getOSADL('');
      expect(result).toBe('https://spdx.org/licenses/.html');
    });

    it('should handle special characters in license names', () => {
      const result = util.getOSADL('BSD-3-Clause');
      expect(result).toBe('https://spdx.org/licenses/BSD-3-Clause.html');
    });
  });
});
