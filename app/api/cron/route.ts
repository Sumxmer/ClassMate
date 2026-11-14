import { validCronAuthorization } from '../../../lib/cron-auth';
import { serviceDb, failure } from '../../../lib/server';
import { dispatch } from '../../../lib/push';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(request: Request) {
  if (!validCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return failure('Unauthorized', 401);
  }

  const deadline = AbortSignal.timeout(8_000);
  const signal = AbortSignal.any([deadline, request.signal]);
  const timeout = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    if (signal.aborted) reject(signal.reason);
  });

  try {
    const result = await Promise.race([runCron(signal), timeout]);
    return Response.json(result);
  } catch {
    if (signal.aborted) return failure('Cron deadline exceeded', 504);
    console.error('ClassMate cron failed');
    return failure('Cron failed', 500);
  }
}

async function runCron(signal: AbortSignal) {
  const { error } = await serviceDb().rpc('enqueue_notifications').abortSignal(signal);
  if (error) throw Error(error.message);
  signal.throwIfAborted();
  return dispatch(undefined, signal);
}
