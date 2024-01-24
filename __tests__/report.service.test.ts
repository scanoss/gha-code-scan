import { ScannerResults } from '../src/services/result.interfaces';
import { getLicenses, Licenses } from '../src/services/result.service';
import { resultsMock } from './results.mock';

const licenseTableTest = [
  {
    ...resultsMock[0],
    licenses: [{ spdxid: 'MIT', url: null, copyleft: null }]
  },
  {
    ...resultsMock[1],
    licenses: [
      { spdxid: 'MIT', url: null, copyleft: null },
      { spdxid: 'Apache-2.0', url: null, copyleft: null },
      { spdxid: '0BSD', url: null, copyleft: null }
    ]
  },
  {
    ...resultsMock[2],
    licenses: [
      { spdxid: 'GPL-2.0-only', url: 'https://spdx.org/licenses/GPL-2.0-only.html', copyleft: true },
      { spdxid: 'GPL-2.0-or-later', url: 'https://spdx.org/licenses/GPL-2.0-or-later.html', copyleft: true },
      { spdxid: 'JSON', url: 'https://spdx.org/licenses/JSON.html', copyleft: null },
      { spdxid: 'LicenseRef-scancode-unknown-license-reference', url: null, copyleft: null }
    ]
  },
  {
    ...resultsMock[3],
    licenses: [
      { spdxid: 'MIT', url: null, copyleft: null },
      { spdxid: 'GPL-2.0-only', url: 'https://spdx.org/licenses/GPL-2.0-only.html', copyleft: true },
      { spdxid: 'JSON', url: 'https://spdx.org/licenses/JSON.html', copyleft: null },
      { spdxid: 'LicenseRef-scancode-unknown-license-reference', url: null, copyleft: null },
      { spdxid: 'GPL-2.0-or-later', url: 'https://spdx.org/licenses/GPL-2.0-or-later.html', copyleft: true },
      { spdxid: 'Apache-2.0', url: null, copyleft: null },
      { spdxid: '0BSD', url: null, copyleft: null }
    ]
  }
];

describe('Test Results service', () => {
  for (const t of licenseTableTest) {
    it(`${t.name}`, () => {
      const scannerResults = JSON.parse(t.content) as ScannerResults;
      const licenses = getLicenses(scannerResults);

      const sortFn = (a: Licenses, b: Licenses): number => a.spdxid.localeCompare(b.spdxid);
      expect(licenses.sort(sortFn)).toEqual(t.licenses.sort(sortFn));
    });
  }
});
