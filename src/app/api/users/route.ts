import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        projectMemberships: {
          include: {
            project: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
