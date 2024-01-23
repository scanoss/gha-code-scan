import { CHECK_NAME } from '../app.config';
import { PolicyCheck } from './policy-check';

export class LicensePolicyCheck extends PolicyCheck {
  constructor() {
    super(`${CHECK_NAME}: Licenses Policy`);
  }
}
