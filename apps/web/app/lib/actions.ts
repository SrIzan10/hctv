export type ActionResult<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
  redirect?: string;
  // some actions return extra top-level fields (e.g. `toggle`)
  [key: string]: any;
};

// client helper for the ported server actions: POST /api/actions/<name> with a JSON body.
// `success: false` results come back with HTTP 200 from the server; only auth failures use 401/403.
export async function callAction<T = any>(
  name: string,
  body: Record<string, unknown> = {}
): Promise<ActionResult<T>> {
  let result: ActionResult<T>;
  try {
    result = await $fetch<ActionResult<T>>(`/api/actions/${name}`, { method: 'POST', body });
  } catch (err: any) {
    const status: number | undefined = err?.statusCode ?? err?.response?.status;
    if (status === 401) {
      return { success: false, error: 'Unauthorized' };
    }
    return {
      success: false,
      error: err?.data?.statusMessage || err?.data?.message || err?.statusMessage || 'Request failed',
    };
  }

  if (result?.redirect) {
    await navigateTo(result.redirect);
    await refreshNuxtData();
  }
  return result;
}
