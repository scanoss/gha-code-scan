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

import * as inputs from '../app.input';
import * as core from '@actions/core';

/**
 * Utility class for handling license operations and copyleft license detection.
 */
export class LicenseUtil {
  private BASE_OSADL_URL = 'https://spdx.org/licenses';
  private HTML = 'html';
  /**
   * Initializes the license utility with copyleft license configurations.
   */
  constructor() {
    this.init();
  }

  private defaultCopyleftLicenses = new Set<string>(
    [
      'GPL-1.0-only',
      'GPL-2.0-only',
      'GPL-3.0-only',
      'AGPL-3.0-only',
      'Sleepycat',
      'Watcom-1.0',
      'GFDL-1.1-only',
      'GFDL-1.2-only',
      'GFDL-1.3-only',
      'LGPL-2.1-only',
      'LGPL-3.0-only',
      'MPL-1.1',
      'MPL-2.0',
      'EPL-1.0',
      'EPL-2.0',
      'CDDL-1.0',
      'CDDL-1.1',
      'CECILL-2.1',
      'Artistic-1.0',
      'Artistic-2.0',
      'CC-BY-SA-4.0'
    ].map(l => l.toLowerCase())
  );

  private copyLeftLicenses = new Set<string>();

  /**
   * Initializes copyleft license sets based on configuration.
   */
  private init(): void {
    if (inputs.COPYLEFT_LICENSE_EXPLICIT) {
      const explicitCopyleftLicenses = inputs.COPYLEFT_LICENSE_EXPLICIT.split(',').map(pn => pn.trim().toLowerCase());
      core.debug(`Explicit licenses: ${explicitCopyleftLicenses}`);
      this.copyLeftLicenses = new Set<string>(explicitCopyleftLicenses);
      return;
    }

    core.debug(`Explicit licenses not defined, setting default licenses...`);
    this.copyLeftLicenses = this.defaultCopyleftLicenses;

    if (inputs.COPYLEFT_LICENSE_INCLUDE) {
      const includedCopyleftLicenses = inputs.COPYLEFT_LICENSE_INCLUDE.split(',').map(pn => pn.trim());
      core.debug(`Included copyleft licenses: ${includedCopyleftLicenses}`);
      includedCopyleftLicenses.forEach(l => this.copyLeftLicenses.add(l.toLowerCase()));
    }

    if (inputs.COPYLEFT_LICENSE_EXCLUDE) {
      const excludedCopyleftLicenses = inputs.COPYLEFT_LICENSE_EXCLUDE.split(',').map(pn => pn.trim());
      core.debug(`Excluded copyleft licenses: ${excludedCopyleftLicenses}`);
      excludedCopyleftLicenses.forEach(l => this.copyLeftLicenses.delete(l.toLowerCase()));
    }
  }

  /**
   * Generates SPDX license URL for the given license identifier.
   */
  getOSADL(spdxid: string): string {
    return `${this.BASE_OSADL_URL}/${spdxid}.${this.HTML}`;
  }
}
export const licenseUtil = new LicenseUtil();
