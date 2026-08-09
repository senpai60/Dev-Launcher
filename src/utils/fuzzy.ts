/**
 * Small subsequence-based fuzzy matcher.
 *
 * Substring matching alone meant "devlnch" could not find "Dev Launcher"
 * (phases.md Phase 3 asks for fuzzy matching). This scores a match instead of
 * returning a boolean so results can be ranked.
 *
 * Returns null when `query` is not a subsequence of `text`.
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();

  // Exact and prefix matches always outrank a scattered subsequence.
  if (haystack === needle) return 1000;
  if (haystack.startsWith(needle)) return 900 - haystack.length;

  const substringAt = haystack.indexOf(needle);
  if (substringAt !== -1) {
    // Matching at a word boundary reads as more relevant.
    const atBoundary = substringAt === 0 || /[\s\-_./\\]/.test(haystack[substringAt - 1]);
    return (atBoundary ? 700 : 600) - substringAt;
  }

  let score = 0;
  let textIndex = 0;
  let consecutive = 0;

  for (const char of needle) {
    const found = haystack.indexOf(char, textIndex);
    if (found === -1) return null;

    if (found === textIndex && textIndex > 0) {
      consecutive += 1;
      score += 8 + consecutive * 2;
    } else {
      consecutive = 0;
      score += 4;
    }

    // Characters starting a word are stronger signals.
    if (found === 0 || /[\s\-_./\\]/.test(haystack[found - 1])) {
      score += 6;
    }

    // Penalise how far we had to skip ahead.
    score -= Math.min(found - textIndex, 10);
    textIndex = found + 1;
  }

  // Prefer shorter haystacks when scores are otherwise close.
  return score - haystack.length * 0.1;
}

/**
 * Scores an item across several fields and returns the best one.
 * Later fields are weighted lower so a name match beats a path match.
 */
export function fuzzyScoreFields(fields: Array<string | undefined>, query: string): number | null {
  if (!query) return 0;

  let best: number | null = null;

  fields.forEach((field, index) => {
    if (!field) return;
    const score = fuzzyScore(field, query);
    if (score === null) return;

    const weighted = score - index * 40;
    if (best === null || weighted > best) best = weighted;
  });

  return best;
}

/** Filters and ranks a list in one pass. */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getFields: (item: T) => Array<string | undefined>,
): T[] {
  if (!query.trim()) return items;

  return items
    .map((item) => ({ item, score: fuzzyScoreFields(getFields(item), query.trim()) }))
    .filter((entry): entry is { item: T; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
