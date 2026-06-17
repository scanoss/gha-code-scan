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

/**
 * Utility class for handling license operations.
 *
 * Note: copyleft determination is NOT performed here. It is delegated to
 * scanoss.py (`scanoss-py inspect copyleft`), which uses the OSADL copyleft
 * checklist. This class only builds SPDX license reference URLs for reporting.
 */
export class LicenseUtil {
  private BASE_OSADL_URL = 'https://spdx.org/licenses';
  private HTML = 'html';

  /**
   * Generates SPDX license URL for the given license identifier.
   */
  getOSADL(spdxid: string): string {
    return `${this.BASE_OSADL_URL}/${spdxid}.${this.HTML}`;
  }
}
export const licenseUtil = new LicenseUtil();
