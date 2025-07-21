import * as exec from '@actions/exec';
import * as inputs from '../app.input';
import * as core from '@actions/core';
import { uploadToArtifacts } from './github.service';
import { CYCLONEDX_FILE_NAME } from '../app.output';

export class ScanOssService {
  /**
   * Build scanoss-py CycloneDX conversion parameters */
  private buildCycloneDXParameters(): string[] {
    const args = [
      'run',
      '-v',
      `${inputs.REPO_DIR}:/scanoss`,
      inputs.RUNTIME_CONTAINER,
      'convert',
      '--input',
      `./${inputs.OUTPUT_FILEPATH}`,
      '--format',
      'cyclonedx',
      '--output',
      `./${CYCLONEDX_FILE_NAME}`
    ];
    return args;
  }

  /**
   * Converts SCANOSS results to CycloneDX format using scanoss-py
   */
  async scanResultsToCycloneDX(): Promise<Error | undefined> {
    try {
      core.info('Converting SCANOSS results to CycloneDX format...');
      const options = {
        failOnStdErr: false,
        ignoreReturnCode: false
      };
      const { exitCode } = await exec.getExecOutput(inputs.EXECUTABLE, this.buildCycloneDXParameters(), options);
      if (exitCode !== 0) {
        return new Error(`Error converting scan results into CycloneDX format`);
      }
      await uploadToArtifacts(CYCLONEDX_FILE_NAME);
      core.info('Successfully converted results into CycloneDX format');
    } catch (e: any) {
      core.error(e.message);
    }
  }
}

export const scanossService = new ScanOssService();
