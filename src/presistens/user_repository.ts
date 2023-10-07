import { Repository } from './repository.js';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import * as fs from 'fs';

export type User = {
    id?: number;
    email: string;
    password: string;
}

export class UserRepository implements Repository<User> {
    private db: Database<sqlite3.Database, sqlite3.Statement>;

    private constructor(db: Database<sqlite3.Database, sqlite3.Statement>) {
        this.db = db;
    }

    static async create(): Promise<Repository<User>> {

        console.log("Creating Database");

        const db = await open({
            filename: "./users.db",
            driver: sqlite3.cached.Database
          }).catch((error) => { 
            console.log(error);
            throw error;
          });

        const sql   = fs.readFileSync('./schema/users.sql').toString();

        await db.exec(sql).catch((error) => {
            console.log(error);
        });

        return new UserRepository(db);
    }

    async save(entity: User): Promise<User> {
        const { email, password } = entity;
        const statement = await this.db.prepare(`
            INSERT INTO users (email, password)
            VALUES (?, ?);
        `);
        const result = await statement.run(email, password);
        const id = result.lastID;
        await statement.finalize();
        return { id: id!, email, password }; // add '!' to assert that id is not undefined
    }

    async saveAll(entities: Set<User> | User[]): Promise<Set<User> | User[]> {
        const users = Array.from(entities);
        const promises = users.map(user => this.save(user));
        return Promise.all(promises);
    }

  async delete(entity: User): Promise<User> {
    const { id } = entity;
    const statement = await this.db.prepare(`
      DELETE FROM users
      WHERE id = ?;
    `);
    await statement.run(id);
    await statement.finalize();
    return entity;
  }

  async deleteAll(entities: User[]): Promise<User[]> {
    const promises = entities.map(entity => this.delete(entity));
    return Promise.all(promises);
  }

  async update(entity: User): Promise<User> {
    const { id, email, password } = entity;
    const statement = await this.db.prepare(`
      UPDATE users
      SET email = ?, password = ?
      WHERE id = ?;
    `);
    await statement.run(email, password, id);
    await statement.finalize();
    return entity;
  }

    async find(id: User): Promise<User> {
    const statement = await this.db.prepare(`
      SELECT * FROM users
      WHERE email = ?;
    `);

    const user = await statement.get(id);

    await statement.finalize();
    if (!user) {
      throw new Error(`User with email ${id} not found`);
    }

    return user as User;
  }

  async findByID(id: number): Promise<User> {
    const statement = await this.db.prepare(`
      SELECT * FROM users
      WHERE id = ?;
    `);

    const user = await statement.get(id);

    await statement.finalize();
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    return user as User;
  }

  async findAll(): Promise<User[]> {
    const statement = await this.db.prepare(`
      SELECT * FROM users;
    `);
    const users = await statement.all();
    await statement.finalize();
    return users;
  }
}