import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import { Rules, Webpage, Website } from "./website.js";

export class Glorian implements Website {
  skip: { url: RegExp }[] = [
    {
      url: /https:\/\/glorian\.org\/connect\/event-calendar.*/,
    },
    {
      url: /https:\/\/glorian\.org\/connect\/ask-instructor.*/,
    },
  ]
  baseUrl: string = "https://glorian.org/";
  sitemap: string  = "https://glorian.org/more/sitemap";

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
      // In Book https://glorian.org/books/the-perfect-matrimony/love
      url: /https:\/\/glorian\.org\/books\/.*\/.*/,
      selector: "div.uk-section-default:nth-child(4) > div:nth-child(1)",
      remove:
        "h4.uk-margin-remove-bottom,.uk-card,.uk-pagination,.uk-grid-column-small,div.uk-section-default:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4) > ul:nth-child(1)",
      title: ".uk-heading-large",
      author: "h3.el-title:nth-child(2)",
    },
    {
      //Book https://glorian.org/books/the-perfect-matrimony
      url: /https:\/\/glorian\.org\/books\/.*/,
      isbn: "ul.bullet-a li,.bullet-a,.uk-width-2-3\\@m > div:nth-child(2)",
      selector: ".uk-width-2-3\\@m",
      title: ".uk-heading-large",
      author:
        ".uk-width-2-3\\@m > div:nth-child(2) > h4:nth-child(2) > a:nth-child(1),.uk-width-2-3\\@m > div:nth-child(2) > h4:nth-child(2)",
    },
    {
      //Glossary https://glorian.org/learn/glossary/a/adept,
      url: /https:\/\/glorian\.org\/learn\/glossary\/[a-z]\/.*/,
      selector: "div.uk-panel:nth-child(5)",
      title: ".uk-heading-large",
    },
    {
      // Classes (from Samael Aun Weor) https://glorian.org/learn/courses-and-lectures/lectures-by-samael-aun-weor/a-human-being-in-the-image-and-likeness-of-god
      url: /https:\/\/glorian\.org\/learn\/courses-and-lectures\/lectures-by-samael-aun-weor\/.*/,
      selector: "div.uk-section-default:nth-child(2) > div:nth-child(1)",
      title: ".uk-heading-line",
      // Needs to remove 'Written by:'
      author:
        "div.uk-section-default:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4) > ul:nth-child(1) > li:nth-child(2) > a:nth-child(1),div.uk-section-default:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(5) > ul:nth-child(1) > li:nth-child(2) > a:nth-child(1)",
    },
    {
      // Classes (from instructors) https://glorian.org/learn/courses-and-lectures/alchemy/the-elements-in-spiritual-growth
      url: /https:\/\/glorian\.org\/learn\/courses-and-lectures\/.*\/.*/,
      selector: "div.uk-grid:nth-child(3) > div:nth-child(1)",
      title: ".uk-heading-large",
      author: "h3.el-title",
      remove: ".uk-card,.uk-pagination",
      // Transcription from: Death Course
      course: ".uk-container-small > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > ul:nth-child(1) > li:nth-child(1),.uk-container-small > div:nth-child(1) > div:nth-child(1) > div:nth-child(4) > ul:nth-child(1) > li:nth-child(1)"
    },
    {
      // Topic of Class (from instructors) https://glorian.org/learn/courses-and-lectures/astrology
      url: /https:\/\/glorian\.org\/learn\/courses-and-lectures\/.*/,
      selector: "div.uk-panel:nth-child(3)",
      remove:
        "div.uk-section-default:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4) > ul:nth-child(1),div.uk-panel:nth-child(3) > h3:nth-child(6)",
      title: ".uk-width-2-3\\@m > h1:nth-child(1)",
      course: ".uk-width-2-3\\@m > h1:nth-child(1)",
    },
    {
      // Blog Postes https://glorian.org/connect/blog/protect-your-home-from-negativity
      url: /https:\/\/glorian\.org\/connect\/blog\/.*/,
      selector: ".uk-container-small > div:nth-child(1) > div:nth-child(1)",
      remove:
        "#template-44hTZ6ei\\#0,.el-title,.DS006091447262941274 > .space-y-md,.uk-pagination,.uk-heading-large > span:nth-child(1)",
      title: ".uk-heading-large > span:nth-child(1)",
    },
    {
      // Scriptures Root https://glorian.org/learn/scriptures/gnostic-scriptures
      url: /https:\/\/glorian\.org\/learn\/scriptures\/.*/,
      selector: "#tm-main > div:nth-child(2)",
      title: ".uk-heading-large",
      remove: ".uk-text-meta",
    },
    {
      // Scriptures article https://glorian.org/learn/scriptures/gnostic-scriptures
      url: /https:\/\/glorian\.org\/learn\/scriptures\/.*/,
      selector: "#tm-main > div:nth-child(2)",
      title: ".uk-heading-large",
      remove: ".uk-text-meta,.uk-container-small > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > ul:nth-child(1)",
    },
  ];

/**
 * Downloads the content of a webpage from a given URL and applies a set of rules to extract specific information.
 * @param url The URL of the webpage to download.
 * @returns A Promise that resolves to a string containing the extracted information.
 * @throws An error if the URL is invalid or if the function does not know how to handle the URL.
 */
  async download(url: string): Promise<string> {
    if (!RegExp(this.baseUrl).exec(url)) {
      throw new Error("Invalid URL");
    }

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
        

        // If a chapter of a book is called before the book itself, download the book first
        if (/\/books\/.*\/.*/.test(url) && !this.webpage.book) {
          
          await this.download(url.split("/").slice(0, -1).join("/"));

        }

        // Reset the information about the Website
        this.resetInfo(url);
        
        this.setInfo(rule, $);

        if(/lectures-by-samael-aun-weor/.test(url)) {
          this.webpage.course = "Lectures by Samael Aun Weor"
        }

        this.webpage.content = $(rule.selector).text().replace(this.webpage.title ?? '', '');

        this.webpage.source = url;

        return this.webpage.content;
      }
    }
    throw new Error("Don't know how to handle this url");
  }

  private setInfo(rule: Rules, $: cheerio.CheerioAPI) {


    if (rule.title) {
      this.webpage.title = $(rule.title).text().trim();
      
    }

    
    if (rule.author) {
      this.webpage.author = $(rule.author)
        .text()
        .replace("Written by: ", "")
        .replace("A Book by:", "")
        .trim();
    }

    if (rule.isbn) {
      if (this.webpage.book) {
        this.webpage.book.isbn = RegExp(/ISBN\s(?:\d{13}|[\d-]{17})/).exec($(rule.isbn).text())?.[0].replace("ISBN ", "") ?? '';
        this.webpage.book.title = this.webpage.title ?? '';
      }
    }

    if (rule.course) {
      this.webpage.course = $(rule.course).text().trim().replace("Transcription from: ", "").replace(" Course", "");
    }


    if (rule.remove) {
      $(rule.remove).remove();
      
    }
  }

  private resetInfo(url: string) {

    if (/\/books\/.*\/.*/.test(url)) {
      this.webpage.title = undefined;
    } else if (/\/books\//.test(url)) {
      this.webpage.book = { isbn: "", title: "" };
      this.webpage.title = undefined;
    } else {
      this.webpage.author = undefined;
      this.webpage.title = undefined;
      this.webpage.book = undefined;
      
    }
    this.webpage.course = undefined;
    this.webpage.source = undefined;
    this.webpage.content = undefined;
  }


  
}

