/**
 * Theme Data Loader
 * Reads themed word lists from the data/wordlists directory.
 * Returns a normalized ThemeData object used by all puzzle generators.
 */

import path from 'path';
import { readFile } from 'fs/promises';

export interface ThemeData {
  words: { word: string; hint?: string }[];
  clues: { word: string; clue: string }[];
  quotes: { text: string; author?: string }[];
}

type Theme = 'nature' | 'travel' | 'food' | 'sports' | 'history' | 'science'
  | '90s' | '2000s' | 'music' | 'space' | 'movies';

const dataDir = path.join(process.cwd(), 'data', 'wordlists');

const cache = new Map<Theme, ThemeData>();

export async function loadThemeData(theme: Theme): Promise<ThemeData> {
  if (cache.has(theme)) return cache.get(theme)!;

  const filePath = path.join(dataDir, `${theme}.json`);
  const raw = await readFile(filePath, 'utf-8');
  const json = JSON.parse(raw);
  const data: ThemeData = json[theme];

  cache.set(theme, data);
  return data;
}
