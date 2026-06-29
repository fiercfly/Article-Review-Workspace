import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyProjectAccess } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Verify project access
    const membership = await verifyProjectAccess(projectId);
    if (!membership) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const priority = searchParams.get("priority") || "ALL";
    const tag = searchParams.get("tag") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const skip = (page - 1) * limit;

    // Build Prisma query filters
    const where: any = {
      projectId,
    };

    // Text search (Title, Authors, Journal, PMID, DOI)
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { authors: { contains: search } },
        { journalBook: { contains: search } },
        { pmid: { contains: search } },
        { doi: { contains: search } },
      ];
    }

    // Status filter
    if (status !== "ALL") {
      where.reviewStatus = status;
    }

    // Priority filter
    if (priority !== "ALL") {
      where.priority = priority;
    }

    // Tag filter
    if (tag) {
      where.tags = { contains: tag };
    }

    // Sort definition
    const orderBy: any = {};
    if (sortBy === "title" || sortBy === "publicationYear" || sortBy === "reviewStatus" || sortBy === "priority" || sortBy === "createdAt" || sortBy === "updatedAt") {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    // Fetch total count and paginated items in parallel
    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          reviewedBy: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    // Extract all unique tags in this project for the filter dropdown
    // Simple query since tags are stored as comma-separated values
    const allProjectArticles = await prisma.article.findMany({
      where: { projectId },
      select: { tags: true },
    });

    const uniqueTags = new Set<string>();
    allProjectArticles.forEach((a) => {
      if (a.tags) {
        a.tags.split(",").forEach((t) => {
          const cleanTag = t.trim();
          if (cleanTag) uniqueTags.add(cleanTag);
        });
      }
    });

    return NextResponse.json({
      success: true,
      articles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      tags: Array.from(uniqueTags).sort(),
      userRole: membership.role,
    });
  } catch (error) {
    console.error("Fetch articles API error:", error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
