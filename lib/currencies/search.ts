import type { Currency } from '@/lib/api/currencies';

// Weighted match + Levenshtein-similarity ranker, ported from the legacy SPA's
// `src/react-ssr/helpers/search-currency-in-list.js`. The legacy version was
// the most user-tested heuristic for "find that token I half-remember the
// ticker of"; preserving it verbatim avoids reintroducing search-quality
// regressions on the homepage.
//
// Differences from legacy:
//   - operates on a flat `Currency[]`, not the grouped/merged structure (the
//     homepage selector only re-ranks the All bucket — there is no need to
//     pull a group out by name)
//   - inline distance function (~10 lines) instead of the `fast-levenshtein`
//     package — fewer transitive deps to vet, identical math
//   - no `isPopular` tiebreaker bias hidden at three decimal places when the
//     query is empty: empty query bails out before scoring
//   - normalized attribute strings are precomputed once per currency list via
//     `buildSearchIndex` instead of regenerated on every keystroke; saves
//     ~5× on each query against the ~1300-row picker

const ATTRIBUTE_WEIGHTS = {
  currentTicker: 1.0,
  ticker: 0.9,
  name: 0.8,
  network: 0.6,
} as const;

type Attribute = keyof typeof ATTRIBUTE_WEIGHTS;

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();
const stripSpaces = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

/** Levenshtein distance — iterative two-row variant. */
const distance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
};

const similarity = (a: string, b: string): number => {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - distance(a, b) / max;
};

/**
 * Pre-normalized representation of a single currency — what the ranker reads
 * on the hot path. Normalizing strings on every keystroke is ~70% of the
 * total cost when typing into the picker; building this once per currencies
 * list flattens the per-query work to plain string compares.
 */
interface IndexedCurrency {
  currency: Currency;
  attrs: { norm: string; spaceless: string; weight: number }[];
}

/**
 * Searchable index. Cache the result against the `Currency[]` reference —
 * since the catalog comes from a server-cached fetch, the array identity is
 * stable across renders and we can rebuild only when the catalog changes.
 */
export type SearchIndex = readonly IndexedCurrency[];

const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTE_WEIGHTS) as readonly Attribute[];

export function buildSearchIndex(list: readonly Currency[]): SearchIndex {
  const out: IndexedCurrency[] = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const currency = list[i]!;
    const attrs: IndexedCurrency['attrs'] = [];
    for (const attr of ATTRIBUTE_KEYS) {
      const raw = currency[attr];
      if (typeof raw !== 'string' || !raw) continue;
      attrs.push({
        norm: normalize(raw),
        spaceless: stripSpaces(raw),
        weight: ATTRIBUTE_WEIGHTS[attr],
      });
    }
    out[i] = { currency, attrs };
  }
  return out;
}

function rankIndex(index: SearchIndex, query: string): Currency[] {
  const q = normalize(query);
  if (!q) return index.map((i) => i.currency);

  const spaceless = stripSpaces(query);
  const words = q.split(' ').filter(Boolean);
  const allWords = [...words];
  if (spaceless && spaceless !== words[0]) allWords.push(spaceless);
  if (allWords.length === 0) return index.map((i) => i.currency);

  const scored: { currency: Currency; rating: number; sim: number }[] = [];
  for (let ci = 0; ci < index.length; ci++) {
    const { currency, attrs } = index[ci]!;
    let weightRating = 0;
    let similarityRating = 0;

    for (let wi = 0; wi < allWords.length; wi++) {
      const word = allWords[wi]!;
      // Later words contribute less. Floor at 0.5 so a typo at the end of a
      // multi-word query still counts.
      const wordWeight = Math.max(1 - wi * 0.1, 0.5);

      let wordFound = false;
      let wordRating = 0;

      for (let ai = 0; ai < attrs.length; ai++) {
        const { norm: attrNorm, spaceless: attrSpaceless, weight: aw } = attrs[ai]!;

        if (attrNorm === q || attrSpaceless === spaceless) {
          // Exact match — pin to top.
          wordFound = true;
          weightRating += 100 * aw;
          continue;
        }
        if (attrNorm.includes(word) || attrSpaceless.includes(word)) {
          wordFound = true;
          wordRating += aw * wordWeight;
          continue;
        }
        const sim = Math.max(similarity(word, attrNorm), similarity(word, attrSpaceless));
        if (sim > similarityRating) similarityRating = sim;
        if (sim > 0.65) {
          wordFound = true;
          wordRating += aw * wordWeight * 0.01;
        }
      }

      if (wordFound) {
        weightRating += wordRating + (currency.isPopular ? 0.0001 : 0);
      } else {
        weightRating -= 0.5 * wordWeight;
      }
    }

    if (weightRating > 0 || similarityRating >= 0.65) {
      scored.push({ currency, rating: weightRating, sim: similarityRating });
    }
  }

  return scored
    .sort((a, b) => {
      if (a.rating > 0.1 && b.rating > 0.1) return b.rating - a.rating;
      if (a.rating > 0.1) return -1;
      if (b.rating > 0.1) return 1;
      if (a.sim !== b.sim) return b.sim - a.sim;
      return b.rating - a.rating;
    })
    .map((s) => s.currency);
}

/**
 * Re-rank a flat currency list against a search query. Returns ranked items;
 * empty list when the query rules everything out.
 *
 * For hot paths (picker dropdowns), prefer building an index once via
 * `buildSearchIndex` and reusing it across queries — call this overload with
 * the pre-built index when available.
 */
export function searchCurrencies(
  source: readonly Currency[] | SearchIndex,
  query: string,
): Currency[] {
  if (source.length === 0) return [];
  const first = source[0] as Currency | IndexedCurrency;
  const index =
    'attrs' in (first as object)
      ? (source as SearchIndex)
      : buildSearchIndex(source as readonly Currency[]);
  return rankIndex(index, query);
}
