// This service previously used Gemini API but has been replaced with local static generators
// to remove API dependencies and costs.

const PANGRAMS = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "Sphinx of black quartz, judge my vow.",
  "How vexingly quick daft zebras jump!",
  "The five boxing wizards jump quickly.",
  "Waltz, bad nymph, for quick jigs vex.",
  "Glib jocks quiz nymph to vex dwarf."
];

export const generateSampleText = async (): Promise<string> => {
  // Return a random pangram
  const randomIndex = Math.floor(Math.random() * PANGRAMS.length);
  return PANGRAMS[randomIndex];
};
