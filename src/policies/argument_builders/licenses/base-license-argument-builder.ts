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

import { ArgumentBuilder } from '../argument-builder';
import { COPYLEFT_LICENSE_EXCLUDE, COPYLEFT_LICENSE_EXPLICIT, COPYLEFT_LICENSE_INCLUDE } from '../../../app.input';
import * as core from '@actions/core';

export abstract class BaseLicenseArgumentBuilder extends ArgumentBuilder {
  protected buildCopyleftArgs(): string[] {
    if (COPYLEFT_LICENSE_EXPLICIT) {
      core.info(`Explicit copyleft licenses: ${COPYLEFT_LICENSE_EXPLICIT}`);
      return ['--explicit', COPYLEFT_LICENSE_EXPLICIT];
    }

    if (COPYLEFT_LICENSE_INCLUDE) {
      core.info(`Included copyleft licenses: ${COPYLEFT_LICENSE_INCLUDE}`);
      return ['--include', COPYLEFT_LICENSE_INCLUDE];
    }

    if (COPYLEFT_LICENSE_EXCLUDE) {
      core.info(`Excluded copyleft licenses: ${COPYLEFT_LICENSE_EXCLUDE}`);
      return ['--exclude', COPYLEFT_LICENSE_EXCLUDE];
    }

    return [];
  }

  abstract build(): Promise<string[]>;
}
