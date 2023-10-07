import axios, { AxiosError } from "axios";
import { Glorian } from "../websites/glorian.js";
import { Webpage, Website } from "../websites/website.js";
import * as cheerio from "cheerio";
import { it } from "node:test";
import { ConsoleColors } from "./console_color.js";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { SQLStatement } from "sql-template-strings";
import * as fs from "fs";
import { Repository, SQLDatabase, ToVisit, Visited } from "../../presistens/repository.js";

abstract class Downloader {

    //visited!: Set<string>;
    
    abstract websites : Website[];

    abstract dump(url: string): Promise<Webpage[]>;

    abstract download(url: string): Promise<Webpage>;

    abstract alreadyDownloaded(url: string): Promise<boolean>;
}

export class FileDownloader implements Downloader {

    private  consoleColors = new ConsoleColors();

    private visited: Set<Visited> = new Set();

    private toVisit: Set<ToVisit> = new Set();

    websites: Website[];

    private site? : Website;

    private downloadFolder = "./doc";

    private db : Repository<ToVisit | Visited>;

    private constructor(db: Repository<ToVisit | Visited>) {
        this.websites = new Array<Website>();
        this.websites.push(new Glorian());
        this.db = db;
    }


    public static async create() : Promise<FileDownloader> {

        console.log("Creating Database");
        const database = await SQLDatabase.create<ToVisit | Visited>();
        return  new FileDownloader(database);
    }

    private static containsLink(links: Set<any>, link: string): boolean {

        for(const item of links) {
            if(item.link === link) {
                return true;
            }
        }

        return false; 
    }

    private static sanitizeUrl(url: string): string {
        const parts = url.split("#");
        return parts.length > 1 ? parts.slice(0, -1).join("#") : url;
    }
    
    
    async dump(websiteUrl: string, limit : number = 10): Promise<Webpage[]> {

        console.log(this.consoleColors.green(`Downloading ${websiteUrl}`));
        this.setSite(websiteUrl);

        this.toVisit = new Set(await this.db.findAll({id: 0, link: this.site?.baseUrl as string}));


        this.visited = new Set(await this.db.findAll({id: 0, link: this.site?.baseUrl as string, visited_at: new Date()}) as Visited[]);

        console.log(`To Visit: ${this.toVisit.size}`);
        console.log(`Visited: ${this.visited.size}`);

        this.toVisit.add({id: 0, link: this.site?.sitemap as string});

        const toSave : Webpage[] = [];
        
        let index = 0;
        const interator = this.toVisit.values();

        while (index < this.toVisit.size) {
            const url : string = FileDownloader.sanitizeUrl(interator.next().value.link);
            if(index > limit) {
                console.log(this.consoleColors.red(`Limit of ${limit} reached`));
                break;
            }

            if (this.site?.skip?.some((skip) => skip.url.test(url))) {
                console.log(this.consoleColors.yellow(`Skipping ${url}`));
                this.visited.add({id : 0, link: url, visited_at: new Date()});
                continue;
              }

            if(FileDownloader.containsLink(this.visited, url)) {
                //console.log(`Already visited: ${url}`);
                continue;
            }

            console.log(`Downloading: ${url}`);

            const webpage = await axios
            .get(url)
            .then(({ data }) => {
            return data;
            })
            .catch((reason: AxiosError) => {
            console.log(reason.code);
            return undefined;
            });

            if(!webpage) {
                this.visited.add({id : 0, link: url, visited_at: new Date()});
                continue;
            }

            const $ = cheerio.load(webpage);

            $('a').each((index, element) => {
                const href = $(element).attr('href');
                if (href) {
                const fullUrl = new URL(href, this.site?.baseUrl).toString();
                
                if(!FileDownloader.containsLink(this.toVisit, fullUrl) && !FileDownloader.containsLink(this.visited, fullUrl) && RegExp(this.site?.baseUrl as string).exec(fullUrl)) {
                    //console.log(`Added: ${fullUrl}`)
                    this.toVisit.add({id: 0, link: fullUrl});
                }
                
                }
            });

            

            try {
                const data = await this.download(url);
                toSave.push(data);
            } catch (error) {
                console.log(error);
            }
            this.visited.add({id : 0, link: url, visited_at: new Date()});
            
            //wait for 2 seconds
            console.log(this.consoleColors.blink("Waiting for 1.5 seconds"));
            await new Promise((resolve) => setTimeout(resolve, 1500));
            index++;
        }

        console.log(`To Visit: ${this.toVisit.size}`);
        console.log(`Visited: ${this.visited.size}`);

        await this.db.saveAll(this.visited);
        await this.db.saveAll(this.toVisit);

        console.log("Saved Database State");

        return toSave;
    }

    private setSite(url: string) : void {
        if (!this.site) {
            this.site = this.websites.find((website) => RegExp(website.baseUrl).exec(url));

            if (!this.site) {
                throw new Error("Website not Implemented");
            }
        }
    }

    async download(url: string): Promise<Webpage> {

        this.setSite(url);
        
        try {
            await this.site?.download(url);
            //clone this.site?.webpage by value not by reference
            return {... this.site?.webpage} as Webpage;

        } catch (error) {
            return Promise.reject(`Could not download ${url} threw ${error}`);
        }     
        
    }

    // async test(): Promise<void> {
    //     const tables = await this.db.all(
    //         "SELECT name FROM sqlite_master WHERE type='table';"
    //       );
    
    //       for (const table of tables) {
    //         const rows = await this.db.all(`SELECT * FROM ${table.name};`);
    //         console.log(`Table: ${table.name}`);
    //         console.log(rows);
    //       }  
    //   }


    alreadyDownloaded(url: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}