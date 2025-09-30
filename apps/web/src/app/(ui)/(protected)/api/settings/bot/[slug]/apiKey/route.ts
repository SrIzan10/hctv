import { validateRequest } from "@/lib/auth/validate";
import { prisma } from "@hctv/db";
import { NextRequest } from "next/server";
import { z } from "zod";

type Params = Promise<{ slug: string }>;

export async function POST(request: NextRequest, segmentData: { params: Params }) {
  const { slug } = await segmentData.params;
  const { user } = await validateRequest();
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }

  const bodySchema = z.object({
    action: z.enum(['revoke', 'regenerate', 'create']),
    name: z.string().min(3, 'Name must be at least 3 characters long').max(50, 'Name must be at most 50 characters long'),
  });
  const body = await request.json();
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return new Response(JSON.stringify({ success: false, error: parsedBody.error.errors.map(e => e.message).join(', ') }), { status: 400 });
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
      return new Response(JSON.stringify({ success: false, error: 'API Key with this name already exists' }), { status: 400 });
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
    return new Response(JSON.stringify({ success: true, apiKey: newKey.key, id: newKey.id }));
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
      return new Response(JSON.stringify({ success: false, error: 'API Key not found' }), { status: 404 });
    }
    const newKey = generateApiKey();
    await prisma.botApiKey.update({
      where: { id: existingKey.id },
      data: { key: newKey },
    });
    return new Response(JSON.stringify({ success: true, apiKey: newKey, id: existingKey.id }));
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
      return new Response(JSON.stringify({ success: false, error: 'API Key not found' }), { status: 404 });
    }
    await prisma.botApiKey.delete({
      where: { id: existingKey.id },
    });
    return new Response(JSON.stringify({ success: true }));
  }
  return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400 });
}

export async function GET(request: NextRequest, segmentData: { params: Params }) {
  const { slug } = await segmentData.params;
  const { user } = await validateRequest();
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
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
  return new Response(JSON.stringify({ success: true, apiKeys }));
}

function generateApiKey() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `hctvb_${uuid}`;
}