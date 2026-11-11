/**
 * Fuzzy-ish match score of `query` against a command's label and keywords;
 * 0 means no match, higher is better. Tiers, best first:
 *  - label equals the query / starts with it
 *  - a label word starts with the query
 *  - label contains it
 *  - every query word is found in label + keywords (any order)
 *  - the query's letters appear in order in the label ("nwofr" → "New offer")
 * Case- and accent-insensitive ("uber" matches "Über").
 */
export function scoreCommand(query: string, label: string, keywords: readonly string[] = []): number {
  const q = normalize(query).trim();
  if (!q) return 1;
  const text = normalize(label);
  if (text === q) return 100;
  if (text.startsWith(q)) return 90;
  if (text.split(/[\s\-_/.:]+/).some((word) => word.startsWith(q))) return 80;
  if (text.includes(q)) return 70;
  const haystack = `${text} ${keywords.map(normalize).join(" ")}`;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.every((word) => haystack.includes(word))) {
    // Keyword-only hits rank below label hits.
    return words.every((word) => text.includes(word)) ? 60 : 50;
  }
  const compact = q.replace(/\s+/g, "");
  if (compact.length >= 2 && isSubsequence(compact, text)) return 20;
  return 0;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return false;
}
