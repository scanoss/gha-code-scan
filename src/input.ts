import * as core from '@actions/core';

export interface ActionParameters {
  repoDir: string;
  outputPath: string;
  sbomIdentify: string;
  sbomIgnore: string;
  apiKey: string;
  apiUrl: string;
}

export function readInputs(): ActionParameters {
  return {
    repoDir: process.env.GITHUB_WORKSPACE as string,
    outputPath: core.getInput('output-path'),
    sbomIdentify: core.getInput('sbom-identify'),
    sbomIgnore: core.getInput('sbom-ignore'),
    apiKey: core.getInput('api-key'),
    apiUrl: core.getInput('api-url')
  };
}

export function commandBuilder(): string {
  const ap = readInputs();
  console.log(ap);
  // prettier-ignore
  const command =
          `docker run -v "${ap.repoDir}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . ` +
                `--output ${ap.outputPath} ` +
                (ap.sbomIdentify ? `--identify ${ap.sbomIdentify} ` : '') +
                (ap.sbomIgnore ? `--ignore ${ap.sbomIgnore} ` : '')  +
                (ap.apiUrl  ? `--apiurl ${ap.apiUrl} ` : '') +
                (ap.apiKey  ? `--key ${ap.apiKey} ` : '')

  console.log(command);
  return command;
}
