import {describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';
import { Chicagognosis } from '../../src/documents/websites/chicagognosis.js';

describe('Chicagognosis', () => {
    let chicagognosis: Chicagognosis = new Chicagognosis();
  
    describe("download", () => {
        it("should throw an error for invalid URL", async () => {
          await expect(chicagognosis.download("https://example.com")).rejects.toThrow(
            "Invalid URL"
          );
        });

        it('should throw an error if the website returns an HTTP 404 error', async () => {
          const mock = jest.spyOn(axios, 'get');
          mock.mockReturnValueOnce(Promise.reject({ status: 404 }));

          await expect(chicagognosis.download('https://chicagognosis.org/lectures/freedom-in-times-of-suffering')).rejects.toThrow('Website has thrown an Error');

          mock.mockRestore();
        });

        it("should throw an error for not parseble URL", async () => {
          await expect(
            chicagognosis.download("https://chicagognosis.org/index.html")
          ).rejects.toThrow("Don't know how to handle this url");
        });

        //https://chicagognosis.org/articles/why-is-sexual-magic-controversial
        it("should download an article", async () => {
            const content = await chicagognosis.download(
                "https://chicagognosis.org/articles/why-is-sexual-magic-controversial"
              );
              expect(content).toContain("The verse from 1 Peter 2:8 also states: \"They stumble because");
              expect(chicagognosis.webpage.title).toBe("Why Is Sexual Magic Controversial?");
              expect(chicagognosis.webpage.author).toBe("Chicagognosis");
            });
        
        it("Content on artical should not have", async () => {
            const content = await chicagognosis.download(
                "https://chicagognosis.org/articles/why-is-sexual-magic-controversial"
            );
            expect(content).not.toContain("Why Is Sexual Magic Controversial?");
            expect(content).not.toContain("2/10/2021");
            expect(content).not.toContain("Your comment will be posted after it is approved.");
            });
        });
        //https://chicagognosis.org/lectures/spiritual-discipline
        it("should download a lecture", async () => {
            const content = await chicagognosis.download(
                "https://chicagognosis.org/lectures/spiritual-discipline"
              );
              expect(content).toContain("We were explaining this teaching in relation to the mysticism of Islam, and Islam in Arabic means submission to God's will");
              expect(chicagognosis.webpage.title).toBe("Spiritual Discipline");
              expect(content).not.toContain("Chicago Gnosis Podcast");
              expect(chicagognosis.webpage.author).toBe("Chicagognosis");
            });

        //https://chicagognosis.org/lectures/spiritual-discipline
        it("Content on lectures should not have", async () => {
            const content = await chicagognosis.download(
                "https://chicagognosis.org/lectures/spiritual-discipline"
            );
            expect(content).not.toContain("Spiritual Discipline");
            expect(content).not.toContain("8/27/2016");
            expect(content).not.toContain("Chicago Gnosis Podcast");
            expect(content).not.toContain("Your comment will be posted after it is approved.");
            });
        //https://chicagognosis.org/scriptures/nietzsche-on-child-and-marriage
        it("should download a Scriptures", async () => {
            const content = await chicagognosis.download(
                "https://chicagognosis.org/scriptures/nietzsche-on-child-and-marriage"
            );
            expect(content).toContain("the commander of your senses (pratyahara in the eightfold path of meditation)");
            expect(chicagognosis.webpage.title).toBe("Nietzsche: On Child and Marriage");
            expect(chicagognosis.webpage.author).toBe("Chicagognosis");
            });

        //https://chicagognosis.org/scriptures/nietzsche-on-child-and-marriage
        it("Content on lectures should not have", async () => {
            const content = await chicagognosis.download(
                "https://chicagognosis.org/scriptures/nietzsche-on-child-and-marriage"
            );
            expect(content).not.toContain("Nietzsche: On Child and Marriage");
            expect(content).not.toContain("11/24/2016 ");
            expect(content).not.toContain("Chicago Gnosis Podcast");
            expect(content).not.toContain("Leave a Reply");
            });
        
  }); 
