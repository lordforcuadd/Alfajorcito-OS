/**
 * Centralized Design System Tokens for Alfajorcito OS
 * Unifies color palettes across courses, works, tags, and UI elements.
 */

export const COURSE_PASTEL_PALETTE: string[] = [
  '#D98880', // Rose USMP
  '#B39DDB', // Lavender
  '#80CBC4', // Mint
  '#FFCC80', // Amber
  '#90CAF9', // Soft Blue
  '#EF9A9A', // Coral
  '#A5D6A7', // Sage
  '#CE93D8'  // Lilac
];

export function getRandomCourseColor(): string {
  return COURSE_PASTEL_PALETTE[Math.floor(Math.random() * COURSE_PASTEL_PALETTE.length)];
}
