import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, organizationId } = await req.json();

    if (!name || !organizationId) {
      return NextResponse.json({ error: "Name and Organization ID are required" }, { status: 400 });
    }

    // Verify user belongs to organization and is OWNER
    const orgMembership = user.orgMemberships.find(
      (m) => m.organizationId === organizationId
    );

    if (!orgMembership || orgMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only Organization Owners can create projects" }, { status: 403 });
    }

    // Create project and owner project membership in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          name,
          description,
          organizationId,
        },
      });

      await tx.projectMembership.create({
        data: {
          userId: user.id,
          projectId: proj.id,
          role: "OWNER",
        },
      });

      return proj;
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Create project API error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
