import { prisma } from "@hctv/db";
import { z } from "zod";



function generateApiKey() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `hctvb_${uuid}`;
}

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const slug = getRouterParam(event, 'slug') ?? '';
  const { user } = await validateRequest();
  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const bodySchema = z.object({
    action: z.enum(['revoke', 'regenerate', 'create']),
    name: z.string().min(3, 'Name must be at least 3 characters long').max(50, 'Name must be at most 50 characters long'),
  });
  const body = await request.json();
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      {
        success: false,
        error: parsedBody.error.issues.map((issue) => issue.message).join(', '),
      },
      { status: 400 }
    );
  }

  const { action, name } = parsedBody.data;

  if (action === 'create') {
    const exists = await prisma.botApiKey.findFirst({
      where: {
        name,
        botAccount: {
          ownerId: user.id,
          slug,
        }
      }
    });
    if (exists) {
      return Response.json({ success: false, error: 'API Key with this name already exists' }, { status: 400 });
    }
    const newKey = await prisma.botApiKey.create({
      data: {
        name,
        botAccount: {
          connect: {
            ownerId: user.id,
            slug,
          }
        },
        key: generateApiKey(),
      }
    });
    return Response.json({ success: true, apiKey: newKey.key, id: newKey.id });
  }
  if (action === 'regenerate') {
    const existingKey = await prisma.botApiKey.findFirst({
      where: {
        name,
        botAccount: {
          ownerId: user.id,
          slug,
        }
      }
    });
    if (!existingKey) {
      return Response.json({ success: false, error: 'API Key not found' }, { status: 404 });
    }
    const newKey = generateApiKey();
    await prisma.botApiKey.update({
      where: { id: existingKey.id },
      data: { key: newKey },
    });
    return Response.json({ success: true, apiKey: newKey, id: existingKey.id });
  }
  if (action === 'revoke') {
    const existingKey = await prisma.botApiKey.findFirst({
      where: {
        name,
        botAccount: {
          ownerId: user.id,
          slug,
        }
      }
    });
    if (!existingKey) {
      return Response.json({ success: false, error: 'API Key not found' }, { status: 404 });
    }
    await prisma.botApiKey.delete({
      where: { id: existingKey.id },
    });
    return Response.json({ success: true });
  }
  return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
});
