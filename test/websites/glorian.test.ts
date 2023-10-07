import {describe, expect, beforeEach, it, jest } from '@jest/globals';
import axios from 'axios';
import {Glorian} from '../../src/documents/websites/glorian.js';
import { fail } from 'assert';

describe('Glorian', () => {
    let glorian: Glorian = new Glorian();
  
    // beforeEach(() => {
    //   glorian = new Glorian();
    // });
  
    describe("download", () => {
        it("should throw an error for invalid URL", async () => {
          await expect(glorian.download("https://example.com")).rejects.toThrow(
            "Invalid URL"
          );
        });

        it('should throw an error if the website returns an HTTP 404 error', async () => {
          const mock = jest.spyOn(axios, 'get');
          mock.mockReturnValueOnce(Promise.reject({ status: 404 }));

          await expect(glorian.download('https://glorian.org/books/the-perfect-matrimony')).rejects.toThrow('Website has thrown an Error');

          mock.mockRestore();
        });

        it("should throw an error for not parseble URL", async () => {
          await expect(
            glorian.download("https://glorian.org/connect/event-calendar")
          ).rejects.toThrow("Don't know how to handle this url");
        });
    
        it("should download book content", async () => {
          const content = await glorian.download(
            "https://glorian.org/books/the-perfect-matrimony"
          );
          
          expect(content).toContain("If you only want one book about real spiritual practice, The Perfect Matrimony has everything you need.");
          expect(glorian.webpage.author).toContain("Samael Aun Weor");
          expect(glorian.webpage.title).toContain("Perfect Matrimony");
          expect(glorian.webpage.course).toBe(undefined);
        });

        it("should download book content 2", async () => { 
          const content = await glorian.download(
            "https://glorian.org/books/the-dayspring-of-youth"
          );

          expect(content).toContain("First published in 1931, at a time when charlatans and fortune-seekers were rapidly expanding their efforts to mislead humanity through mischievous spiritual teachings");
          expect(glorian.webpage.author).toContain("M");
          expect(glorian.webpage.title).toContain("Dayspring of Youth");
          expect(glorian.webpage.book?.title).toContain("Dayspring of Youth");
          expect(glorian.webpage.book?.isbn).toBe("978-1-934206-77-5");
        });

        
    
        it("should download book chapter content", async () => {
          const content = await glorian.download(
            "https://glorian.org/books/the-perfect-matrimony/love"
          );
          expect(content).toContain("Wisdom and love are the two basal pillars of the great White Lodge.");
          expect(glorian.webpage.author).toContain("Samael Aun Weor");
          expect(glorian.webpage.title).toContain("Love");
          expect(glorian.webpage.course).toBe(undefined);
        });

        it("should download the Book and set book infos for a book chapter", async () => {
          await glorian.download(
            "https://glorian.org/books/the-perfect-matrimony"
          );
          await glorian.download(
            "https://glorian.org/books/the-perfect-matrimony/love"
          );
          expect(glorian.webpage.title).toContain("Love");
          if (glorian.webpage.book) {
            expect(glorian.webpage.book.title).toContain("Perfect Matrimony");
            expect(glorian.webpage.book.isbn).toContain("9781934206683");
          } else {
            fail("glorian.book is undefined or null");
          }
        });

        //If a chapter of a book is called before the book itself, download the book first
        it("should download the Book and set book infos for a book chapter", async () => {
          // Download the book and the chapter
          await glorian.download("https://glorian.org/books/the-perfect-matrimony/love");
        
          // Check that the chapter title is correct
          expect(glorian.webpage.title).toContain("Love");
        
          // Check that the book title and ISBN are correct
          if (glorian.webpage.book) {
            expect(glorian.webpage.book.title).toContain("Perfect Matrimony");
            expect(glorian.webpage.book.isbn).toContain("9781934206683");
          } else {
            fail("glorian.book is undefined or null");
          }
        });

        it("should download glossary content", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/glossary/a/adept"
          );
          expect(content).toContain("Adept");
          expect(glorian.webpage.title).toBe("Adept");
          expect(glorian.webpage.author).toBe(undefined);
          expect(glorian.webpage.course).toBe(undefined);
        });
    
        it("should download class content", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/courses-and-lectures/lectures-by-samael-aun-weor/a-human-being-in-the-image-and-likeness-of-god"
          );
          expect(content).toContain("It is possible for Adam אדם, a human being, to be created within us.");
          expect(glorian.webpage.title).toBe("A Human Being in the Image and Likeness of God");
          expect(glorian.webpage.author).toBe("Samael Aun Weor");
          expect(glorian.webpage.course).toBe("Lectures by Samael Aun Weor");
        });
    
        it("should download instructor class content", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/courses-and-lectures/alchemy/the-elements-in-spiritual-growth"
          );
          expect(content).toContain("This word spirit in English has been terribly abused, especially in the last one hundred years");
          expect(glorian.webpage.title).toBe("The Elements in Spiritual Growth");
          expect(glorian.webpage.author).toBe("Gnostic Instructor");
          expect(glorian.webpage.course).toBe("Alchemy");
        });

        it("should download instructor class content 2", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/courses-and-lectures/evolution-of-sex/where-we-are-now"
          );
          expect(content).toContain("Meditation (dhyana or samadhi) is not a technique, it is a state of consciousness. As such, it cannot be taught, it cannot be shown or demonstrated");
          expect(glorian.webpage.title).toBe("Where We Are Now");
          expect(glorian.webpage.author).toBe("Gnostic Instructor");
          expect(glorian.webpage.course).toBe("Evolution of Sex");
        });
    
        it("should download class topic content", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/courses-and-lectures/astrology"
          );
          expect(content).toContain("Learn how we can take advantage of those forces in order to improve life for all of us.");
          expect(glorian.webpage.title).toBe("Astrology");
          expect(glorian.webpage.author).toBe(undefined);
          expect(glorian.webpage.course).toBe("Astrology");
        });

        it("should download blog content", async () => {
          const content = await glorian.download(
            "https://glorian.org/connect/blog/protect-your-home-from-negativity"
          );
          expect(content).toContain("The most important spiritual defense is within you.");
          expect(content).not.toContain("Article contents:");
          expect(glorian.webpage.title).toBe("Protect Your Home from Negativity");
          expect(glorian.webpage.author).toBe(undefined);
          expect(glorian.webpage.course).toBe(undefined);
        }); 

        //https://glorian.org/learn/scriptures/buddhist
        it("should download scripture root content", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/scriptures/buddhist"
          );
          expect(content).toContain("The Buddha Shakyamuni gave an enormous number of important teachings to humanity, but sadly");
          expect(glorian.webpage.title).toBe("Buddhist");
          expect(glorian.webpage.author).toBe(undefined);
          expect(glorian.webpage.course).toBe(undefined);
        });

        //https://glorian.org/learn/scriptures/buddhist/eight-verses-on-mind-training
        it("should download scripture content", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/scriptures/buddhist/eight-verses-on-mind-training"
          );
          expect(content).toContain("I will train myself to at all times");
          expect(glorian.webpage.title).toBe("Eight Verses on Mind Training");
          expect(glorian.webpage.author).toBe(undefined);
          expect(glorian.webpage.course).toBe(undefined);
        });

        it("should download scripture content 2", async () => {
          const content = await glorian.download(
            "https://glorian.org/learn/scriptures/alchemy/golden-tractate"
          );
          expect(content).toContain("Understand ye, then, O Sons of Wisdom, that the knowledge");
          expect(glorian.webpage.title).toBe("Golden Tractate");
          expect(glorian.webpage.author).toBe(undefined);
          expect(glorian.webpage.course).toBe(undefined);
        });
      });
  });