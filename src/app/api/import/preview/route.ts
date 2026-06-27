import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { verifyProjectAccess } from "@/lib/auth";
import { validateArticleRow } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user membership and access
    const membership = await verifyProjectAccess(projectId);
    if (!membership) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read the file buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ error: "Excel file sheet is empty" }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    // Convert to JSON array with header row mapping
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in the sheet" }, { status: 400 });
    }

    // Load existing articles in this project to check for duplicates
    const existingArticles = await prisma.article.findMany({
      where: { projectId },
      select: { pmid: true, doi: true, id: true },
    });

    const existingPmids = new Set(existingArticles.map(a => a.pmid).filter(Boolean) as string[]);
    const existingDois = new Set(existingArticles.map(a => a.doi?.toLowerCase()).filter(Boolean) as string[]);

    const processedRows = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      
      // Normalize keys: trim, handle casing
      const getVal = (possibleKeys: string[]): string => {
        for (const k of possibleKeys) {
          const matchedKey = Object.keys(row).find(
            (key) => key.trim().toLowerCase() === k.toLowerCase()
          );
          if (matchedKey) {
            const val = row[matchedKey];
            return val !== undefined && val !== null ? String(val).trim() : "";
          }
        }
        return "";
      };

      const pmid = getVal(["PMID", "PubMed ID"]);
      const title = getVal(["Title", "Article Title"]);
      const authors = getVal(["Authors"]);
      const citation = getVal(["Citation"]);
      const firstAuthor = getVal(["First Author", "FirstAuthor"]);
      const journalBook = getVal(["Journal/Book", "Journal", "Book", "JournalBook"]);
      const rawPubYear = getVal(["Publication Year", "PubYear", "Year"]);
      const createDate = getVal(["Create Date", "CreateDate"]);
      const pmcid = getVal(["PMCID"]);
      const nihmsId = getVal(["NIHMS ID", "NIHMSID"]);
      const doi = getVal(["DOI"]);

      // Parse publication year
      let publicationYear: number | null = null;
      const warnings: string[] = [];
      if (rawPubYear) {
        const yearInt = parseInt(rawPubYear, 10);
        if (isNaN(yearInt)) {
          warnings.push(`Invalid Publication Year: "${rawPubYear}"`);
        } else {
          publicationYear = yearInt;
        }
      }

      const rowData = {
        pmid: pmid || null,
        title,
        authors: authors || null,
        citation: citation || null,
        firstAuthor: firstAuthor || null,
        journalBook: journalBook || null,
        publicationYear,
        createDate: createDate || null,
        pmcid: pmcid || null,
        nihmsId: nihmsId || null,
        doi: doi || null,
      };

      const validation = validateArticleRow(rowData, existingPmids, existingDois);

      // Merge warnings
      validation.warnings = [...warnings, ...validation.warnings];

      if (validation.status === "valid") {
        validCount++;
      } else if (validation.status === "duplicate") {
        duplicateCount++;
      } else {
        invalidCount++;
      }

      processedRows.push({
        index: i + 1,
        status: validation.status,
        errors: validation.errors,
        warnings: validation.warnings,
        data: validation.data,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rawRows.length,
        validCount,
        invalidCount,
        duplicateCount,
      },
      previewRows: processedRows,
    });
  } catch (error) {
    console.error("Import preview API error:", error);
    return NextResponse.json({ error: "Failed to process import file" }, { status: 500 });
  }
}
