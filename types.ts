export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
}

export interface CharData {
  char: string;
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
}

export type FontMap = Record<string, CharData>;

export enum AppTab {
  CREATE = 'CREATE',
  PREVIEW = 'PREVIEW',
  EXPORT = 'EXPORT'
}

export const CHAR_SET = [
  // Uppercase
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  // Lowercase
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  // Numbers
  ...'0123456789'.split(''),
  // Punctuation
  ...'.!?,'.split('')
];