import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Load KEY=VALUE pairs from a dotenv-style file into process.env when unset.
 * Never logs values. Does not override existing environment variables.
 */
export function loadEnvFileIfPresent(
  relativePath: string,
  cwd = process.cwd(),
): void {
  const absolutePath = path.join(cwd, relativePath);
  if (!existsSync(absolutePath)) {
    return;
  }

  const text = readFileSync(absolutePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const equals = trimmed.indexOf("=");
    if (equals <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
