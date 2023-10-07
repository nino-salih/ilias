/**
 * Returns the first or last n words of a string, depending on the value of `fromStart`.
 * If a word contains any of the characters in `notAllowedChars`, the function stops before that word.
 * @param str - The input string.
 * @param n - The number of words to return.
 * @param fromStart - If `true`, returns the first n words. If `false`, returns the last n words.
 * @returns The first or last n words of the input string.
 */
const notAllowedChars = ['-', '\n', '\t', '\r', '\f', '\v'];

export function getNWords(str: string, n: number, fromStart: boolean = true): string {
    const words = str.split(' ');
    let result = '';
  
    if (fromStart) {
      for (let i = 0; i < n && i < words.length; i++) {
        const word = words[i];
  
        if (notAllowedChars.some(char => word.includes(char))) {
          // Stop before any hyphens
          const index = Math.min(...notAllowedChars.map(char => word.indexOf(char)).filter(index => index !== -1));
          result += word.slice(0, index);
          break;
        }
  
        result += word;
        if (i < n - 1 && i < words.length - 1) {
          result += ' ';
        }
      }
    } else {
        for (let i = words.length - 1; i >= words.length - n && i >= 0; i--) {
            const word = words[i];
      
            if (notAllowedChars.some(char => word.includes(char))) {
              // Stop before any not allowed characters
              const index = Math.max(...notAllowedChars.map(char => word.lastIndexOf(char)).filter(index => index !== -1));
              result = word.slice(index + 1) + (result ? ' ' + result : '');
              break;
            }
      
            result = word + (result ? ' ' + result : '');
          }
        }
  
    return result;
  }