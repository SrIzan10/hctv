import { createRouteHandler } from 'uploadthing/h3';
import { ourFileRouter } from '../utils/fileRouter';

export default createRouteHandler({
  router: ourFileRouter,
});
