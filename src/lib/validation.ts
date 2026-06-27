export interface RowData {
  pmid?: string | null;
  title?: string;
  authors?: string | null;
  citation?: string | null;
  firstAuthor?: string | null;
  journalBook?: string | null;
  publicationYear?: number | null;
  createDate?: string | null;
  pmcid?: string | null;
  nihmsId?: string | null;
  doi?: string | null;
}

export interface ValidationResult {
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
  warnings: string[];
  data: RowData;
}

/**
 * Validates a single parsed Excel row for import.
 */
export function validateArticleRow(
  data: RowData,
  existingPmids: Set<string>,
  existingDois: Set<string>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let status: "valid" | "invalid" | "duplicate" = "valid";

  // 1. Title Validation (Required)
  if (!data.title || !data.title.trim()) {
    errors.push("Missing Title (Required)");
    status = "invalid";
  }

  // 2. Duplicate Detection
  let isDuplicate = false;
  if (data.pmid && existingPmids.has(data.pmid.trim())) {
    isDuplicate = true;
    warnings.push(`Duplicate PMID found in project: ${data.pmid}`);
  }
  if (data.doi && existingDois.has(data.doi.trim().toLowerCase())) {
    isDuplicate = true;
    warnings.push(`Duplicate DOI found in project: ${data.doi}`);
  }

  if (status !== "invalid") {
    if (isDuplicate) {
      status = "duplicate";
    }
  }

  return {
    status,
    errors,
    warnings,
    data,
  };
}
