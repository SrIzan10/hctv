import { toast } from 'vue-sonner';
import { callAction } from '~/lib/actions';

type ActionResult = { success: boolean; error?: string; [key: string]: any };

// `toast.promise(serverAction(...))` of the Next page: the loading/success/error toast, then
// refreshNuxtData() instead of revalidatePath. A `{ success: false }` result is reported as an error.
export async function runToastAction(
  name: string,
  body: Record<string, unknown>,
  messages: {
    loading: string;
    success: string | ((res: ActionResult) => string);
    error: string;
  }
) {
  const promise = (async () => {
    const res = (await callAction(name, body)) as ActionResult;
    if (!res.success) throw new Error(res.error || messages.error);
    return res;
  })();
  toast.promise(promise, {
    loading: messages.loading,
    success: (res: ActionResult) =>
      typeof messages.success === 'function' ? messages.success(res) : messages.success,
    error: (e: unknown) => (e instanceof Error && e.message ? e.message : messages.error),
  });
  try {
    await promise;
  } catch {
    // already surfaced through the toast
  }
  await refreshNuxtData();
}
