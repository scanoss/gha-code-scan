import { SBOM } from '../src/utils/sbom.utils';

export const sbomMock: SBOM[] = [
  {
    components: [] // empty SBOM
  },
  {
    components: [
      { purl: 'pkg:github/scanoss/engine' },
      { purl: 'pkg:github/scanoss/engine' },
      { purl: 'pkg:github/scanoss/engine' },
      { purl: 'pkg:pypi/requests' },
      { purl: 'pkg:pypi/crc32c' },
      { purl: 'pkg:pypi/binaryornot' },
      { purl: 'pkg:pypi/pytest' },
      { purl: 'pkg:pypi/pytest-cov' },
      { purl: 'pkg:pypi/beautifulsoup4' }
    ]
  }
];
