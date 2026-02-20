'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Users,
  Key,
  Bell,
  Trash2,
  Shield,
  UserPlus,
  UserMinus,
  Copy,
  Check,
  Wrench,
  Eye,
  EyeOff,
  MessageSquareWarning,
} from 'lucide-react';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import {
  updateChannelSettings,
  addChannelManager,
  removeChannelManager,
  deleteChannel,
  toggleGlobalChannelNotifs,
  editStreamInfo,
  changeUsername,
  updateChatModeration,
} from '@/lib/form/actions';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type {
  Channel,
  User,
  StreamInfo,
  StreamKey,
  Follow,
  ChatModerationSettings,
} from '@hctv/db';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserCombobox } from '@/components/app/UserCombobox/UserCombobox';
import { parseAsString, useQueryState } from 'nuqs';
import { Write } from '@/components/ui/channel-desc-fancy-area/write';
import { Preview } from '@/components/ui/channel-desc-fancy-area/preview';
import { UploadButton } from '@/lib/uploadthing';
import { useOwnedChannels } from '@/lib/hooks/useUserList';
import { ChannelSelect } from '@/components/app/ChannelSelect/ChannelSelect';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useConfirm } from '@omit/react-confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';
import type { MediaMTXRegion } from '@/lib/utils/mediamtx/regions';

interface ChannelSettingsClientProps {
  channel: Channel & {
    owner: User;
    ownerPersonalChannel: Channel | null;
    managers: User[];
    managerPersonalChannels: (Channel | null)[];
    streamInfo: StreamInfo[];
    streamKey: StreamKey | null;
    chatSettings: ChatModerationSettings | null;
    followers: (Follow & { user: { id: string; slack_id: string } })[];
    followerPersonalChannels: (Channel | null)[];
    is247: boolean;
    nameLastChanged: Date | null;
  };
  isOwner: boolean;
  currentUser: User;
  isPersonal: boolean;
}

export default function ChannelSettingsClient({
  channel,
  isOwner,
  currentUser,
  isPersonal,
}: ChannelSettingsClientProps) {
  const confirm = useConfirm();
  const [streamKey, setStreamKey] = useState(channel.streamKey?.key || '');
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState({
    streamKey: false,
    streamUrl: false,
  });
  const [selTab, setSelTab] = useQueryState('tab', parseAsString.withDefault('general'));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [region, setRegion] = useState<MediaMTXRegion>('hq');
  const channelList = useOwnedChannels();
  const router = useRouter();

  const handleStreamInfoActionComplete = useCallback((result: any) => {
    if (result?.success) {
      toast.success('Stream information updated');
    }
  }, []);

  const handleChannelSettingsActionComplete = useCallback((result: any) => {
    if (result?.success) {
      toast.success('Channel settings updated successfully');
    }
  }, []);

  const handleModerationActionComplete = useCallback((result: any) => {
    if (result?.success) {
      toast.success('Moderation settings updated');
    }
  }, []);

  const handleUsernameChangeComplete = useCallback(
    (result: any) => {
      if (result?.success && result?.newUsername) {
        toast.success('Username changed successfully! Redirecting...');
        router.push(`/settings/channel/${result.newUsername}?tab=${selTab}`);
      }
    },
    [router, selTab]
  );

  const getUsernameChangeCooldownInfo = () => {
    if (!channel.nameLastChanged) {
      return { canChange: true, daysRemaining: 0 };
    }
    const daysSinceLastChange = Math.floor(
      (Date.now() - new Date(channel.nameLastChanged).getTime()) / (1000 * 60 * 60 * 24)
    );
    const cooldownDays = 30;
    if (daysSinceLastChange >= cooldownDays) {
      return { canChange: true, daysRemaining: 0 };
    }
    return { canChange: false, daysRemaining: cooldownDays - daysSinceLastChange };
  };

  const cooldownInfo = getUsernameChangeCooldownInfo();

  const copyStreamKey = async () => {
    if (streamKey) {
      await navigator.clipboard.writeText(streamKey);
      setCopied({ ...copied, streamKey: true });
      toast.success('Stream key copied to clipboard');
      setTimeout(() => setCopied({ ...copied, streamKey: false }), 2000);
    }
  };

  const regenerateStreamKey = async () => {
    try {
      const response = await fetch('/api/rtmp/streamKey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel.name }),
      });

      if (response.ok) {
        const data = await response.json();
        setStreamKey(data.key);
        toast.success('Stream key regenerated successfully');
      } else {
        toast.error('Failed to regenerate stream key');
      }
    } catch (error) {
      toast.error('Failed to regenerate stream key');
    }
  };

  const generateStreamUrl = () => {
    if (!streamKey) {
      toast.error('Stream key not available');
      return '';
    }
    const { ingestRoute } = getMediamtxClientEnvs(region);
    return `srt://${ingestRoute}?streamid=publish:${channel.name}:thisusernameislongonpurposesoyoudontaccidentallyleakyourstreamkey:${streamKey}&pkt_size=1316`;
  };

  const copyStreamUrl = async () => {
    const url = generateStreamUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied({ ...copied, streamUrl: true });
      toast.success('Stream URL copied to clipboard');
      setTimeout(() => setCopied({ ...copied, streamUrl: false }), 2000);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6 flex">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={channel.pfpUrl} alt={channel.name} />
            <AvatarFallback>{channel.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{channel.name}</h1>
            <p className="text-mantle-foreground">Channel Settings</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {channel.followers.length} follower{channel.followers.length !== 1 ? 's' : ''}
              </Badge>
              {isOwner && <Badge variant="outline">Owner</Badge>}
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div>
          <ChannelSelect
            channelList={channelList.channels.map((c) => c.channel)}
            value={channel.name}
            onSelect={(value) => {
              if (value === 'create') {
                router.push(`/settings/channel/create`);
              } else {
                router.push(`/settings/channel/${value}?tab=${selTab}`);
              }
            }}
          />
        </div>
      </div>

      <Tabs className="w-full" value={selTab} onValueChange={setSelTab}>
        <TabsList className={`grid w-full ${isPersonal ? 'grid-cols-5' : 'grid-cols-6'}`}>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="stream" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Streaming
          </TabsTrigger>
          {!isPersonal && (
            <TabsTrigger value="managers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Managers
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="utilities" className="flex items-center gap-2">
            <Wrench className="size-4" />
            Utilities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your channel&apos;s basic information and settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <UniversalForm
                fields={[
                  { name: 'channelId', type: 'hidden', value: channel.id, label: 'Channel ID' },
                  {
                    name: 'pfpUrl',
                    label: 'Profile Picture',
                    type: 'url',
                    value: channel.pfpUrl,
                    component: ({ field }) => {
                      return (
                        <div className="space-y-4">
                          <input type="hidden" {...field} />

                          {field.value && (
                            <div className="flex items-center space-x-4">
                              <Avatar className="h-16 w-16">
                                <AvatarImage src={field.value} alt="Current profile picture" />
                                <AvatarFallback>{channel.name[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Current profile picture</p>
                                <p className="text-xs text-muted-foreground">
                                  Click &quot;Upload new image&quot; to replace
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  field.onChange('');
                                  setUploadError(null);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          )}

                          <div>
                            <UploadButton
                              endpoint="pfpUpload"
                              className="mt-2 ut-button:bg-mantle ut-button:text-mantle-foreground ut-allowed-content:text-muted-foreground/70"
                              content={{
                                button: field.value ? 'Upload new image' : 'Upload profile picture',
                                allowedContent: 'Image (1MB max)',
                              }}
                              onUploadBegin={() => {
                                setIsUploading(true);
                                setUploadError(null);
                              }}
                              onClientUploadComplete={(res) => {
                                setIsUploading(false);
                                if (res && res[0]) {
                                  field.onChange(res[0].ufsUrl);
                                  toast.success('Profile picture uploaded successfully!');
                                }
                              }}
                              onUploadError={(error) => {
                                setIsUploading(false);
                                setUploadError(error.message);
                                toast.error(`Upload failed: ${error.message}`);
                              }}
                              disabled={isUploading}
                            />

                            {isUploading && (
                              <p className="mt-2 text-sm text-primary">Uploading...</p>
                            )}

                            {uploadError && (
                              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                            )}

                            {!field.value && !isUploading && !uploadError && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                Upload a profile picture for your channel.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    name: 'description',
                    label: 'Channel Description',
                    value: channel.description,
                    component: ({ field }) => (
                      <div>
                        <input type="hidden" {...field} />
                        <Tabs defaultValue="write" className="w-full">
                          <TabsList>
                            <TabsTrigger value="write">Write</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                          </TabsList>
                          <TabsContent value="write">
                            <Write
                              textValue={field.value || ''}
                              setTextValue={(value) => {
                                field.onChange(value);
                              }}
                            />
                          </TabsContent>
                          <TabsContent value="preview">
                            <Preview textValue={field.value || ''} className="h-[159.5px]" />
                          </TabsContent>
                        </Tabs>
                      </div>
                    ),
                  },
                  {
                    name: 'is247',
                    value: channel.is247,
                    component: ({ field }) => (
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <label className="text-sm font-medium">24/7 Channel</label>
                          <p className="text-xs text-muted-foreground">
                            Mark this channel as always live. It will disable notifications on
                            #hctv-streams.
                          </p>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                          }}
                        />
                        <input type="hidden" {...field} value={field.value ? 'true' : 'false'} />
                      </div>
                    ),
                  },
                ]}
                schemaName="updateChannelSettings"
                action={updateChannelSettings}
                submitText="Save Changes"
                onActionComplete={handleChannelSettingsActionComplete}
              />

              <Separator />

              {isPersonal && isOwner && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Username</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your username is how others find and mention you on hctv. You can change it once
                    every 30 days.
                  </p>
                  {!cooldownInfo.canChange && (
                    <div className="p-3 border border-accent/20 rounded-lg bg-accent/5">
                      <p className="text-sm text-accent">
                        You can change your username again in {cooldownInfo.daysRemaining} day
                        {cooldownInfo.daysRemaining === 1 ? '' : 's'}.
                      </p>
                    </div>
                  )}
                  <UniversalForm
                    fields={[
                      { name: 'channelId', type: 'hidden', value: channel.id, label: 'Channel ID' },
                      {
                        name: 'newUsername',
                        label: 'New Username',
                        type: 'text',
                        value: '',
                        placeholder: channel.name,
                        description:
                          'Only lowercase letters, numbers, underscores, and dashes. Max 20 characters.',
                        inputFilter: /[^a-z0-9_-]/g,
                        maxChars: 20,
                      },
                    ]}
                    schemaName="changeUsername"
                    action={changeUsername}
                    submitText="Change Username"
                    onActionComplete={handleUsernameChangeComplete}
                  />
                </div>
              )}

              {isOwner && !isPersonal && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                    <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                      <div>
                        <p className="font-medium text-destructive">Delete Channel</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete this channel. This action cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: 'Delete Channel',
                              description:
                                'Are you sure you want to delete this channel? This action cannot be undone.',
                              confirmText: 'Delete',
                              cancelText: 'Cancel',
                            })
                          ) {
                            const result = await deleteChannel(channel.id);
                            if (result.success) {
                              toast.success('Channel deleted successfully');
                              router.push('/settings/channel');
                            } else {
                              toast.error(result.error || 'Failed to delete channel');
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stream">
          <Card>
            <CardHeader>
              <CardTitle>Streaming Settings</CardTitle>
              <CardDescription>Manage your stream key and streaming configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stream Key</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={keyVisible ? 'text' : 'password'}
                          value={streamKey}
                          readOnly
                          className="w-full px-3 py-2 pr-10 border rounded-md bg-mantle font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setKeyVisible(!keyVisible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {keyVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button onClick={regenerateStreamKey} variant="outline" size="smicon">
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="smicon"
                        onClick={copyStreamKey}
                        disabled={!streamKey}
                      >
                        {copied.streamKey ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Stream URL (for OBS)</label>
                      <Select value={region} onValueChange={(v) => setRegion(v as MediaMTXRegion)}>
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hq">HQ Server A 🇺🇸</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={generateStreamUrl()}
                          readOnly
                          className="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-xs"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="smicon"
                        onClick={copyStreamUrl}
                        disabled={!streamKey}
                      >
                        {copied.streamUrl ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Need help getting started? Check out our{' '}
                  <Link
                    href="https://docs.hackclub.tv/guides/start-stream/"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    streaming guide
                  </Link>
                  .
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Stream Information</h3>
                {channel.streamInfo.length > 0 ? (
                  <div className="space-y-4">
                    {channel.streamInfo.map((stream, index) => (
                      <UniversalForm
                        key={stream.id}
                        fields={[
                          {
                            name: 'username',
                            type: 'hidden',
                            value: stream.username,
                            label: 'Username',
                          },
                          {
                            name: 'title',
                            label: 'Stream Title',
                            type: 'text',
                            value: stream.title,
                          },
                          {
                            name: 'category',
                            label: 'Category',
                            type: 'text',
                            value: stream.category,
                          },
                        ]}
                        schemaName="streamInfoEdit"
                        action={editStreamInfo}
                        submitText="Update Stream Info"
                        onActionComplete={handleStreamInfoActionComplete}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-mantle-foreground">No stream information available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isPersonal && (
          <TabsContent value="managers">
            <Card>
              <CardHeader>
                <CardTitle>Channel Managers</CardTitle>
                <CardDescription>
                  Manage who can help moderate and stream to this channel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Current Managers</h3>
                    {isOwner && (
                      <AddManagerDialog
                        channelId={channel.id}
                        existingManagers={[...channel.managers.map((m) => m.id), channel.owner.id]}
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Owner */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={channel.owner.pfpUrl} />
                          <AvatarFallback>
                            {channel.owner.slack_id[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{channel.ownerPersonalChannel?.name}</p>
                          <p className="text-sm text-mantle-foreground">Channel Owner</p>
                        </div>
                      </div>
                      <Badge variant="default">
                        <Shield className="h-3 w-3 mr-1" />
                        Owner
                      </Badge>
                    </div>

                    {/* Managers */}
                    {channel.managers.map((manager) => {
                      const personalChannel = channel.managerPersonalChannels.find(
                        (c) => c?.ownerId === manager.id
                      );
                      return (
                        <div
                          key={manager.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={manager.pfpUrl} />
                              <AvatarFallback>{personalChannel?.name}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{personalChannel?.name}</p>
                              <p className="text-sm text-mantle-foreground">Manager</p>
                            </div>
                          </div>
                          {isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: 'Remove Manager',
                                    description: `Are you sure you want to remove ${personalChannel?.name} as a manager? They will no longer be able to stream or moderate this channel.`,
                                    confirmText: 'Remove',
                                    cancelText: 'Cancel',
                                  })
                                ) {
                                  removeChannelManager(channel.id, manager.id);
                                }
                              }}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {channel.managers.length === 0 && (
                      <p className="text-mantle-foreground text-center py-8">
                        No managers added yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure when and how followers are notified about your streams.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Stream Notifications</h3>
                    <p className="text-sm text-mantle-foreground">
                      Send notifications to followers when you go live
                    </p>
                  </div>
                  <Switch
                    checked={channel.streamInfo[0]?.enableNotifications ?? true}
                    onCheckedChange={(checked) => {
                      toast.promise(toggleGlobalChannelNotifs(channel.id), {
                        loading: 'Updating notifications...',
                        success(data) {
                          return `${
                            data.toggle ? 'Enabled' : 'Disabled'
                          } global notifications for this channel.`;
                        },
                      });
                    }}
                  />
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Followers ({channel.followers.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {channel.followers.map((follower) => {
                      const personalChannel = channel.followerPersonalChannels.find(
                        (c) => c?.ownerId === follower.user.id
                      );
                      return (
                        <div
                          key={follower.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{personalChannel?.name}</AvatarFallback>
                              <AvatarImage
                                src={personalChannel?.pfpUrl}
                                alt={personalChannel?.name}
                              />
                            </Avatar>
                            <span className="text-sm">{personalChannel?.name}</span>
                          </div>
                          <Badge variant={follower.notifyStream ? 'default' : 'secondary'}>
                            {follower.notifyStream ? 'Notifications On' : 'Notifications Off'}
                          </Badge>
                        </div>
                      );
                    })}
                    {channel.followers.length === 0 && (
                      <p className="text-mantle-foreground text-center py-4">No followers yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Chat Moderation</CardTitle>
              <CardDescription>
                Configure rate limits, slow mode, and blocked words for this channel&apos;s live
                chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UniversalForm
                fields={[
                  { name: 'channelId', type: 'hidden', value: channel.id, label: 'Channel ID' },
                  {
                    name: 'slowModeSeconds',
                    label: 'Slow mode (seconds)',
                    type: 'number',
                    value: channel.chatSettings?.slowModeSeconds ?? 0,
                    description: 'Users can send one message per interval. Set 0 to disable.',
                  },
                  {
                    name: 'maxMessageLength',
                    label: 'Max message length',
                    type: 'number',
                    value: channel.chatSettings?.maxMessageLength ?? 400,
                    description: 'Maximum allowed message length in characters.',
                  },
                  {
                    name: 'rateLimitCount',
                    label: 'Messages per window',
                    type: 'number',
                    value: channel.chatSettings?.rateLimitCount ?? 8,
                    description: 'How many messages a user can send in the rate limit window.',
                  },
                  {
                    name: 'rateLimitWindowSeconds',
                    label: 'Rate window (seconds)',
                    type: 'number',
                    value: channel.chatSettings?.rateLimitWindowSeconds ?? 10,
                    description: 'Window size used for spam protection.',
                  },
                  {
                    name: 'blockedTerms',
                    label: 'Blocked terms',
                    value: (channel.chatSettings?.blockedTerms ?? []).join('\n'),
                    textArea: true,
                    textAreaRows: 8,
                    description:
                      'One term per line (or comma-separated). Messages containing these terms are blocked.',
                  },
                ]}
                schemaName="updateChatModeration"
                action={updateChatModeration}
                submitText="Save moderation settings"
                onActionComplete={handleModerationActionComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="utilities">
          <Card>
            <CardHeader>
              <CardTitle>Utilities</CardTitle>
              <CardDescription>OBS overlays, APIs... everything in one neat place!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Chat overlay</h3>
                  <p className="text-sm text-mantle-foreground mb-4">
                    Add a 300x600 browser source with this and enjoy!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={keyVisible ? 'text' : 'password'}
                        value={`https://hackclub.tv/chat/${channel.name}?grant=${channel.obsChatGrantToken}`}
                        readOnly
                        className="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-sm"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setKeyVisible(!keyVisible)}>
                      {keyVisible ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddManagerDialog({
  channelId,
  existingManagers,
}: {
  channelId: string;
  existingManagers: string[];
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Manager
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add channel manager</DialogTitle>
          <DialogDescription>
            Add a channel manager to help manage your channel during big events or projects.
          </DialogDescription>
        </DialogHeader>
        <UserCombobox
          onValueChange={(value) => {
            setChannel(value);
          }}
          filter={existingManagers}
          value={channel}
          modal
        />
        <DialogFooter>
          <Button
            onClick={async () => {
              toast.promise(addChannelManager(channelId, channel), {
                loading: 'Adding manager...',
                success: 'Manager added successfully',
                error: 'Failed to add manager',
              });
              setOpen(false);
              setChannel('');
            }}
          >
            Add Manager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
