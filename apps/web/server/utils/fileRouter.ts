import { createUploadthing, type FileRouter } from 'uploadthing/h3';
import { UTFiles, UploadThingError } from 'uploadthing/server';

const f = createUploadthing();

const getRenamedFile = (file: { name: string }) => {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toLowerCase();
  const dotIndex = file.name.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const rawBaseName = hasExtension ? file.name.slice(0, dotIndex) : file.name;
  const extension = hasExtension ? file.name.slice(dotIndex) : '';
  const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9-_]/g, '-');

  return `pfpup-${safeBaseName}-${suffix}${extension}`;
};

export const ourFileRouter = {
  pfpUpload: f({
    image: {
      maxFileSize: '1MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ files }) => {
      // validateRequest resolves the event through nitro's asyncContext
      const { user } = await validateRequest();
      if (!user) throw new UploadThingError('Unauthorized');

      return {
        userId: user.id,
        [UTFiles]: files.map((file) => ({
          ...file,
          name: getRenamedFile(file),
        })),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete for userId:', metadata.userId);
      console.log('file url', file.ufsUrl);
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
