import { DatabaseSync } from "node:sqlite";

export interface SqlExecutionResult {
  success: boolean;
  columns: string[];
  rows: any[][];
  rawRows?: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface ExpectedOutput {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

export interface ComparisonDiff {
  status: "PASSED" | "FAILED";
  reason?: string;
  columnMismatch?: {
    expected: string[];
    actual: string[];
  };
  rowCountMismatch?: {
    expected: number;
    actual: number;
  };
  cellMismatches?: {
    rowIdx: number;
    colIdx: number;
    columnName: string;
    expected: any;
    actual: any;
  }[];
}

export interface TableSchemaInfo {
  tableName: string;
  columns: { name: string; type: string; isPk?: boolean; nullable?: boolean }[];
  sampleRows: Record<string, any>[];
}

/**
 * Execute a SQL query in an isolated in-memory SQLite sandbox
 */
export function executeSqlSandbox(
  schemaDdl: string,
  seedData: string,
  querySql: string,
  options?: { timeoutMs?: number }
): SqlExecutionResult {
  const startTime = performance.now();
  let db: DatabaseSync | null = null;

  try {
    // 1. Create fresh isolated in-memory SQLite database
    db = new DatabaseSync(":memory:");

    // Configure safe memory limits and pragmas
    db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA recursive_triggers = OFF;
      PRAGMA max_page_count = 10000;
    `);

    // 2. Execute Table Schemas DDL
    if (schemaDdl && schemaDdl.trim().length > 0) {
      db.exec(schemaDdl);
    }

    // 3. Populate Seed Data
    if (seedData && seedData.trim().length > 0) {
      db.exec(seedData);
    }

    // 4. Sanitize and validate candidate query
    const trimmedQuery = querySql.trim();
    if (!trimmedQuery) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: "Query is empty.",
      };
    }

    // Prevent unsafe system calls
    const lower = trimmedQuery.toLowerCase();
    if (
      lower.includes("attach") ||
      lower.includes("detach") ||
      lower.includes("pragma database_list")
    ) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: "Forbidden SQL operation detected (ATTACH/DETACH not permitted).",
      };
    }

    // 5. Prepare and execute the query
    const queryStart = performance.now();
    const stmt = db.prepare(trimmedQuery);
    
    // Extract column definitions even if 0 rows returned
    const colDefs = stmt.columns();
    const columns = colDefs.map((c) => c.name);

    // Retrieve rows
    const rawRows = stmt.all() as Record<string, any>[];
    const duration = performance.now() - queryStart;

    // Convert raw object rows to 2D array matching column order
    const rows: any[][] = rawRows.map((r) => columns.map((col) => r[col] ?? null));

    return {
      success: true,
      columns,
      rows,
      rawRows,
      rowCount: rows.length,
      executionTimeMs: Math.round(duration * 100) / 100,
    };
  } catch (err: any) {
    const duration = performance.now() - startTime;
    let cleanMessage = err.message || "Unknown SQL execution error";
    
    // Clean up internal SQLite prefixes for friendly candidate feedback
    cleanMessage = cleanMessage.replace(/\[eval\]:\d+:\d+\s*/g, "");
    
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round(duration * 100) / 100,
      error: cleanMessage,
    };
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore closing errors
      }
    }
  }
}

/**
 * Normalizes values for comparison (handles nulls, numeric rounding, string trimming)
 */
function normalizeVal(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    // Round floats to 4 decimal places to prevent float representation divergence
    return Math.round(val * 10000) / 10000;
  }
  if (typeof val === "string") {
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== "") {
      return Math.round(num * 10000) / 10000;
    }
    return val.trim();
  }
  return val;
}

/**
 * Compare actual candidate output against expected canonical output
 */
export function compareSqlResults(
  actual: SqlExecutionResult,
  expected: ExpectedOutput,
  orderSensitive: boolean = false
): ComparisonDiff {
  if (!actual.success) {
    return {
      status: "FAILED",
      reason: actual.error || "Query execution failed with error.",
    };
  }

  // 1. Check Column Count
  if (actual.columns.length !== expected.columns.length) {
    return {
      status: "FAILED",
      reason: `Expected ${expected.columns.length} columns (${expected.columns.join(", ")}), but received ${actual.columns.length} columns (${actual.columns.join(", ")}).`,
      columnMismatch: {
        expected: expected.columns,
        actual: actual.columns,
      },
    };
  }

  // 2. Check Column Names (case-insensitive check)
  const actualColsLower = actual.columns.map((c) => c.toLowerCase());
  const expectedColsLower = expected.columns.map((c) => c.toLowerCase());
  const colMismatch = expectedColsLower.some((c, idx) => c !== actualColsLower[idx]);
  if (colMismatch) {
    return {
      status: "FAILED",
      reason: `Column names or aliases mismatch. Expected: [${expected.columns.join(", ")}], Received: [${actual.columns.join(", ")}].`,
      columnMismatch: {
        expected: expected.columns,
        actual: actual.columns,
      },
    };
  }

  // 3. Check Row Count
  if (actual.rowCount !== expected.rowCount) {
    return {
      status: "FAILED",
      reason: `Row count mismatch. Expected ${expected.rowCount} row(s), but received ${actual.rowCount} row(s).`,
      rowCountMismatch: {
        expected: expected.rowCount,
        actual: actual.rowCount,
      },
    };
  }

  // 4. Compare Rows
  if (orderSensitive) {
    // Strict row-by-row comparison in exact sequence
    const cellMismatches: ComparisonDiff["cellMismatches"] = [];
    for (let r = 0; r < expected.rows.length; r++) {
      const expRow = expected.rows[r];
      const actRow = actual.rows[r];
      for (let c = 0; c < expected.columns.length; c++) {
        const expVal = normalizeVal(expRow[c]);
        const actVal = normalizeVal(actRow[c]);
        if (expVal !== actVal) {
          cellMismatches.push({
            rowIdx: r,
            colIdx: c,
            columnName: expected.columns[c],
            expected: expVal,
            actual: actVal,
          });
        }
      }
    }

    if (cellMismatches.length > 0) {
      const first = cellMismatches[0];
      return {
        status: "FAILED",
        reason: `Value mismatch at row ${first.rowIdx + 1}, column '${first.columnName}': expected '${first.expected}', received '${first.actual}'.`,
        cellMismatches,
      };
    }
  } else {
    // Order-agnostic multi-set comparison
    const serializeRow = (row: any[]) =>
      JSON.stringify(row.map((val) => normalizeVal(val)));

    const expRowMap = new Map<string, number>();
    for (const row of expected.rows) {
      const s = serializeRow(row);
      expRowMap.set(s, (expRowMap.get(s) || 0) + 1);
    }

    const actRowMap = new Map<string, number>();
    for (const row of actual.rows) {
      const s = serializeRow(row);
      actRowMap.set(s, (actRowMap.get(s) || 0) + 1);
    }

    for (const [key, count] of expRowMap.entries()) {
      const actCount = actRowMap.get(key) || 0;
      if (actCount !== count) {
        return {
          status: "FAILED",
          reason: `Output rows do not match expected records. Received mismatched row distribution.`,
        };
      }
    }
  }

  return {
    status: "PASSED",
  };
}

/**
 * Generate Expected Output from Canonical Reference Solution SQL
 */
export function generateExpectedOutput(
  schemaDdl: string,
  seedData: string,
  solutionSql: string
): ExpectedOutput {
  const result = executeSqlSandbox(schemaDdl, seedData, solutionSql);
  if (!result.success) {
    throw new Error(
      `Failed to execute canonical solution SQL: ${result.error || "Unknown error"}`
    );
  }
  return {
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
  };
}

/**
 * Extracts schema overview (table names, columns, and sample rows)
 * for the student and admin schema explorer UI.
 */
export function extractSchemaOverview(
  schemaDdl: string,
  sampleSeedData?: string
): TableSchemaInfo[] {
  let db: DatabaseSync | null = null;
  const tablesInfo: TableSchemaInfo[] = [];

  try {
    db = new DatabaseSync(":memory:");
    if (schemaDdl && schemaDdl.trim().length > 0) {
      db.exec(schemaDdl);
    }
    if (sampleSeedData && sampleSeedData.trim().length > 0) {
      try {
        db.exec(sampleSeedData);
      } catch {
        // Ignore seed errors for schema inspection
      }
    }

    // Query sqlite_master for user tables
    const tablesStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name ASC
    `);
    const tables = tablesStmt.all() as { name: string }[];

    for (const t of tables) {
      const pragmaStmt = db.prepare(`PRAGMA table_info("${t.name}")`);
      const pragmaCols = pragmaStmt.all() as {
        name: string;
        type: string;
        pk: number;
        notnull: number;
      }[];

      let sampleRows: Record<string, any>[] = [];
      try {
        const sampleStmt = db.prepare(`SELECT * FROM "${t.name}" LIMIT 5`);
        sampleRows = sampleStmt.all() as Record<string, any>[];
      } catch {
        sampleRows = [];
      }

      tablesInfo.push({
        tableName: t.name,
        columns: pragmaCols.map((c) => ({
          name: c.name,
          type: c.type || "ANY",
          isPk: c.pk === 1,
          nullable: c.notnull === 0,
        })),
        sampleRows,
      });
    }
  } catch (err) {
    console.warn("Could not extract schema overview:", err);
  } finally {
    if (db) {
      try {
        db.close();
      } catch {}
    }
  }

  return tablesInfo;
}
