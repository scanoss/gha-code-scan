import { RUNTIME_CONTAINER } from '../src/app.input';
import { ScanOssService } from '../src/services/scanoss.service';
import { CYCLONEDX_FILE_NAME } from '../src/app.output';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

describe('Scanoss service tests', () => {
  it('should correctly return the scanoss-py CycloneDX conversion command', () => {
    const scanossService = new ScanOssService();
    const command = (scanossService as any).buildCycloneDXParameters();
    expect(command).toEqual([
      'run',
      '-v',
      ':/scanoss',
      RUNTIME_CONTAINER,
      'convert',
      '--input',
      './results.json',
      '--format',
      'cyclonedx',
      '--output',
      `./${CYCLONEDX_FILE_NAME}`
    ]);
  });
});
