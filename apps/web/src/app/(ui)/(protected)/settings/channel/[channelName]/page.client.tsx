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
} from 'lucide-react';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import {
  updateChannelSettings,
  addChannelManager,
  removeChannelManager,
  deleteChannel,
  toggleGlobalChannelNotifs,
  editStreamInfo,
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
import { parseAsString, useQueryState } from 'nuqs';
import { Write } from '@/components/ui/channel-desc-fancy-area/write';
import { Preview } from '@/components/ui/channel-desc-fancy-area/preview';
import { UploadButton } from '@/lib/uploadthing';
import { useOwnedChannels } from '@/lib/hooks/useUserList';
import { ChannelSelect } from '@/components/app/ChannelSelect/ChannelSelect';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [selTab, setSelTab] = useQueryState('tab', parseAsString.withDefault('general'));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
        <div className='flex-1' />
        <div>
          <ChannelSelect
            channelList={channelList.channels.map(c => c.channel)}
            value={channel.name}
            onSelect={(value) => {
              if (value === 'create') {
                router.push(`/create`);
              } else {
                router.push(`/settings/channel/${value}?tab=${selTab}`);
              }
            }}
          />
        </div>
      </div>

      <Tabs className="w-full" value={selTab} onValueChange={setSelTab}>
        <TabsList className={`grid w-full ${isPersonal ? 'grid-cols-4' : 'grid-cols-5'}`}>
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
          <TabsTrigger value="utilities" className="flex items-center gap-2">
            <Wrench className='size-4' />
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
                                <p className="text-xs text-muted-foreground">Click &quot;Upload new image&quot; to replace</p>
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
                                button: field.value ? "Upload new image" : "Upload profile picture",
                                allowedContent: "Image (1MB max)"
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
                              <p className="mt-2 text-sm text-primary">
                                Uploading...
                              </p>
                            )}
                            
                            {uploadError && (
                              <p className="mt-2 text-sm text-red-600">
                                {uploadError}
                              </p>
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
                ]}
                schemaName="updateChannelSettings"
                action={updateChannelSettings}
                submitText="Save Changes"
                onActionComplete={handleChannelSettingsActionComplete}
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
                  <p className="text-sm text-mantle-foreground mb-4">
                    Use this key to start streaming to your channel. Keep it secure!
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Need help getting started? Check out our{' '}
                    <Link
                      href="https://gist.github.com/SrIzan10/ebd89ced6b21b016d4d389e6711a94e9" 
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      streaming guide
                    </Link>
                    .
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={keyVisible ? 'text' : 'password'}
                        value={streamKey}
                        readOnly
                        className="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-sm"
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
                        value={`https://hctv.srizan.dev/chat/${channel.name}?grant=${channel.obsChatGrantToken}`}
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
