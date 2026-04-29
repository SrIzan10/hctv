'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

interface StreamKeyResponse {
  key: string;
}

async function parseStreamKeyResponse(response: Response): Promise<StreamKeyResponse> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to load stream key');
  }

  return response.json();
}

async function fetchStreamKey(
  [url, channelName]: readonly [string, string]
): Promise<StreamKeyResponse> {
  const response = await fetch(`${url}?channel=${encodeURIComponent(channelName)}`);
  return parseStreamKeyResponse(response);
}

async function regenerateStreamKey(
  url: string,
  { arg: channelName }: { arg: string }
): Promise<StreamKeyResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: channelName }),
  });

  return parseStreamKeyResponse(response);
}

export function useChannelStreamKey(channelName?: string, initialKey?: string | null) {
  const swrKey = channelName ? (['/api/rtmp/streamKey', channelName] as const) : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<StreamKeyResponse>(
    swrKey,
    fetchStreamKey,
    {
      fallbackData: initialKey ? { key: initialKey } : undefined,
      revalidateOnFocus: false,
    }
  );
  const { trigger, isMutating } = useSWRMutation('/api/rtmp/streamKey', regenerateStreamKey);

  const refreshStreamKey = useCallback(async () => {
    if (!channelName) {
      return undefined;
    }

    return mutate();
  }, [channelName, mutate]);

  const handleRegenerateStreamKey = useCallback(async () => {
    if (!channelName) {
      throw new Error('Select a channel before regenerating its stream key');
    }

    const nextStreamKey = await trigger(channelName);
    await mutate(nextStreamKey, { revalidate: false });
    return nextStreamKey.key;
  }, [channelName, mutate, trigger]);

  return {
    streamKey: data?.key ?? initialKey ?? '',
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    isRegenerating: isMutating,
    refreshStreamKey,
    regenerateStreamKey: handleRegenerateStreamKey,
  };
}
