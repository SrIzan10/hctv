'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetcher } from '@/lib/services/swr';


export default function SonnerNewVersion() {
  const [initialCommitId, setInitialCommitId] = useState<string | null>(null);
  const [hasShownToast, setHasShownToast] = useState(false);

  const { data } = useSWR('/api/commit', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (data?.commit && !initialCommitId) {
      setInitialCommitId(data.commit);
    }
  }, [data?.commit, initialCommitId]);
  
  useEffect(() => {
    if (
      initialCommitId &&
      data?.commit &&
      data.commit !== initialCommitId &&
      !hasShownToast
    ) {
      toast('New version available!', {
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
        duration: Infinity,
        position: 'top-center'
      });
      setHasShownToast(true);
    }
  }, [data?.commit, initialCommitId, hasShownToast]);

  useEffect(() => {
    if (hasShownToast && data?.commit !== initialCommitId) {
      setInitialCommitId(data.commit);
      setHasShownToast(false);
    }
  }, [data?.commit, initialCommitId, hasShownToast]);

  return null;
}