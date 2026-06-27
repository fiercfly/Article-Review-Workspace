import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyProjectAccess } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const { projectId, articleIds, updates } = await req.json() as {
      projectId: string;
      articleIds: string[];
      updates: {
        reviewStatus?: string;
        priority?: string;
        notes?: string;
        tags?: string;
      };
    };

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (!articleIds || articleIds.length === 0) {
      return NextResponse.json({ error: "Article IDs are required" }, { status: 400 });
    }

    // Verify project access
    const membership = await verifyProjectAccess(projectId);
    if (!membership) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // Enforce that all articleIds belong to this projectId
    const matchingArticlesCount = await prisma.article.count({
      where: {
        id: { in: articleIds },
        projectId,
      },
    });

    if (matchingArticlesCount !== articleIds.length) {
      return NextResponse.json(
        { error: "One or more articles do not belong to this project" },
        { status: 400 }
      );
    }

    // Prepare update payload
    const updateData: any = {};
    if (updates.reviewStatus !== undefined) updateData.reviewStatus = updates.reviewStatus;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    // Normalize tags: trim and store comma-separated
    if (updates.tags !== undefined) {
      updateData.tags = updates.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .join(",");
    }

    // Capture who reviewed and when if reviewStatus is updated
    if (updates.reviewStatus) {
      updateData.reviewedById = membership.userId;
      updateData.reviewedAt = new Date();
    }

    // Perform updates
    await prisma.article.updateMany({
      where: {
        id: { in: articleIds },
        projectId,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${articleIds.length} article(s)`,
    });
  } catch (error) {
    console.error("Review update API error:", error);
    return NextResponse.json({ error: "Failed to update article(s)" }, { status: 500 });
  }
}
