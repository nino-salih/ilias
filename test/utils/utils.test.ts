import {describe, expect, beforeEach, it, jest } from '@jest/globals';
import axios from 'axios';
import {Glorian} from '../../src/websites/glorian.js';
import { fail } from 'assert';
import { getNWords } from '../../src/utils/utils.js';

describe('getNWords', () => {
    it('should return the first n words from the start of the string', () => {
      const str = 'The quick brown fox jumps over the lazy dog';
      expect(getNWords(str, 3)).toEqual('The quick brown');
      expect(getNWords(str, 5)).toEqual('The quick brown fox jumps');
      expect(getNWords(str, 10)).toEqual('The quick brown fox jumps over the lazy dog');
    });
  
    it('should return the last n words from the end of the string', () => {
      const str = 'The quick brown fox jumps over the lazy dog';
      expect(getNWords(str, 3, false)).toEqual('the lazy dog');
      expect(getNWords(str, 5, false)).toEqual('jumps over the lazy dog');
      expect(getNWords(str, 10, false)).toEqual('The quick brown fox jumps over the lazy dog');
    });
  
    it('should stop before hyphens', () => {
      const str = 'In the Beginning was the word and the word-was with god';
      expect(getNWords(str, 3)).toEqual('In the Beginning');
      expect(getNWords(str, 5)).toEqual('In the Beginning was the');
      expect(getNWords(str, 10)).toEqual('In the Beginning was the word and the word');
      expect(getNWords(str, 3, false)).toEqual('was with god');
      expect(getNWords(str, 5, false)).toEqual('was with god');
      expect(getNWords(str, 10, false)).toEqual('was with god');
    });
  
    it('should stop before any not allowed characters', () => {
      const str = 'The \nquick brown fox jumps over the lazy dog!';
      expect(getNWords(str, 3)).toEqual('The ');
      expect(getNWords(str, 5)).toEqual('The ');
      expect(getNWords(str, 10)).toEqual('The ');
      expect(getNWords(str, 3, false)).toEqual('the lazy dog!');
      expect(getNWords(str, 5, false)).toEqual('jumps over the lazy dog!');
      expect(getNWords(str, 10, false)).toEqual('quick brown fox jumps over the lazy dog!');
    });
    //https://www.gutenberg.org/cache/epub/14209/pg14209.html#:~:text=Universe.%22%E2%80%94The%20Kybalion.,%20%20%20Master.%22%E2%80%94The%20Kybalion Warum sind da drei leerzeichen ?
    it('should return the whole string if n is larger than the number of words', () => {
        const str = `Universe."—The Kybalion.
        CHAPTER VI
        THE DIVINE PARADOX
        "The half-wise, recognizing the comparative unreality of the Universe, imagine that they may defy its Laws—such are vain and presumptuous fools, and they are broken against the rocks and torn asunder by the elements by reason of their folly. The truly wise, knowing the nature of the Universe, use Law against laws; the higher against the lower; and by the Art of Alchemy transmute that which is undesirable into that which is worthy, and thus triumph. Mastery consists not in abnormal dreams, visions and fantastic imaginings or living, but in using the higher forces against the lower—escaping the pains of the lower planes by vibrating on the higher. Transmutation, not presumptuous denial, is the weapon of the Master."—The Kybalion.`

        expect(getNWords(str, 3)).toEqual('Universe."—The Kybalion.');
        expect(getNWords(str, 5)).toEqual('Universe."—The Kybalion.');

        expect(getNWords(str, 3, false)).toEqual('the Master."—The Kybalion.');
        expect(getNWords(str, 5, false)).toEqual('weapon of the Master."—The Kybalion.');

    });
  });