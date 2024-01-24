import { ScannerResults } from '../services/result.interfaces';
import { CHECK_NAME } from '../app.config';
import { PolicyCheck } from './policy-check';
import { getLicenses } from '../services/result.service';

export class CopyleftPolicyCheck extends PolicyCheck {
  constructor() {
    super(`${CHECK_NAME}: Copyleft Policy`);
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    super.run(scannerResults);
    const licenses = getLicenses(scannerResults);

    const hasCopyleft = licenses.some(license => !!license.copyleft);
    if (!hasCopyleft) {
      this.success('Completed succesfully', 'Not copyleft licenses were found');
    } else {
      this.reject('Completed failure', 'Copyleft licenses were found:'); // TODO: create a table with copyleft licenses
    }
  }
}
