// This service previously used Gemini API but has been replaced with local static generators
// to remove API dependencies and costs.

// Sample texts restricted to supported CHAR_SET: A-Z, a-z, 0-9, . ! ? ,
const PANGRAMS = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "Sphinx of black quartz, judge my vow.",
  "How vexingly quick daft zebras jump!",
  "The five boxing wizards jump quickly.",
  "Waltz, bad nymph, for quick jigs vex.",
  "Glib jocks quiz nymph to vex dwarf.",
  "0123456789",
  "A wizards job is to vex chumps quickly in fog.",
  "Two driven jocks help fax my big quiz.",
  "Typography is the voice of text.",
  "Do wait! 10 AM? Or 2 PM?",
  "Testing... 1, 2, 3. Testing!",
  "The jay, pig, fox, zebra and my wolves quack!",
  "Blowzy red vixens fight for a quick jump.",
  "Jaded zombies acted quaintly but kept driving their oxen forward.",
  "Crazy Fredericka bought many very exquisite opal jewels.",
  "We promptly judged antique ivory buckles for the next prize.",
  "Jinxed wizards pluck ivy from the big quilt.",
  "Only the best players win 1234567890 points."
];

export const generateSampleText = async (): Promise<string> => {
  // Return a random pangram
  const randomIndex = Math.floor(Math.random() * PANGRAMS.length);
  return PANGRAMS[randomIndex];
};