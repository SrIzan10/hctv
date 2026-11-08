// promise-based confirm dialog (mirrors @omit/react-confirm-dialog's `confirm({...})`).
// <ConfirmHost /> (mounted once in app.vue) renders the current request.
export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** style of the confirm button */
  variant?: 'default' | 'destructive';
};

export type ConfirmRequest = ConfirmOptions & { resolve: (value: boolean) => void };

const current = shallowRef<ConfirmRequest | null>(null);

export function useConfirmState() {
  return current;
}

export function useConfirm() {
  return function confirm(options: ConfirmOptions = {}): Promise<boolean> {
    // a new request cancels one that is still open
    current.value?.resolve(false);
    return new Promise<boolean>((resolve) => {
      current.value = { ...options, resolve };
    });
  };
}
