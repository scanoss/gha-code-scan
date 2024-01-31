import { PolicyCheck } from './policy-check';
import { CHECK_NAME } from '../app.config';
import { ScannerResults } from '../services/result.interfaces';
import { getComponents } from '../services/result.service';
import * as inputs from '../app.input';
import { parseSbom } from '../utils/sbom.utils';

export class UndeclaredPolicyCheck extends PolicyCheck {
  constructor() {
    super(`${CHECK_NAME}: Undeclared Policy`);
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    super.run(scannerResults);

    const nonDeclaredComponents = new Set<string>();

    const comps = getComponents(scannerResults);
    const sbom = await parseSbom(inputs.SBOM_FILEPATH);

    comps.forEach(c => {
      if (!sbom.components.some(component => component.purl === c.purl)) {
        nonDeclaredComponents.add(c.purl);
      }
    });

    if (!nonDeclaredComponents.size) {
      this.success('Completed succesfully', 'Undeclared components were not found');
    } else {
      this.reject('Failure', `Undeclared components were found: ${JSON.stringify(Array.from(nonDeclaredComponents))}`);
    }
  }
}
