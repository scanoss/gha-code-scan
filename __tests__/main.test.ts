/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core';
import * as main from '../src/main';

// Mock the action's main function
const runMock = jest.spyOn(main, 'run');

// Mock the GitHub Actions core library
let debugMock: jest.SpyInstance;
let errorMock: jest.SpyInstance;
let getInputMock: jest.SpyInstance;
// let setFailedMock: jest.SpyInstance;
// let setOutputMock: jest.SpyInstance;

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    debugMock = jest.spyOn(core, 'debug').mockImplementation();
    errorMock = jest.spyOn(core, 'error').mockImplementation();
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation();
    // setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation();
    // setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation();
  });

  it('SCANOSS Scan Action started', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'scanner-parameters':
          return '';
        default:
          return '';
      }
    });

    await main.run();
    expect(runMock).toHaveReturned();

    // Verify that all of the core library functions were called correctly
    expect(debugMock).toHaveBeenNthCalledWith(1, 'SCANOSS Scan Action started...');
    expect(errorMock).not.toHaveBeenCalled();
  });
});
