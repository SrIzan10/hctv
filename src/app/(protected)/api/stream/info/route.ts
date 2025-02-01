import prisma from "@/lib/db";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const db = await prisma.streamInfo.findMany({
    include: { ownedBy: true },
  });

  return Response.json(db);
}