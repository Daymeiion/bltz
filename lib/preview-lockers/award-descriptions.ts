// Definitions describe the honor, never evidence that an athlete received it.
// References: afca.com/awards, heisman.com/about-the-heisman/balloting-info,
// lottimpacttrophy.org. Admin-reviewed descriptions take precedence.
export function awardDescription(label: string, description?: string | null): string {
  if (description?.trim()) return description.trim();
  if (/all[ -]america(?:n)?\b/i.test(label)) return "Recognizes an athlete as one of the best at their position nationally within their level of competition.";
  if (/lott.*trophy/i.test(label)) return "Honors a college defensive player for performance on the field and character off the field.";
  if (/heisman/i.test(label)) return "Presented annually to the most outstanding player in college football.";
  if (/pro bowl/i.test(label)) return "Recognizes selection among the NFL’s top players for the season.";
  if (/super bowl.*champion/i.test(label)) return "Recognizes membership on the team that won the NFL’s Super Bowl championship.";
  return "Description pending review.";
}

export function findAwardDescription(label: string, sourceText: string): string {
  const sentences = sourceText.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  const definition = sentences.find(sentence => sentence.length <= 160
    && sentence.toLowerCase().includes(label.toLowerCase())
    && /\b(?:is awarded to|is presented to|recognizes|honors|honours)\b/i.test(sentence));
  return definition || awardDescription(label);
}
