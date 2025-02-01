'use client';

import { Button } from '@/components/ui/button';
import { fetcher as defaultFetcher } from '@/lib/services/swr';
import React from 'react';
import { toast } from 'sonner';
import useSWR from 'swr/mutation';

export default function RegenerateKey() {
  const { error, isMutating, trigger } = useSWR('/api/livekit/broadcasterToken', async (url) =>
    defaultFetcher(url)
  );

  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <Button
      type="button"
      variant="outline"
      className="float-left"
      loading={isMutating}
      onClick={async () => {
        const result = await trigger();
        if (result?.key) {
          await navigator.clipboard.writeText(result.key);
          toast.success('Key regenerated and copied to clipboard');
        }
      }}
    >
      Regenerate key
    </Button>
  );
}
