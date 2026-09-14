// Excludes articles about political figures, elections, and partisan
// politics — even when they're AI-adjacent (e.g. "President signs AI
// executive order"). This is distinct from lib/categorize.ts's POLICY
// category, which is about AI regulation/governance and should still surface
// (an "EU AI Act" or "FTC investigates AI company" story isn't about a
// political figure). Checked in addition to, not instead of, isAiRelevant.
const POLITICAL_PHRASES = [
  "white house",
  "capitol hill",
  "prime minister",
  "political party",
  "republican party",
  "democratic party",
  "labour party",
  "conservative party",
  "campaign trail",
  "presidential election",
  "general election",
  "midterm election",
  "house speaker",
  "speaker of the house",
  "house of representatives",
  "house lawmakers",
  "senate lawmakers",
];

const POLITICAL_WORDS = [
  "politician",
  "politics",
  "political",
  "election",
  "elections",
  "campaign",
  "president",
  "senator",
  "senators",
  "congressman",
  "congresswoman",
  "congress",
  "lawmaker",
  "lawmakers",
  "legislator",
  "legislators",
  "governor",
  "minister",
  "chancellor",
  "parliament",
  "impeachment",
  "gop",
  "democrat",
  "democrats",
  "republican",
  "republicans",
];

// Prominent heads of state/government and other widely-covered political
// figures whose names alone (without an accompanying political word above)
// still signal political-figure coverage — e.g. "Trump meets with Sam
// Altman" wouldn't otherwise trip a keyword above.
const POLITICAL_FIGURE_NAMES = [
  "trump",
  "biden",
  "kamala harris",
  "jd vance",
  "narendra modi",
  "xi jinping",
  "vladimir putin",
  "volodymyr zelensky",
  "rishi sunak",
  "keir starmer",
  "emmanuel macron",
  "justin trudeau",
];

function matchesWordList(haystack: string, words: string[]): boolean {
  return words.some((word) => new RegExp(`\\b${word}\\b`).test(haystack));
}

export function isPoliticalContent(title: string, description: string | null): boolean {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  if (POLITICAL_PHRASES.some((phrase) => haystack.includes(phrase))) {
    return true;
  }
  // Word-boundary match (not a plain substring check) so a name like "trump"
  // doesn't false-positive inside an unrelated word such as "Trumpington".
  if (matchesWordList(haystack, POLITICAL_FIGURE_NAMES)) {
    return true;
  }
  return matchesWordList(haystack, POLITICAL_WORDS);
}
