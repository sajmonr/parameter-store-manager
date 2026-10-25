import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GetParametersCommand,
  PutParameterCommand,
  SSMClient
} from '@aws-sdk/client-ssm';

const debug = vi.fn();
vi.mock('electron-log/main', () => ({ default: { debug } }));

const { describeInput, withCallLog } = await import('./awsLog');

// A client whose calls are answered by `answer` instead of AWS.
const client = (
  answer: () => Promise<{ $metadata: { attempts?: number } }>
) => {
  const ssm = new SSMClient({
    region: 'eu-west-1',
    credentials: { accessKeyId: 'FAKE', secretAccessKey: 'FAKE' }
  });
  withCallLog(ssm, 'SSM', 'eu-west-1, profile dev');
  ssm.middlewareStack.add(
    () => async () => ({ output: await answer(), response: {} }),
    { step: 'initialize', name: 'answer' }
  );
  return ssm;
};

beforeEach(() => debug.mockClear());

describe('describeInput', () => {
  it('counts names and shows a single name', () => {
    expect(describeInput({ Names: ['/a', '/b'] })).toBe(' 2 names');
    expect(describeInput({ Name: '/a' })).toBe(' /a');
    expect(describeInput(undefined)).toBe('');
  });
});

describe('withCallLog', () => {
  it('logs the start and end of a call', async () => {
    await client(async () => ({ $metadata: { attempts: 3 } })).send(
      new GetParametersCommand({ Names: ['/a', '/b'] })
    );

    expect(debug).toHaveBeenNthCalledWith(
      1,
      'AWS SSM GetParameters 2 names (eu-west-1, profile dev) started'
    );
    expect(debug).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(
        /^AWS SSM GetParameters 2 names \(eu-west-1, profile dev\) done in \d+ ms, 3 attempts$/
      )
    );
  });

  it('logs a failure with the error name and rethrows it', async () => {
    const error = Object.assign(new Error('denied'), {
      name: 'AccessDeniedException'
    });
    const ssm = client(() => Promise.reject(error));

    await expect(
      ssm.send(new GetParametersCommand({ Names: ['/a'] }))
    ).rejects.toBe(error);
    expect(debug).toHaveBeenLastCalledWith(
      expect.stringMatching(/failed in \d+ ms with AccessDeniedException$/)
    );
  });

  it('never logs a value', async () => {
    await client(async () => ({ $metadata: {} })).send(
      new PutParameterCommand({ Name: '/a', Value: 'hunter2' })
    );

    expect(JSON.stringify(debug.mock.calls)).not.toContain('hunter2');
  });
});
