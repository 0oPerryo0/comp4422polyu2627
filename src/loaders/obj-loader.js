import { parseOBJ } from './obj-parser.js';

/*
  To load the spacecraft data into a visible object (or anything else)
*/

export async function loadOBJ(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Could not load OBJ (${response.status}): ${url}`);
  return parseOBJ(await response.text());
}
