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
    this.copyLeftLicenses = this.defaultCopyleftLicenses;
  }

  isCopyLeft(spdxid: string): boolean {
    return this.copyLeftLicenses.has(spdxid);
  }

  getOSADL(spdxid: string): string {
    return `${this.BASE_OSADL_URL}/${spdxid}.${this.HTML}`;
  }
}
export const licenseUtil = new LicenseUtil();
