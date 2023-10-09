import { Document } from "langchain/document";
import { createHash } from "crypto";
import {
  Embedding,
  RecursiveCharacterTextSplitterWithTokenizer,
} from "./embedding.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { Point } from "./Point.js";
import { Webpage } from "./websites/website.js";
import { getNWords } from "./utils/utils.js";
import { ConsoleColors } from "./downloader/console_color.js";
import * as dotenv from "dotenv";

export interface Metadata {
  title?: string;
  date?: Date;
  source?: string;
  course?: string;
  book?: { isbn: string; title: string };
  author?: string;
}

export class QdrantDocumentLoader {
  private readonly embedding = new Embedding();
  private readonly qdrant = new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost",
    port: process.env.QDRANT_PORT ? parseInt(process.env.QDRANT_PORT,10) : 6333,
  });
  private readonly qdrantCollectionName = process.env.QDRANT_COLLECTION ?? "dev";

  private readonly splitter = new RecursiveCharacterTextSplitterWithTokenizer({
    chunkSize: 512,
    chunkOverlap: 32,
  });
  

  static async create(): Promise<QdrantDocumentLoader> {
    dotenv.config();
    const loader = new QdrantDocumentLoader();
    await loader.embedding.createPipe();
    
    try {
      await loader.qdrant.getCollection(loader.qdrantCollectionName).then((collection) => {
        console.log("collection exists");
      });
    } catch (error) {
      await loader.qdrant.createCollection(loader.qdrantCollectionName, {
        vectors: {
          size: 384,
          distance: "Cosine",
        },
        shard_number: 2,
      });
    
      console.log("Collection created");
    }

    return loader;
  }

  private async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map(({ pageContent }) => pageContent);
    const colors = new ConsoleColors();
  
    // documents.forEach(({ pageContent, metadata }) => { 
    //     const first = getNWords(pageContent, 5, true);
    //     const last = getNWords(pageContent, 5, false);
    //     console.log(`${colors.yellow(first)},${colors.green(last)}`)
    //     const source = `${metadata["source"]}#:~:text=${encodeURIComponent(first)},${encodeURIComponent(last)}`;
    //     console.log(`${colors.magenta(source)}`)
    //     metadata["source"] = source;
    // });
  
    await this.addVectors(await this.embedding.embedDocuments(texts), documents);
  }
  
  private async insert(points: Point[], retry = 5): Promise<void> {
    const chunkSize = 32;
  
    if (retry === 0) {
      throw new Error("Failed to insert");
    }
  
    for (let i = 0; i < points.length; i += chunkSize) {
      try {
        await this.qdrant.upsert(this.qdrantCollectionName, {
          wait: true,
          points: points.slice(i, i + chunkSize),
        });
      } catch (error) {
        console.log(`Error Retry: , ${6 - retry}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.insert(points.slice(i, i + chunkSize), retry - 1);
      }
    }
  }
  
  /**
   * Checks if a point is in a collection using Qdrant.
   * @param point The point to check.
   * @param collectionName The name of the collection to check.
   * @param retry The number of times to retry the operation if it fails.
   * @returns A Promise that resolves to a boolean value indicating whether the point is in the collection.
   */
  private async isPointinCollection(point: Point, collectionName: string, retry = 5, timeout = 1000): Promise<boolean> {
    for (let i = 0; i < retry; i++) {
      try {
        const result = await this.qdrant.retrieve(collectionName, { ids: [point.id] });
        return result.length !== 0;
      } catch (error) {
        // Log the error and retry
        console.error(`Error retrieving point from collection: ${error}`);
        await new Promise(resolve => setTimeout(resolve, timeout));
      }
    }
    return false;
  }
  
  private async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
  
    console.log("Adding Vectors");
  
    if (vectors.length === 0) {
      return;
    }
  
    const length = vectors.length;
    const points = vectors.map((embedding, idx) => ({
      id: createHash("md5").update(documents[idx].pageContent).digest("hex"),
      vector: embedding,
      payload: {
        content: documents[idx].pageContent,
        metadata: documents[idx].metadata,
        location: { previous_chunk: "undefined", next_chunk: "undefined" },
      },
    }));
    // Adds the md5 hash to the payload
    points.forEach((point, idx) => {
      if (idx > 0) {
        point.payload.location.previous_chunk = points[idx - 1].id;
      }
      if (idx < length - 1) {
        point.payload.location.next_chunk = points[idx + 1].id;
      }
    });
  
    const filteredPoints = await Promise.all(points.map(async (point) => {
      const exists = await this.isPointinCollection(point, "test");
      return { point, exists };
    })).then((results) => results.filter(({ exists }) => !exists).map(({ point }) => point));
  
    console.log(`From ${points.length} Points where ${Math.abs(filteredPoints.length - points.length)} filtered`)
    console.log(`Adding ${filteredPoints.length} Points`);
    await this.insert(filteredPoints);
  }

  async upload(toSave : Webpage[] | Document[]) : Promise<void> {


    if(toSave instanceof Array && toSave[0] instanceof Document) {
      await this.addDocuments(toSave as Document[]);
      return;
    }

    for(const page of toSave as Webpage[]) {

      const metadata: Record<string, any> = Object.fromEntries(
        Object.entries(page).filter(([key, value]) => key !== "content" && value !== undefined)
      );

      const doc = await this.splitter.splitDocuments([
        new Document({ pageContent: page.content as string, metadata: metadata }),
      ]);
    
      await this.addDocuments(doc);
    }
  }

};