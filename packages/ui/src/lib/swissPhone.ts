// Swiss phone numbers: any of national (`079 123 45 67`), `0041…` or `+41…` becomes the
// canonical `+41 79 123 45 67`. A number with another country code is left as typed (there
// is no per-country length table here). Pure; `patterns/phone-input/PhoneInput.tsx` is the
// control. Ported from OneSales' `lib/swissPhone.ts` (which mirrors its backend's validator),
// without the i18n error keys; separators other than spaces and `+41 (0)79` are also understood.

function formatSwissNsn(nsn: string): string {
  return `+41 ${nsn.slice(0, 2)} ${nsn.slice(2, 5)} ${nsn.slice(5, 7)} ${nsn.slice(7, 9)}`;
}

/** The 9-digit national significant number of a Swiss number in any common spelling, else null. */
function swissNsn(value: string): string | null {
  // "+41 (0)79 …": the (0) is the national trunk prefix people keep writing; it is not dialled.
  const compact = value.replace(/\(0\)/g, "").replace(/[\s./\-()]/g, "");
  const national = /^0(\d{9})$/.exec(compact);
  if (national) return national[1] ?? null;
  const international = /^(?:\+|00)41(\d{9})$/.exec(compact);
  return international?.[1] ?? null;
}

/**
 * `079 123 45 67`, `0041791234567`, `+41 (0)79 123 45 67`, `079/123.45.67` -> `+41 79 123 45 67`.
 * Anything that is not recognisably a Swiss number (other country codes, too few or too many
 * digits, letters) is returned unchanged, so a validation error stays visible instead of
 * being swallowed by formatting.
 */
export function formatSwissPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const nsn = swissNsn(trimmed);
  return nsn ? formatSwissNsn(nsn) : value;
}

/**
 * What `PhoneInput` applies on blur: Swiss numbers in the canonical shape (`formatSwissPhone`),
 * everything else as typed except that outer whitespace is trimmed and runs of spaces collapse.
 */
export function normalizePhone(value: string): string {
  const swiss = formatSwissPhone(value);
  return swiss !== value ? swiss : value.trim().replace(/\s{2,}/g, " ");
}
