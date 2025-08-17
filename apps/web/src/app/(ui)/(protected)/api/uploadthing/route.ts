import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "@/lib/services/uploadthing/fileRouter";

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
