import path from 'path';
import * as input from '../app.input';
import { DefaultArtifactClient } from '@actions/artifact';

const artifact = new DefaultArtifactClient();

export async function uploadResults(): Promise<void> {
  await artifact.uploadArtifact(
    path.basename(input.OUTPUT_FILEPATH),
    [input.OUTPUT_FILEPATH],
    path.dirname(input.OUTPUT_FILEPATH)
  );
}

export function commandBuilder(): string {
  return `docker run -v "${input.REPO_DIR}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . 
                --output ${input.OUTPUT_FILEPATH}  
                ${input.DEPENDENCIES_ENABLED ? `--dependencies` : ''}  
                ${input.SBOM_ENABLED ? `--${input.SBOM_TYPE} ${input.SBOM_FILEPATH}` : ''} 
                ${input.API_URL ? `--apiurl ${input.API_URL}` : ''} 
                ${input.API_KEY ? `--key ${input.API_KEY}` : ''}`.replace(/\n/gm, '');
}
