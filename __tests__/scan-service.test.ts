import { RUNTIME_CONTAINER } from '../src/app.input';
import { ScanService } from '../src/services/scan.service';
import fs from 'fs';
import path from 'path';
import * as exec from '@actions/exec';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

describe('ScanService', () => {
  const appInput = jest.requireMock('../src/app.input');
  it('should correctly return the dependency scope command', () => {
    const service = new ScanService({
      outputFilepath: '',
      inputFilepath: '',
      runtimeContainer: RUNTIME_CONTAINER,
      dependencyScope: 'prod',
      dependencyScopeInclude: '',
      dependencyScopeExclude: '',
      scanFiles: true,
      skipSnippets: false,
      settingsFilePath: '',
      scanossSettings: false,
      debug: false
    });

    // Accessing the private method by bypassing TypeScript type checks
    const command = (service as any).dependencyScopeArgs();
    console.log(command);
    expect(command).toEqual(['--dep-scope', 'prod']);
  });

  it('Should return --dependencies-only parameter', () => {
    const service = new ScanService({
      outputFilepath: '',
      inputFilepath: '',
      runtimeContainer: RUNTIME_CONTAINER,
      dependencyScope: '',
      dependencyScopeInclude: '',
      dependencyScopeExclude: '',
      dependenciesEnabled: true,
      scanFiles: false,
      skipSnippets: false,
      settingsFilePath: '',
      scanossSettings: false,
      debug: false
    });

    const command = (service as any).buildDependenciesArgs();
    expect(command).toEqual(['--dependencies-only']);
  });

  it('Should return dependencies parameter', () => {
    const service = new ScanService({
      outputFilepath: '',
      inputFilepath: '',
      runtimeContainer: RUNTIME_CONTAINER,
      dependencyScope: '',
      dependencyScopeInclude: '',
      dependencyScopeExclude: '',
      dependenciesEnabled: true,
      scanFiles: true,
      skipSnippets: false,
      settingsFilePath: '',
      scanossSettings: false,
      debug: false
    });

    const command = (service as any).buildDependenciesArgs();
    expect(command).toEqual(['--dependencies']);
  });

  it('Should return skip snippet parameter', () => {
    const service = new ScanService({
      outputFilepath: '',
      inputFilepath: '',
      runtimeContainer: RUNTIME_CONTAINER,
      dependencyScope: '',
      dependencyScopeInclude: '',
      dependencyScopeExclude: '',
      dependenciesEnabled: true,
      scanFiles: true,
      skipSnippets: true,
      settingsFilePath: '',
      scanossSettings: false,
      debug: false
    });

    const command = (service as any).buildSnippetArgs();
    expect(command).toEqual(['-S']);
  });

  it('Should return a command with skip snippet and prod dependencies', async () => {
    const service = new ScanService({
      outputFilepath: 'results.json',
      inputFilepath: 'inputFilepath',
      runtimeContainer: RUNTIME_CONTAINER,
      dependencyScope: 'prod',
      dependencyScopeInclude: '',
      dependencyScopeExclude: '',
      dependenciesEnabled: true,
      scanFiles: true,
      skipSnippets: true,
      settingsFilePath: '',
      scanossSettings: false,
      debug: false
    });

    const command = await (service as any).buildArgs();
    console.log(command);
    expect(command).not.toBe('');
  });

  it('Should scan dependencies', async () => {
    appInput.OUTPUT_FILEPATH = 'test-results.json';
    const TEST_DIR = __dirname;
    const resultPath = path.join(TEST_DIR, 'data', 'test-results.json');
    
    // Mock the scan results from the existing test data
    const mockScanResults = {
      "package.json": [
        {
          "dependencies": [
            {
              "component": "@grpc/grpc-js",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "Apache-2.0",
                  "spdx_id": "Apache-2.0"
                }
              ],
              "purl": "pkg:npm/%40grpc/grpc-js",
              "url": "https://www.npmjs.com/package/%40grpc/grpc-js",
              "version": "1.12.2"
            },
            {
              "component": "abort-controller",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "MIT",
                  "spdx_id": "MIT"
                }
              ],
              "purl": "pkg:npm/abort-controller",
              "url": "https://www.npmjs.com/package/abort-controller",
              "version": "3.0.0"
            }
          ],
          "id": "dependency",
          "status": "pending"
        }
      ]
    };

    // Mock exec.getExecOutput to return mock scan results
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: JSON.stringify(mockScanResults),
      stderr: '',
      exitCode: 0
    });

    // Mock fs.promises.readFile to return the mock scan results
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(JSON.stringify(mockScanResults));

    const service = new ScanService({
      outputFilepath: resultPath,
      inputFilepath: path.join(TEST_DIR, 'data'),
      runtimeContainer: RUNTIME_CONTAINER,
      dependencyScopeInclude: '',
      dependencyScopeExclude: '',
      dependenciesEnabled: true,
      scanFiles: true,
      skipSnippets: false,
      settingsFilePath: 'scanoss.json',
      scanossSettings: false,
      debug: false
    });

    const { scan } = await service.scan();
    expect(scan['package.json'][0].dependencies.length).toBeGreaterThan(0);
  }, 10000);
});
