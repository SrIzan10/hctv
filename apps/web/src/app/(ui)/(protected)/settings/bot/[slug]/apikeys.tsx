'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/services/swr';
import { useConfirm } from '@omit/react-confirm-dialog';
import { Plus, RefreshCcw, Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

export function ApiKeys({ slug }: { slug: string }) {
  const confirm = useConfirm();
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const { data, error, isLoading, mutate } = useSWR<GetResponse>(
    `/api/settings/bot/${slug}/apiKey`,
    fetcher
  );
  const { trigger } = useSWRMutation(`/api/settings/bot/${slug}/apiKey`, createApiKey);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Manage your API keys</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <ApiKeysSkeleton />}
        {error && <p>Error loading API keys</p>}
        {data && !data.success && <p>Error: Could not fetch API keys</p>}
        {data && (
          <div className="flex">
            <Input
              placeholder="New API Key Name"
              className="flex-1 mr-2"
              value={newApiKeyName}
              onChange={(e) => setNewApiKeyName(e.target.value)}
            />
            <Button
              size="icon"
              onClick={() => {
                if (newApiKeyName.trim().length < 3) {
                  toast.error('API Key name must be at least 3 characters long');
                  return;
                }
                if (newApiKeyName.trim().length > 50) {
                  toast.error('API Key name must be at most 50 characters long');
                  return;
                }
                trigger({ action: 'create', name: newApiKeyName }).then(
                  async (res: PostResponse) => {
                    if (res.success) {
                      setNewApiKeyName('');
                      await navigator.clipboard
                        .writeText(res.apiKey || '')
                        .then(() => toast.success('API key copied to clipboard'))
                        .catch(() => {
                          alert('Failed to copy API key to clipboard, here it is: ' + res.apiKey);
                        });
                      await mutate();
                    } else {
                      alert(res.error || 'Error creating API key');
                    }
                  }
                );
              }}
            >
              <Plus />
            </Button>
          </div>
        )}
        {data && data.success && data.apiKeys.length === 0 && <p>No API keys found</p>}
        {data && data.success && data.apiKeys.length > 0 && (
          <ul className="space-y-2 pt-4">
            {data.apiKeys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between p-3 bg-mantle/50 rounded-md"
              >
                <div className="flex-1">
                  <strong className="text-sm font-medium">{key.name}</strong>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const confirmation = await confirm({
                        title: 'Regenerate API Key',
                        description:
                          'Are you sure you want to regenerate this API key? The old key will stop working.',
                        confirmText: 'Regenerate',
                        cancelText: 'Cancel',
                      });
                      if (!confirmation) return;

                      trigger({ action: 'regenerate', name: key.name }).then(
                        async (res: PostResponse) => {
                          if (res.success) {
                            await navigator.clipboard
                              .writeText(res.apiKey || '')
                              .then(() => {
                                toast.success('API key copied to clipboard');
                              })
                              .catch(() => {
                                alert(
                                  'Failed to copy API key to clipboard, here it is: ' + res.apiKey
                                );
                              });
                            mutate();
                          } else {
                            alert(res.error || 'Error regenerating API key');
                          }
                        }
                      );
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      const confirmation = await confirm({
                        title: 'Revoke API Key',
                        description:
                          'Are you sure you want to revoke this API key? This action cannot be undone.',
                        confirmText: 'Revoke',
                        cancelText: 'Cancel',
                      });
                      if (!confirmation) return;
                      trigger({ action: 'revoke', name: key.name }).then(
                        async (res: PostResponse) => {
                          if (res.success) {
                            await mutate();
                          } else {
                            alert(res.error || 'Error revoking API key');
                          }
                        }
                      );
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ApiKeysSkeleton() {
  return (
    <>
      <div className='flex'>
        <Skeleton className='h-10 flex-1 mr-2' />
        <Skeleton className='h-10 w-10' />
      </div>
      <div className='space-y-2 pt-4'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='flex items-center justify-between p-3 bg-mantle/50 rounded-md'>
            <div className='flex-1'>
              <Skeleton className='h-4 w-1/2' />
            </div>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-8 w-8' />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

async function createApiKey(url: string, { arg }: { arg: PostRequest }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  });
  return res.json();
}

interface GetResponse {
  success: boolean;
  apiKeys: Array<{ id: string; name: string; createdAt: string }>;
}

interface PostRequest {
  action: 'revoke' | 'regenerate' | 'create';
  name: string;
}
interface PostResponse {
  success: boolean;
  apiKey?: string;
  id?: string;
  error?: string;
}
