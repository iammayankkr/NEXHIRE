/**
 * Normalizes a raw academic branch string to a standard uppercase branch code.
 * (e.g. CSE, IT, ECE, EE, ME, CE, DSAI)
 */
export function normalizeBranch(branchName: string): string {
  if (!branchName) return "N/A";
  
  // Clean string: uppercase, replace special chars, multiple spaces to single
  let cleaned = branchName
    .trim()
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ");

  // Direct matches of common abbreviations
  if (cleaned === "CSE" || cleaned === "CS") return "CSE";
  if (cleaned === "IT") return "IT";
  if (cleaned === "ECE") return "ECE";
  if (cleaned === "EE" || cleaned === "EEE") return "EE";
  if (cleaned === "ME") return "ME";
  if (cleaned === "CE") return "CE";
  if (cleaned === "DSAI" || cleaned === "DS" || cleaned === "AI") return "DSAI";

  // Exact mappings from raw strings (case-insensitive checks, handled via cleaned uppercase)
  if (cleaned === "COMPUTER SCIENCE" || 
      cleaned === "COMPUTER SCIENCE ENGINEERING" || 
      cleaned === "COMPUTER SCIENCE AND ENGINEERING") {
    return "CSE";
  }
  if (cleaned === "INFORMATION TECHNOLOGY" || 
      cleaned === "INFORMATION TECHNOLOGY ENGINEERING") {
    return "IT";
  }
  if (cleaned === "ELECTRONICS AND COMMUNICATION ENGINEERING" || 
      cleaned === "ELECTRONICS COMMUNICATION ENGINEERING" ||
      cleaned === "ELECTRONICS AND COMMUNICATIONS ENGINEERING") {
    return "ECE";
  }
  if (cleaned === "ELECTRICAL ENGINEERING" || 
      cleaned === "ELECTRICAL AND ELECTRONICS ENGINEERING" ||
      cleaned === "ELECTRICAL ELECTRONICS ENGINEERING") {
    return "EE";
  }
  if (cleaned === "MECHANICAL ENGINEERING" || 
      cleaned === "MECHANICAL") {
    return "ME";
  }
  if (cleaned === "CIVIL ENGINEERING" || 
      cleaned === "CIVIL") {
    return "CE";
  }
  if (cleaned === "DATA SCIENCE AND AI" || 
      cleaned === "DATA SCIENCE" || 
      cleaned === "ARTIFICIAL INTELLIGENCE" ||
      cleaned === "DATA SCIENCE AND ARTIFICIAL INTELLIGENCE") {
    return "DSAI";
  }
  if (cleaned === "MATHEMATICAL PHYSICS" || 
      cleaned === "MATHEMATICAL PHYSICS AND COMPUTING") {
    return "MATH_PHYSICS";
  }

  // Substring fallback matches (more permissive checks)
  if (cleaned.includes("COMPUTER SCIENCE") || cleaned.includes("COMPUTER ENG")) {
    return "CSE";
  }
  if (cleaned.includes("INFORMATION TECH")) {
    return "IT";
  }
  if (cleaned.includes("ELECTRONICS") || cleaned.includes("ECE")) {
    return "ECE";
  }
  if (cleaned.includes("ELECTRICAL") || cleaned.includes("EEE")) {
    return "EE";
  }
  if (cleaned.includes("MECHANICAL")) {
    return "ME";
  }
  if (cleaned.includes("CIVIL")) {
    return "CE";
  }
  if (cleaned.includes("DATA SCIENCE") || cleaned.includes("ARTIFICIAL INTELLIGENCE")) {
    return "DSAI";
  }
  if (cleaned.includes("MATHEMATICAL") || cleaned.includes("PHYSICS")) {
    return "MATH_PHYSICS";
  }

  // Fallback to first 4 uppercase characters if short, or keep cleaned
  if (cleaned.length <= 4) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Checks if the student branch is eligible given a list of company's eligible branches.
 */
export function checkBranchEligibility(studentBranch: string, eligibleBranches: string[]): boolean {
  if (!eligibleBranches || eligibleBranches.length === 0) {
    return true; // No constraints implies everyone eligible
  }

  const studentNorm = normalizeBranch(studentBranch);

  return eligibleBranches.some(b => {
    const bLower = b.toLowerCase().trim();
    if (bLower === "" || bLower === "all" || bLower.includes("any")) {
      return true;
    }
    const companyNorm = normalizeBranch(b);
    return studentNorm === companyNorm;
  });
}
