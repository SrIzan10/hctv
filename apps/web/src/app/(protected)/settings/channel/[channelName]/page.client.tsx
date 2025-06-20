'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import {
  updateChannelSettings,
  addChannelManager,
  removeChannelManager,
  deleteChannel,
  toggleGlobalChannelNotifs,
} from '@/lib/form/actions';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Channel, User, StreamInfo, StreamKey, Follow } from '@hctv/db';
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
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';

interface ChannelSettingsClientProps {
  channel: Channel & {
    owner: User;
    ownerPersonalChannel: Channel | null;
    managers: User[];
    managerPersonalChannels: (Channel | null)[];
    streamInfo: StreamInfo[];
    streamKey: StreamKey | null;
    followers: (Follow & { user: { id: string; slack_id: string } })[];
    followerPersonalChannels: (Channel | null)[];
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
  const [streamKey, setStreamKey] = useState(channel.streamKey?.key || '');
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selTab, setSelTab] = useQueryState('tabs', parseAsString.withDefault('general'));

  const copyStreamKey = async () => {
    if (streamKey) {
      await navigator.clipboard.writeText(streamKey);
      setCopied(true);
      toast.success('Stream key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
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
  console.log(isPersonal)

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={channel.pfpUrl} alt={channel.name} />
            <AvatarFallback>{channel.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{channel.name}</h1>
            <p className="text-muted-foreground">Channel Settings</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {channel.followers.length} follower{channel.followers.length !== 1 ? 's' : ''}
              </Badge>
              {isOwner && <Badge variant="outline">Owner</Badge>}
            </div>
          </div>
        </div>
      </div>

      <Tabs className="w-full" value={selTab} onValueChange={setSelTab}>
        <TabsList className={`grid w-full ${isPersonal ? 'grid-cols-3' : 'grid-cols-4'}`}>
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
                  { name: 'name', label: 'Channel Name', type: 'text', value: channel.name },
                  {
                    name: 'pfpUrl',
                    label: 'Profile Picture URL',
                    type: 'url',
                    value: channel.pfpUrl,
                  },
                ]}
                schemaName="updateChannelSettings"
                action={updateChannelSettings}
                submitText="Save Changes"
                onActionComplete={(result: any) => {
                  if (result?.success) {
                    toast.success('Channel settings updated successfully');
                  }
                }}
              />

              {false && isOwner && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                    <Card className="border-destructive">
                      <CardHeader>
                        <CardTitle className="text-destructive">Delete Channel</CardTitle>
                        <CardDescription>
                          Permanently delete this channel. This action cannot be undone.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this channel? This action cannot be undone.'
                              )
                            ) {
                              deleteChannel(channel.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Channel
                        </Button>
                      </CardContent>
                    </Card>
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
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Stream Key</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use this key to start streaming to your channel. Keep it secure!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={keyVisible ? 'text' : 'password'}
                        value={streamKey}
                        readOnly
                        className="w-full px-3 py-2 border rounded-md bg-muted font-mono text-sm"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setKeyVisible(!keyVisible)}>
                      {keyVisible ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyStreamKey}
                      disabled={!streamKey}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={regenerateStreamKey} variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Regenerate Stream Key
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Stream Information</h3>
                {channel.streamInfo.length > 0 ? (
                  <div className="space-y-4">
                    {channel.streamInfo.map((stream) => (
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
                        action={updateChannelSettings}
                        submitText="Update Stream Info"
                        onActionComplete={(result: any) => {
                          if (result?.success) {
                            toast.success('Stream information updated');
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No stream information available.</p>
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
                        existingManagers={[
                          ...channel.managers.map((m) => m.id),
                          channel.owner.id,
                        ]}
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
                          <p className="text-sm text-muted-foreground">Channel Owner</p>
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
                              <p className="text-sm text-muted-foreground">Manager</p>
                            </div>
                          </div>
                          {isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Remove this manager?')) {
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
                      <p className="text-muted-foreground text-center py-8">
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
                    <p className="text-sm text-muted-foreground">
                      Send notifications to followers when you go live
                    </p>
                  </div>
                  <Switch
                    checked={channel.streamInfo[0]?.enableNotifications ?? true}
                    onCheckedChange={(checked) => {
                      toast.promise(toggleGlobalChannelNotifs(channel.id), {
                        loading: 'Updating notifications...',
                        success(data) {
                          return `${data.toggle ? 'Enabled' : 'Disabled'} global notifications for this channel.`
                        },
                      })
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
                              <AvatarImage src={personalChannel?.pfpUrl} alt={personalChannel?.name} />
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
                      <p className="text-muted-foreground text-center py-4">No followers yet.</p>
                    )}
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
