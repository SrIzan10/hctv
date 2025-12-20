export const getEnv = (key: string): string | undefined => {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    return window.__ENV?.[key];
  }
  return process.env[key];
};

export const MEDIAMTX_URL = getEnv('NEXT_PUBLIC_MEDIAMTX_URL');
export const MEDIAMTX_INGEST_ROUTE = getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE');
