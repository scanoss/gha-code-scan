import * as inputs from '../app.input';
import * as core from '@actions/core';

export class LicenseUtil {
  private BASE_OSADL_URL = 'https://spdx.org/licenses';
  private HTML = 'html';
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

  isCopyLeft(spdxid: string): boolean {
    return this.copyLeftLicenses.has(spdxid);
  }

  getOSADL(spdxid: string): string {
    return `${this.BASE_OSADL_URL}/${spdxid}.${this.HTML}`;
  }
}
export const licenseUtil = new LicenseUtil();
