import { describe, expect, it } from 'vitest';
import {
  GatewayError,
  MODELS,
  backoffDelay,
  consumeCompletion,
  extractDelta,
  gatewayFetch,
  gatewayHeaders,
  type GatewayOptions,
} from '../functions/api/_lib/ai/gateway';
import { extractJsonBlock } from '../functions/api/_lib/ai/structured';

const base: GatewayOptions = {
  baseUrl: 'https://gateway.test/v1',
  apiKey: 'test-key',
  appVersion: '1.0.0',
  timeoutMs: 30_000,
  sleepImpl: async () => undefined,
};

function sseResponse(text: string): Response {
  const frame = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(frame, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

function jsonError(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function makeFetch(handler: (call: number, body: { model: string }) => Response) {
  const calls: Array<{ model: string; url: string }> = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { model: string };
    calls.push({ model: body.model, url: String(input) });
    return handler(calls.length, body);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('gateway: headers contract', () => {
  it('sends the app name/version headers and the bearer key', () => {
    const headers = gatewayHeaders('secret-key', '1.2.3', true);
    expect(headers.Authorization).toBe('Bearer secret-key');
    expect(headers['x-app-name']).toBe('Baraka');
    expect(headers['x-app-version']).toBe('1.2.3');
    expect(headers.accept).toBe('text/event-stream');
  });

  it('sanitises the version header (max 30 ascii chars)', () => {
    expect(gatewayHeaders('k', 'версия‑1.0.0', false)['x-app-version'].length).toBeLessThanOrEqual(30);
  });
});

describe('gateway: fallback to the fast model', () => {
  it('retries and degrades from the slow model to the fast model', async () => {
    const { impl, calls } = makeFetch((call) =>
      call === 1 ? jsonError(500, { error: { message: 'boom' } }) : sseResponse('hello'),
    );
    const result = await gatewayFetch(
      { ...base, fetchImpl: impl },
      { model: MODELS.deep, messages: [{ role: 'user', content: 'hi' }], stream: true },
    );

    expect(calls.map((call) => call.model)).toEqual([MODELS.deep, MODELS.fast]);
    expect(result.model).toBe(MODELS.fast);
    expect(result.attempts).toBe(2);
    expect(await consumeCompletion(result.response)).toBe('hello');
  });

  it('keeps the fast model when it fails and retries four times', async () => {
    const { impl, calls } = makeFetch(() => jsonError(503, { error: { message: 'down' } }));
    await expect(
      gatewayFetch({ ...base, fetchImpl: impl }, { model: MODELS.fast, messages: [], stream: true }),
    ).rejects.toBeInstanceOf(GatewayError);
    expect(calls).toHaveLength(4);
    expect(new Set(calls.map((call) => call.model))).toEqual(new Set([MODELS.fast]));
  });

  it('respects Retry-After on 429', async () => {
    const sleeps: number[] = [];
    const { impl } = makeFetch((call) =>
      call === 1 ? jsonError(429, { error: { code: 'rate_limited' } }, { 'retry-after': '7' }) : sseResponse('ok'),
    );
    const result = await gatewayFetch(
      {
        ...base,
        fetchImpl: impl,
        sleepImpl: async (ms) => {
          sleeps.push(ms);
        },
      },
      { model: MODELS.fast, messages: [], stream: true },
    );
    expect(sleeps).toEqual([7000]);
    expect(result.model).toBe(MODELS.fast);
  });

  it('never retries on 401 and hides the key from the error', async () => {
    const { impl, calls } = makeFetch(() => jsonError(401, { error: { message: 'invalid key test-key' } }));
    const error = await gatewayFetch({ ...base, fetchImpl: impl }, { model: MODELS.fast, messages: [] }).catch(
      (cause: unknown) => cause as GatewayError,
    );
    expect(error).toBeInstanceOf(GatewayError);
    expect((error as GatewayError).kind).toBe('auth');
    expect(String((error as GatewayError).message)).not.toContain('test-key');
    expect(calls).toHaveLength(1);
  });

  it('surfaces device_pending / device_banned as a device error', async () => {
    const { impl } = makeFetch(() =>
      jsonError(403, { error: { code: 'device_pending', message: 'Device awaiting approval' } }),
    );
    const error = (await gatewayFetch({ ...base, fetchImpl: impl }, { model: MODELS.fast, messages: [] }).catch(
      (cause: unknown) => cause,
    )) as GatewayError;
    expect(error.kind).toBe('device');
    expect(error.code).toBe('device_pending');
    expect(error.message).toContain('Device awaiting approval');
  });

  it('gives backoff time to grow exponentially and caps it', () => {
    expect(backoffDelay(0)).toBe(500);
    expect(backoffDelay(1)).toBe(1000);
    expect(backoffDelay(2)).toBe(2000);
    expect(backoffDelay(10)).toBe(8000);
    expect(backoffDelay(0, 30)).toBe(30_000);
  });
});


describe('gateway: stream parsing', () => {
  it('reads SSE deltas in order and calls onDelta', async () => {
    const frames =
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'lo' } }] })}\n\n` +
      'data: [DONE]\n\n';
    const response = new Response(frames, { headers: { 'content-type': 'text/event-stream' } });
    const deltas: string[] = [];
    const text = await consumeCompletion(response, (delta) => {
      deltas.push(delta);
    });
    expect(text).toBe('Hello');
    expect(deltas).toEqual(['Hel', 'lo']);
  });

  it('reads a non-streaming JSON completion', async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: 'plain json' } }] }), {
      headers: { 'content-type': 'application/json' },
    });
    expect(await consumeCompletion(response)).toBe('plain json');
  });

  it('extracts content parts arrays', () => {
    expect(
      extractDelta({ choices: [{ delta: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }] }),
    ).toBe('ab');
    expect(extractDelta({})).toBe('');
  });
});

describe('structured output: JSON extraction', () => {
  it('parses fenced JSON', () => {
    expect(extractJsonBlock('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses JSON surrounded by prose', () => {
    expect(extractJsonBlock('Sure! {"verdict":"halal","confidence":0.9} hope it helps')).toEqual({
      verdict: 'halal',
      confidence: 0.9,
    });
  });

  it('repairs trailing commas', () => {
    expect(extractJsonBlock('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });

  it('returns null when there is no JSON', () => {
    expect(extractJsonBlock('no json here')).toBeNull();
  });
});
