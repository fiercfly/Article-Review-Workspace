import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user-id")?.value;

  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: {
        include: {
          organization: true,
        },
      },
      projectMemberships: {
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  // Get all projects belonging to the user's organizations
  const userOrgIds = user.orgMemberships.map((om) => om.organizationId);
  const orgProjects = await prisma.project.findMany({
    where: {
      organizationId: { in: userOrgIds },
    },
    include: {
      organization: true,
    },
  });

  // Combine explicit project memberships and organization-wide projects
  const mergedProjectMemberships = [...user.projectMemberships];
  for (const proj of orgProjects) {
    const hasExplicit = mergedProjectMemberships.some((pm) => pm.projectId === proj.id);
    if (!hasExplicit) {
      mergedProjectMemberships.push({
        id: `org-pm-${user.id}-${proj.id}`,
        userId: user.id,
        projectId: proj.id,
        role: "REVIEWER",
        createdAt: new Date(),
        project: proj,
      } as any);
    }
  }

  return NextResponse.json({
    user: {
      ...user,
      projectMemberships: mergedProjectMemberships,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set("user-id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("user-id");
  return NextResponse.json({ success: true });
}
