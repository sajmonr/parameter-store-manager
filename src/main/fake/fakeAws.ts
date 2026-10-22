// Answers AWS SDK calls from the fake store instead of AWS. The app keeps
// its real SDK clients; a middleware at the first step of each client
// returns the fake answer, so no request, credential lookup or network call
// is made. A command the fake doesn't know fails loudly.
import type { FakeOptions } from '../source';
import { awsError, FakeParameterStore } from './store';

let store: FakeParameterStore | null = null;
let options: FakeOptions = { delayMs: 0, pageSize: 50, error: null };

export const startFakeSource = (
  fixturePath: string,
  workingPath: string,
  fakeOptions: FakeOptions
) => {
  options = fakeOptions;
  store = new FakeParameterStore(fixturePath, workingPath, options.pageSize);
};

// The parameters go back to the fixture's.
export const resetFakeData = () => store?.reset();

const fakeStore = () => {
  if (!store) throw new Error('The fake source was not started.');
  return store;
};

const metadata = { $metadata: {} };

// By the SDK's command name. Inputs are the commands' own inputs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, (input: any) => unknown> = {
  DescribeParametersCommand: input => fakeStore().describe(input),
  GetParametersCommand: input => fakeStore().get(input),
  PutParameterCommand: input => ({ ...fakeStore().put(input), ...metadata }),
  DeleteParametersCommand: input => fakeStore().delete(input),
  ListAliasesCommand: () => {
    const { accountId, aliases } = fakeStore();
    return {
      Aliases: aliases.map(alias => ({
        ...alias,
        AliasArn: `arn:aws:kms:fake-region:${accountId}:${alias.AliasName}`
      })),
      Truncated: false,
      ...metadata
    };
  },
  GetCallerIdentityCommand: () => {
    const { accountId } = fakeStore();
    return {
      Account: accountId,
      Arn: `arn:aws:iam::${accountId}:user/fake-developer`,
      UserId: 'FAKEDEVELOPER',
      ...metadata
    };
  }
};

// Names the renderer sorts into the expired-session and access-denied
// screens; the generic one is shown as a notification.
const simulatedErrors = {
  expired: () =>
    awsError(
      'ExpiredTokenException',
      'The security token included in the request is expired (simulated by PSM_FAKE_ERROR).'
    ),
  denied: () =>
    awsError(
      'AccessDeniedException',
      'User is not authorized to perform this operation (simulated by PSM_FAKE_ERROR).'
    ),
  generic: () =>
    awsError(
      'InternalServerError',
      'Something went wrong on the fake AWS side (simulated by PSM_FAKE_ERROR).'
    )
};

const wait = (ms: number) =>
  ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();

export const answerFake = async (commandName: string, input: unknown) => {
  await wait(options.delayMs);
  if (options.error) throw simulatedErrors[options.error]();
  const handler = handlers[commandName];
  if (!handler) {
    throw awsError(
      'UnsupportedFakeCommand',
      `The fake source can't answer ${commandName}. Add it to src/main/fake/fakeAws.ts.`
    );
  }
  return handler(input);
};

interface MiddlewareContext {
  commandName?: string;
}

// The part of an SDK client this needs.
interface MiddlewareClient {
  middlewareStack: {
    add: (
      middleware: (
        next: unknown,
        context: MiddlewareContext
      ) => (args: { input: unknown }) => Promise<unknown>,
      options: { step: 'initialize'; name: string }
    ) => void;
  };
}

export const withFakeSource = <C>(client: C): C => {
  (client as unknown as MiddlewareClient).middlewareStack.add(
    (_next, context) => async args => ({
      output: await answerFake(context.commandName ?? '', args.input),
      response: {}
    }),
    { step: 'initialize', name: 'fakeSource' }
  );
  return client;
};
