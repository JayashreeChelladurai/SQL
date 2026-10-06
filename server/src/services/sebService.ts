import crypto from "crypto";

export interface SebConfigOptions {
  assessmentCode: string;
  startUrl: string;
  quitPassword?: string;
  title?: string;
}

const SEB_HMAC_SECRET = process.env.SEB_HMAC_SECRET || "seb-sql-assessment-secret-2026";

/**
 * Generate a cryptographically signed HMAC token bound to the specific assessment code.
 */
export function generateSebToken(assessmentCode: string): string {
  const cleanCode = assessmentCode.trim().toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${cleanCode}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", SEB_HMAC_SECRET).update(payload).digest("hex");
  return `${payload}:${hmac}`;
}

/**
 * Verify that the SEB token is valid, matches the assessment code, and hasn't been forged.
 */
export function verifySebToken(token?: string, assessmentCode?: string): boolean {
  if (!token || typeof token !== "string" || !assessmentCode) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [code, timestampStr, hmac] = parts;

  if (code.toUpperCase() !== assessmentCode.trim().toUpperCase()) {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const expectedHmac = crypto.createHmac("sha256", SEB_HMAC_SECRET).update(`${code}:${timestamp}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

/**
 * Check if the incoming request originates from Safe Exam Browser
 */
export function isSebRequest(req: any, assessmentCode?: string): boolean {
  if (!req || !req.headers) return false;

  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const sebHeader =
    req.headers["x-safeexambrowser-requesthash"] ||
    req.headers["x-safeexambrowser-configkeyhash"] ||
    req.headers["x-seb-request-hash"] ||
    req.headers["x-seb-config-key-hash"];

  // Look for Safe Exam Browser signatures
  const hasSebHeadersOrAgent =
    userAgent.includes("safeexambrowser") ||
    userAgent.includes("seb/") ||
    userAgent.includes("seb ") ||
    userAgent.includes("seb_") ||
    Boolean(sebHeader);

  if (!hasSebHeadersOrAgent) {
    // Check if client explicitly sent SEB verification header
    if (req.headers["x-seb-verified"] === "true") {
      return true;
    }
    return false;
  }

  if (assessmentCode) {
    const candidateToken =
      (req.headers["x-seb-token"] as string | undefined) ||
      (req.query?.sebToken as string | undefined) ||
      (req.body?.sebToken as string | undefined);

    if (candidateToken) {
      return verifySebToken(candidateToken, assessmentCode);
    }
  }

  return true;
}

/**
 * Generate Universal Cross-Platform SEB (.seb) XML Plist Configuration File
 */
export function generateSebConfig(options: SebConfigOptions): string {
  const { startUrl, quitPassword = "exit123", title = "SQL Assessment" } = options;

  // SHA256 hash of quit password
  const hashedQuitPassword = crypto
    .createHash("sha256")
    .update(quitPassword, "utf-8")
    .digest("hex");

  let quitUrl = "http://127.0.0.1:5001/quit";
  try {
    const parsed = new URL(startUrl);
    quitUrl = `${parsed.protocol}//${parsed.host}/quit`;
  } catch {}

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>originatorVersion</key>
    <string>SEB_Win_3.4.1</string>
    <key>startURL</key>
    <string>${startUrl}</string>
    <key>title</key>
    <string>${title}</string>
    <key>sebServerURL</key>
    <string></string>
    <key>hashedAdminPassword</key>
    <string></string>
    <key>hashedQuitPassword</key>
    <string>${hashedQuitPassword}</string>
    <key>allowQuit</key>
    <true/>
    <key>ignoreExitKeys</key>
    <false/>
    <key>quitURL</key>
    <string>${quitUrl}</string>
    <key>quitURLConfirm</key>
    <false/>
    <key>browserWindowAllowReload</key>
    <true/>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>browserViewMode</key>
    <integer>0</integer>
    <key>showTaskBar</key>
    <true/>
    <key>showReloadButton</key>
    <true/>
    <key>showTime</key>
    <true/>
    <key>enableZoomText</key>
    <true/>
    <key>allowSpellCheck</key>
    <false/>
    <key>enableRightMouse</key>
    <true/>
    <key>allowDeveloperConsole</key>
    <false/>
    <key>mainBrowserWindowWidth</key>
    <string>100%</string>
    <key>mainBrowserWindowHeight</key>
    <string>100%</string>
    <key>mainBrowserWindowPositioning</key>
    <integer>1</integer>
    <key>enableDrawingEditor</key>
    <false/>
    <key>sendBrowserExamKey</key>
    <true/>
</dict>
</plist>`;
}
