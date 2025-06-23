import * as exec from '@actions/exec';
import { EXECUTABLE } from '../app.input';
import * as core from '@actions/core';
import { ComponentSummaryArgumentBuilder } from '../policies/argument_builders/components/component-summary-argument-builder';

interface Component {
  purl: string;
  version: string;
  count: number;
  undeclared: number;
  declared: number;
}

interface ComponentSummary {
  components: Component[];
  totalComponents: number;
  undeclaredComponents: number;
  declaredComponents: number;
  totalFilesDetected: number;
  totalFilesUndeclared: number;
  totalFilesDeclared: number;
}

export async function getComponentSummary(): Promise<ComponentSummary> {
  const componentSummaryBuilder = new ComponentSummaryArgumentBuilder();
  const args = await componentSummaryBuilder.build();
  const options = {
    failOnStdErr: false,
    ignoreReturnCode: true
  };
  const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
  if (exitCode === 1) {
    core.warning(`Unable to extract components for job summary: ${stderr}`);
    return {
      components: [],
      totalComponents: 0,
      undeclaredComponents: 0,
      declaredComponents: 0,
      totalFilesDeclared: 0,
      totalFilesDetected: 0,
      totalFilesUndeclared: 0
    };
  }
  return JSON.parse(stdout) as ComponentSummary;
}
