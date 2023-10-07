import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import * as fs from "fs";

export interface Repository<T> {
    save(entity: T): Promise<T>;
    saveAll(entities: T[] | Set<T>): Promise<T[] | Set<T>>;
    delete(entity: T): Promise<T>;
    deleteAll(entity: T[]): Promise<T[]>;
    update(entity: T): Promise<T>;
    find(id: T): Promise<T>;
    findByID(id: number): Promise<T>;
    findAll(id: T): Promise<T[]>;

}

export type ToVisit = {
    id: number;
    link: string;
  };

const isToVisit = (entity: any): entity is ToVisit => {
    return typeof entity.id === "number" && typeof entity.link === "string" && Object.keys(entity).length === 2;
} 

export type Visited = {
    id: number;
    link: string;
    visited_at: Date;
  }; 
  
const isVisited = (entity: any): entity is Visited => {
    return typeof entity.id === "number" && typeof entity.link === "string" && typeof entity.visited_at === "object" && Object.keys(entity).length === 3;
};

export class SQLDatabase<T> implements Repository<T> {

    private db: Database<sqlite3.Database, sqlite3.Statement>;

    private constructor(db: Database<sqlite3.Database, sqlite3.Statement>) {
        this.db = db;
    }
    findByID(id: number): Promise<T> {
        throw new Error("Method not implemented.");
    }
    create<T>(): Promise<Repository<T>> {
        throw new Error("Method not implemented.");
    }

    static async create<T>(): Promise<Repository<T>> {

        console.log("Creating Database");

        const db = await open({
            filename: "./state.db",
            driver: sqlite3.cached.Database
          }).catch((error) => { 
            console.log(error);
            throw error;
          });

        const sql   = fs.readFileSync('./schema/visited.sql').toString();
        const sql_2 = fs.readFileSync('./schema/toVisit.sql').toString();

        await db.exec(sql).catch((error) => {
            console.log(error);
        });

        await db.exec(sql_2).catch((error) => {
            console.log(error);
        });

        return new SQLDatabase<T>(db);
    }

    async save(entity: T): Promise<T> {
        if (isToVisit(entity)) {
            await this.db.run(`INSERT OR IGNORE INTO toVisit (link) VALUES ('${entity.link}');`);
        } else if (isVisited(entity)) {
            await this.db.run(`INSERT OR IGNORE INTO visited (link, visited_at) VALUES ('${entity.link}', '${entity.visited_at.toISOString()}');`);
        }
        return Promise.resolve(entity);
    }

    async saveAll(entities: T[] | Set<T>): Promise<T[] | Set<T>> {
        for(const element of entities) {
            if (isToVisit(element)) {
                await this.db.run(`INSERT OR IGNORE INTO toVisit (link) VALUES ('${element.link}');`);
            } else if (isVisited(element)) {
                await this.db.run(`INSERT OR IGNORE INTO visited (link, visited_at) VALUES ('${element.link}', '${element.visited_at.toISOString()}');`);
            }
        }

        return Promise.resolve(entities);
    }

    async delete(entity: T): Promise<T> {
        if (isToVisit(entity)) {
            await this.db.run(`DELETE FROM toVisit WHERE link = '${entity.link}';`);
        } else if (isVisited(entity)) {
            await this.db.run(`DELETE FROM visited WHERE link = '${entity.link}';`);
        }
        return Promise.resolve(entity);
    }

    async deleteAll(entity: T[]): Promise<T[]> {
        for(const element of entity) {
            await this.delete(element);
        }

        return Promise.resolve(entity);
    }

    async update(entity: T): Promise<T> {
        if (isToVisit(entity)) {
            await this.db.run(`UPDATE toVisit SET link = '${entity.link}' WHERE id = ${entity.id};`);
        } else if (isVisited(entity)) {
            await this.db.run(`UPDATE visited SET link = '${entity.link}', visited_at = '${entity.visited_at.toISOString()}' WHERE id = ${entity.id};`);
        }
        return Promise.resolve(entity);
    }

    async find(id: T): Promise<T> {


        if(isToVisit(id)) {
            const visit_rows = await this.db.get(`SELECT link FROM toVisit WHERE link LIKE '${id.link}%';`).catch((error) => {
                console.log(error);
            });

            return visit_rows as ToVisit as T;

        } else if (isVisited(id)) {

            const visited_rows = await this.db.get(`SELECT link, visited_at FROM visited WHERE link LIKE '${id.link}%';`).catch((error) => {
                console.log(error);
            });

            return { ...visited_rows, visited_at: new Date(visited_rows.visited_at) } as Visited as T;
        }

        return null as T;
    }

    async findAll(id: T): Promise<T[]> {

        const results: T[] = [];

        if(isToVisit(id)) {
            const visit_rows = await this.db.all(`SELECT link FROM toVisit WHERE link LIKE '${id.link}%';`).catch((error) => {
                console.log(error);
                throw error;
            });


            for (const row of visit_rows) {
                results.push(row as ToVisit as T);
            }

        } else if (isVisited(id)) {
            const visited_rows = await this.db.all(`SELECT link, visited_at FROM visited WHERE link LIKE '${id.link}%';`).catch((error) => {
                console.log(error);
                throw error;
            });

            for (const row of visited_rows) {
                results.push({ ...row, visited_at: new Date(row.visited_at) } as Visited as T);
            }
        }

        return results;
    }
}