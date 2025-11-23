// This service previously used Gemini API but has been replaced with local static generators
// to remove API dependencies and costs.

const PANGRAMS = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "Sphinx of black quartz, judge my vow.",
  "How vexingly quick daft zebras jump!",
  "The five boxing wizards jump quickly.",
  "Waltz, bad nymph, for quick jigs vex.",
  "Glib jocks quiz nymph to vex dwarf.",
  "0123456789",
  "A wizard’s job is to vex chumps quickly in fog.",
  "Two driven jocks help fax my big quiz.",
  "Check margins: 10px, 20px, 50% width.",
  "Email: hello@example.com (Ref: #23901)",
  "Price: $1,234.56 | VAT: 20%",
  "Equation: E = mc² implies energy.",
  "“Typography is the voice of text.”",
  "Bold & Beautiful; Italic & Iconic.",
  "Do wait! 10:00 AM? Or 2:30 PM?",
  "Testing... 1, 2, 3. Testing!",
  "System Status: [OK] 99.9% Uptime",
  "Coordinates: 34° N, 118° W."
];

export const generateSampleText = async (): Promise<string> => {
  // Return a random pangram
  const randomIndex = Math.floor(Math.random() * PANGRAMS.length);
  return PANGRAMS[randomIndex];
};