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

import { ScannerResults } from '../services/result.interfaces';
import { CHECK_NAME } from '../app.config';
import { PolicyCheck } from './policy-check';
import { Component, getComponents } from '../services/result.service';
import { generateTable } from '../utils/markdown.utils';
import { licenseUtil } from '../utils/license.utils';

/**
 * This class checks if any of the components identified in the scanner results are subject to copyleft licenses.
 * It filters components based on their licenses and looks for those with copyleft obligations.
 * It then generates a summary and detailed report of the findings.
 */
export class CopyleftPolicyCheck extends PolicyCheck {
  static policyName = 'Copyleft Policy';
  private copyleftLicenses = new Set<string>(
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

  constructor() {
    super(`${CHECK_NAME}: ${CopyleftPolicyCheck.policyName}`);
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    super.initStatus();
    const components = getComponents(scannerResults);

    // Filter copyleft components
    const componentsWithCopyleft = components.filter(component =>
      component.licenses.some(
        license => !!license.copyleft || licenseUtil.isCopyLeft(license.spdxid.trim().toLowerCase())
      )
    );

    const summary = this.getSummary(componentsWithCopyleft);
    let details = this.getDetails(componentsWithCopyleft);

    if (details) {
      const { id } = await this.uploadArtifact(details);
      if (id) details = await this.concatPolicyArtifactURLToPolicyCheck(details, id);
    }

    if (componentsWithCopyleft.length === 0) {
      return this.success(summary, details);
    } else {
      return this.reject(summary, details);
    }
  }

  private getSummary(components: Component[]): string {
    return components.length === 0
      ? '### :white_check_mark: Policy Pass \n #### Not copyleft components were found'
      : `### :x: Policy Fail \n #### ${components.length} component(s) with copyleft licenses were found. \n See details for more information.`;
  }

  private getDetails(components: Component[]): string | undefined {
    if (components.length === 0) return undefined;

    const headers = ['Component', 'Version', 'License', 'URL', 'Copyleft'];
    const centeredColumns = [1, 4];
    const rows: string[][] = [];

    components.forEach(component => {
      component.licenses.forEach(license => {
        if (licenseUtil.isCopyLeft(license.spdxid?.trim().toLowerCase())) {
          const copyleftIcon = licenseUtil.isCopyLeft(license.spdxid?.trim().toLowerCase()) ? 'YES' : 'NO';
          rows.push([
            component.purl,
            component.version,
            license.spdxid,
            `${licenseUtil.getOSADL(license?.spdxid) || ''}`,
            copyleftIcon
          ]);
        }
      });
    });
    return `### Copyleft licenses \n ${generateTable(headers, rows, centeredColumns)}`;
  }

  artifactPolicyFileName(): string {
    return 'policy-check-copyleft-results.md';
  }

  getPolicyName(): string {
    return CopyleftPolicyCheck.policyName;
  }
}
