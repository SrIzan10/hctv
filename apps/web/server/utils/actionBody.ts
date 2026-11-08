import type { H3Event } from 'h3';

// reads the JSON body of an action call; malformed JSON is rejected by h3 with a 400
export async function readActionBody(event: H3Event): Promise<Record<string, unknown>> {
  const body = await readBody(event);
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

// plain-arg actions: every named field must be a string
export function pickStrings<K extends string>(
  body: Record<string, unknown>,
  keys: readonly K[]
): Record<K, string> | null {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = body[key];
    if (typeof value !== 'string') return null;
    out[key] = value;
  }
  return out;
}
