import type { H3Event } from 'h3';

// returns true when the request carries the METRICS_USER/METRICS_PASSWORD basic credentials
export function hasMetricsAuth(event: H3Event): boolean {
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader) return false;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic' || !parts[1]) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(parts[1], 'base64').toString();
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return false;

  const user = decoded.substring(0, separatorIndex);
  const pass = decoded.substring(separatorIndex + 1);
  return user === process.env.METRICS_USER && pass === process.env.METRICS_PASSWORD;
}
