/**
 * Bulgarian Cyrillic alphabet order for sorting entrances.
 * А=1, Б=2, В=3, Г=4, Д=5, Е=6, Ж=7, З=8, И=9, Й=10,
 * К=11, Л=12, М=13, Н=14, О=15, П=16, Р=17, С=18, Т=19, У=20,
 * Ф=21, Х=22, Ц=23, Ч=24, Ш=25, Щ=26, Ъ=27, Ь=28, Ю=29, Я=30
 */
export const BG_ALPHABET = [
  "А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "Й",
  "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т", "У",
  "Ф", "Х", "Ц", "Ч", "Ш", "Щ", "Ъ", "Ь", "Ю", "Я",
];

/**
 * Returns the Bulgarian alphabet index (1-based) for a given letter.
 * Returns 999 for unknown values so they sort last.
 */
export function bgAlphaIndex(letter: string): number {
  const upper = letter.trim().toUpperCase();
  const idx = BG_ALPHABET.indexOf(upper);
  return idx === -1 ? 999 : idx;
}

/**
 * Comparator for sorting entrance labels by Bulgarian alphabet order.
 * Handles both single letters (А, Б, В...) and numeric strings (1, 2, 3...).
 */
export function sortBgEntrances(a: string, b: string): number {
  const aNorm = normalizeEntrance(a);
  const bNorm = normalizeEntrance(b);
  return bgAlphaIndex(aNorm) - bgAlphaIndex(bNorm);
}

/**
 * Converts a numeric entrance string to the corresponding Bulgarian letter.
 * "1" → "А", "2" → "Б", "3" → "В", etc.
 * If the input is already a letter or unrecognized, returns it unchanged.
 */
export function normalizeEntrance(value: string): string {
  const trimmed = value.trim();
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= BG_ALPHABET.length && String(num) === trimmed) {
    return BG_ALPHABET[num - 1];
  }
  return trimmed.toUpperCase();
}
