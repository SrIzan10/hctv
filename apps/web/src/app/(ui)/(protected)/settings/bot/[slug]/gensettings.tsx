'use client';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { editBot } from '@/lib/form/actions';
import { BotAccount } from '@hctv/db';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UploadButton } from '@/lib/uploadthing';
import { toast } from 'sonner';
import React from 'react';

export function GeneralSettings(props: BotAccount) {
  const router = useRouter();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Edit your bot settings!</CardDescription>
      </CardHeader>
      <CardContent>
        <UniversalForm
          formRef={formRef}
          fields={[
            {
              name: 'from',
              type: 'hidden',
              value: props.id,
              required: true,
            },
            {
              name: 'name',
              type: 'text',
              label: 'Bot Name',
              placeholder: 'Enter bot name',
              required: true,
              value: props.displayName,
            },
            {
              name: 'slug',
              type: 'text',
              label: 'Bot Slug',
              placeholder: 'Enter bot slug',
              required: true,
              value: props.slug,
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Description',
              placeholder: 'Enter bot description',
              value: props.description,
              textArea: true,
            },
            {
              name: 'pfpUrl',
              label: 'Profile Picture',
              type: 'url',
              value: props.pfpUrl,
              component: ({ field }) => {
                return (
                  <div className="space-y-4">
                    <input type="hidden" {...field} />

                    {field.value && (
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={field.value} alt="Current profile picture" />
                          <AvatarFallback>{props.displayName[0]?.toUpperCase()}</AvatarFallback>
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
                            setTimeout(() => {
                              formRef.current?.requestSubmit();
                            }, 0);
                          }
                        }}
                        onUploadError={(error) => {
                          setIsUploading(false);
                          setUploadError(error.message);
                          toast.error(`Upload failed: ${error.message}`);
                        }}
                        disabled={isUploading}
                      />

                      {isUploading && <p className="mt-2 text-sm text-primary">Uploading...</p>}

                      {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}

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
          ]}
          schemaName={'editBot'}
          action={editBot}
          onActionComplete={(result) => {
            if (result?.success) {
              router.refresh();
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
