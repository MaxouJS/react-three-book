/**
 * Returns the next index in a circular array, wrapping from the end to 0.
 */
export function nextIndex(index: number, arrayLength: number): number {
  index++;
  if (index === arrayLength) return 0;
  return index;
}

/**
 * Returns the previous index in a circular array, wrapping from 0 to the end.
 */
export function prevIndex(index: number, arrayLength: number): number {
  if (index === 0) return arrayLength - 1;
  return index - 1;
}

/**
 * Wraps an index into the valid range [0, arrayLength) using floor-based modulo.
 * Handles negative indices correctly (unlike the JS % operator).
 */
export function loopIndex(index: number, arrayLength: number): number {
  return index - Math.floor(index / arrayLength) * arrayLength;
}
