// Logs every AWS SDK call at debug level: the command, where it went, how
// long it took and how many attempts the SDK made. Inputs are only
// summarized; parameter values never reach the log.
import log from 'electron-log/main';

interface CallInput {
  Name?: unknown;
  Names?: unknown;
}

export const describeInput = (input: unknown) => {
  const { Name, Names } = (input ?? {}) as CallInput;
  if (Array.isArray(Names)) return ` ${Names.length} names`;
  if (typeof Name === 'string') return ` ${Name}`;
  return '';
};

interface MiddlewareContext {
  commandName?: string;
}

interface CallOutput {
  output?: { $metadata?: { attempts?: number } };
}

interface CallError {
  name?: string;
  $metadata?: { attempts?: number };
}

// The part of an SDK client this needs.
interface MiddlewareClient {
  middlewareStack: {
    add: (
      middleware: (
        next: (args: { input: unknown }) => Promise<CallOutput>,
        context: MiddlewareContext
      ) => (args: { input: unknown }) => Promise<CallOutput>,
      options: { step: 'initialize'; name: string; priority: 'high' }
    ) => void;
  };
}

const attempts = (count: number | undefined) =>
  count && count > 1 ? `, ${count} attempts` : '';

// `where` names the region and profile, e.g. "us-east-1, profile dev".
export const withCallLog = <C>(client: C, service: string, where: string) => {
  (client as unknown as MiddlewareClient).middlewareStack.add(
    (next, context) => async args => {
      const command = (context.commandName ?? 'Unknown').replace(
        /Command$/,
        ''
      );
      const call = `${service} ${command}${describeInput(args.input)} (${where})`;
      const started = Date.now();
      log.debug(`AWS ${call} started`);
      try {
        const result = await next(args);
        log.debug(
          `AWS ${call} done in ${Date.now() - started} ms${attempts(result.output?.$metadata?.attempts)}`
        );
        return result;
      } catch (error) {
        const { name, $metadata } = (error ?? {}) as CallError;
        log.debug(
          `AWS ${call} failed in ${Date.now() - started} ms with ${name ?? 'an error'}${attempts($metadata?.attempts)}`
        );
        throw error;
      }
    },
    // Before the fake source, so fake calls are logged too.
    { step: 'initialize', name: 'callLog', priority: 'high' }
  );
  return client;
};
