import { ScannerResults } from '../services/result.interfaces';
import { CHECK_NAME } from '../app.config';
import { PolicyCheck } from './policy-check';
import { Component, getComponents, getLicenses } from '../services/result.service';
import { generateTable } from 'src/utils/markdown.util';

export class CopyleftPolicyCheck extends PolicyCheck {
  constructor() {
    super(`${CHECK_NAME}: Copyleft Policy`);
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    super.run(scannerResults);
    const components = getComponents(scannerResults);

    // Filter copyleft components
    const componentsWithCopyleft = components.filter(component =>
      component.licenses.some(license => !!license.copyleft)
    );

    const summary = this.getSummary(componentsWithCopyleft);
    const details = this.getDetails(componentsWithCopyleft);

    if (componentsWithCopyleft.length === 0) {
      return this.success(summary, details);
    } else {
      return this.reject(summary, details);
    }
  }

  private getSummary(components: Component[]): string {
    return components.length === 0
      ? '### :white_check_mark: Policy Pass \n ' + '#### ' + 'Not copyleft components were found'
      : '### :x: Policy Fail \n' + '#### ' + components.length + ' component(s) with copyleft licenses were found';
  }

  private getDetails(components: Component[]): string {
    if (components.length === 0) return '';

    const headers = ['Component', 'Version', 'License', 'URL', 'Copyleft'];
    const rows: string[][] = [];

    components.forEach(component => {
      component.licenses.forEach(license => {
        const copyleftIcon = license.copyleft ? ':x:' : ' ';
        rows.push([component.purl, component.version, license.spdxid, `${license.url || ''}`, copyleftIcon]);
      });
    });

    return generateTable(headers, rows);
  }
}
