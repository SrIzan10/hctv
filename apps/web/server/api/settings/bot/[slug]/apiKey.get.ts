import { prisma } from "@hctv/db";
import { z } from "zod";



function generateApiKey() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `hctvb_${uuid}`;
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? '';
  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKeys = await prisma.botApiKey.findMany({
    where: {
      botAccount: {
        ownerId: user.id,
        slug,
      }
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    }
  });
  return Response.json({ success: true, apiKeys });
});
