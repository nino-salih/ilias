import axios, { AxiosError } from "axios";
import { Rules, Webpage, Website } from "./website.js";
import * as cheerio from "cheerio";

export class Chicagognosis extends Website {
    skip: { url: RegExp; }[] = [];
    baseUrl: string = "https://chicagognosis.org/";
    sitemap: string = "https://chicagognosis.org/sitemap.xml"
    webpage: Webpage = {
        author: undefined,
        title: undefined,
        book: undefined,
        content: undefined,
        source: undefined,
        course: undefined,
      };

    private rules: Rules[] = [
        {
            // //https://chicagognosis.org/articles/why-is-sexual-magic-controversial
            url: /https:\/\/chicagognosis\.org\/articles\/.*/,
            selector: "#wsite-content",
            remove:
              ".blog-header,.blog-comments-bottom,.blog-comment-area,.pb-audio-player,#commentArea",
            title: ".blog-title-link",
        },
        {
            //https://chicagognosis.org/lectures/spiritual-discipline
            url: /https:\/\/chicagognosis\.org\/lectures\/.*/,
            selector: "#wsite-content",
            remove:
              ".blog-header,.blog-comments-bottom,.blog-comment-area,.pb-audio-player,#commentArea",
            title: ".blog-title-link",
        },
        {
            //https://chicagognosis.org/scriptures/nietzsche-on-child-and-marriage
            url: /https:\/\/chicagognosis\.org\/scriptures\/.*/,
            selector: "#wsite-content",
            remove:
              ".blog-header,.blog-comments-bottom,.blog-comment-area,.pb-audio-player,#commentArea",
            title: ".blog-title-link",
        },
    ];

    async download(url: string): Promise<string> {
        if (!RegExp(this.baseUrl).exec(url)) {
            throw new Error("Invalid URL");
          }

          this.resetInfo();
      
          for (const rule of this.rules) {
            if (rule.url.test(url)) {
              const webpage = await axios
                .get(url)
                .then(({ data }) => {
                  return data;
                })
                .catch((reason: AxiosError) => {
                  console.log(reason);
                  throw new Error("Website has thrown an Error");
                });
      
              const $ = cheerio.load(webpage);

              this.webpage.author = "Chicagognosis"

              if(rule.title) {
                this.webpage.title = $(rule.title).text().trim();
              }

              if(rule.remove) {
                $(rule.remove).remove();
              }

              if(rule.selector) {
                this.webpage.content = $(rule.selector).text();
              }

                this.webpage.source = url;
                return this.webpage.content as string;
            }
        }
        throw new Error("Don't know how to handle this url");

    }

    private resetInfo() {
        this.webpage = {
        author: undefined,
        title: undefined,
        book: undefined,
        content: undefined,
        source: undefined,
        course: undefined,
        }
    }
}