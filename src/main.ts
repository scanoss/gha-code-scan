import * as core from '@actions/core'
import * as exec from '@actions/exec'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const scanParams: string = core.getInput('scan-parameters')

    const repoDir = process.env.GITHUB_WORKSPACE as string
    const outputPath = 'results.json'

    // Declara las opciones para ejecutar el exec
    const options: exec.ExecOptions = {}
    let output: string = ''
    options.listeners = {
      stdout: (data: Buffer) => {
        output += data.toString()
      }
    }
    options.silent = true

    // run scan
    await exec.exec(
      'scanoss-py',
      ['scan', repoDir, '--output', outputPath],
      options
    )

    // set outputs for other workflow steps to use
    core.setOutput('result-filepath', outputPath)
  } catch (error) {
    // fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
