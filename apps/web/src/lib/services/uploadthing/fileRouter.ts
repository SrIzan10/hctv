import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UTFiles, UploadThingError } from 'uploadthing/server';
import { validateRequest } from '../../auth/validate';

const f = createUploadthing();

const auth = async () => {
  const req = await validateRequest();
  return req.user;
};

const getRenamedFile = (file: { name: string }) => {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toLowerCase();
  const dotIndex = file.name.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const rawBaseName = hasExtension ? file.name.slice(0, dotIndex) : file.name;
  const extension = hasExtension ? file.name.slice(dotIndex) : '';
  const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9-_]/g, '-');

  return `pfpup-${safeBaseName}-${suffix}${extension}`;
};

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pfpUpload: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '1MB',
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ files }) => {
      // This code runs on your server before upload
      const user = await auth();

      // If you throw, the user will not be able to upload
      if (!user) throw new UploadThingError('Unauthorized');

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return {
        userId: user.id,
        [UTFiles]: files.map((file) => ({
          ...file,
          name: getRenamedFile(file),
        })),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log('Upload complete for userId:', metadata.userId);

      console.log('file url', file.ufsUrl);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
