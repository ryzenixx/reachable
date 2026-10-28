import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { emailSchema, preferencesSchema } from "./validation";

const fields = ["channel", "email", "state", "scope", "component_ids", "created_at", "confirmed_at"];

export function parseSubscriptionCsv(input: string) {
  let records: string[][];
  try {
    records = parse(input, { bom: true, skip_empty_lines: true, max_record_size: 4096 });
  } catch { return undefined; }
  if (records.length < 2 || records.length > 101) return undefined;
  const header = records[0].map((field) => field.trim());
  if (!header.includes("email") || new Set(header).size !== header.length || header.some((field) => !fields.includes(field))) return undefined;
  return records.slice(1).map((record, index) => {
    const row = Object.fromEntries(header.map((key, column) => [key, record[column].trim()]));
    const emailValue = row.email.startsWith("'") && /^[=+\-@\t\r]/.test(row.email.slice(1)) ? row.email.slice(1) : row.email;
    const email = emailSchema.safeParse(emailValue);
    const scope = row.scope || "all";
    const preferences = preferencesSchema.safeParse(scope === "selected"
      ? { scope, componentIds: row.component_ids ? row.component_ids.split(";").map((id) => id.trim()) : [] }
      : { scope });
    if ((row.channel && row.channel !== "email") || !email.success || !preferences.success || (scope === "all" && row.component_ids)) {
      return { row: index + 2, error: "invalid_row" as const };
    }
    return { row: index + 2, email: email.data, preferences: preferences.data };
  });
}

export function subscriptionCsv(records: unknown[][]) {
  return stringify(records, { escape_formulas: true, record_delimiter: "windows" });
}

export const subscriptionCsvHeader = fields;
