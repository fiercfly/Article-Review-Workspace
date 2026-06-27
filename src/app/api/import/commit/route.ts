import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyProjectAccess } from "@/lib/auth";

interface ImportArticleInput {
  status: "valid" | "duplicate";
  data: {
    pmid: string | null;
    title: string;
    authors: string | null;
    citation: string | null;
    firstAuthor: string | null;
    journalBook: string | null;
    publicationYear: number | null;
    createDate: string | null;
    pmcid: string | null;
    nihmsId: string | null;
    doi: string | null;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, articles, duplicateStrategy } = await req.json() as {
      projectId: string;
      articles: ImportArticleInput[];
      duplicateStrategy: "skip" | "overwrite" | "keep-both";
    };

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const membership = await verifyProjectAccess(projectId);
    if (!membership) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: "No articles to import" }, { status: 400 });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const newArticlesToCreate: any[] = [];

    for (const item of articles) {
      const { status, data } = item;

      if (status !== "valid" && status !== "duplicate") {
        skippedCount++;
        continue;
      }

      if (status === "duplicate") {
        if (duplicateStrategy === "skip") {
          skippedCount++;
          continue;
        }

        if (duplicateStrategy === "overwrite") {
          // Find existing article by pmid or doi
          const existing = await prisma.article.findFirst({
            where: {
              projectId,
              OR: [
                data.pmid ? { pmid: data.pmid } : undefined,
                data.doi ? { doi: { equals: data.doi } } : undefined,
              ].filter(Boolean) as any[],
            },
          });

          if (existing) {
            await prisma.article.update({
              where: { id: existing.id },
              data: {
                title: data.title,
                authors: data.authors,
                citation: data.citation,
                firstAuthor: data.firstAuthor,
                journalBook: data.journalBook,
                publicationYear: data.publicationYear,
                createDate: data.createDate,
                pmcid: data.pmcid,
                nihmsId: data.nihmsId,
              },
            });
            updatedCount++;
            continue;
          }
        }
      }

      // Collect for high-speed batch createMany
      newArticlesToCreate.push({
        projectId,
        pmid: data.pmid,
        title: data.title,
        authors: data.authors,
        citation: data.citation,
        firstAuthor: data.firstAuthor,
        journalBook: data.journalBook,
        publicationYear: data.publicationYear,
        createDate: data.createDate,
        pmcid: data.pmcid,
        nihmsId: data.nihmsId,
        doi: data.doi,
        reviewStatus: "UNREVIEWED",
      });
    }

    // Execute chunked batch inserts (Chunk size 500)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < newArticlesToCreate.length; i += CHUNK_SIZE) {
      const chunk = newArticlesToCreate.slice(i, i + CHUNK_SIZE);
      await prisma.article.createMany({
        data: chunk,
      });
      importedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      summary: {
        importedCount,
        updatedCount,
        skippedCount,
      },
    });
  } catch (error) {
    console.error("Import commit API error:", error);
    return NextResponse.json({ error: "Failed to save imported articles" }, { status: 500 });
  }
}
