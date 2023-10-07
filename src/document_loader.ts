import { Document } from "langchain/document";
import { QdrantVectorStore } from "langchain/vectorstores/qdrant";
import { createHash } from "crypto";
import {
  Embedding,
  RecursiveCharacterTextSplitterWithTokenizer,
} from "./embedding.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { Glorian } from "./documents/websites/glorian.js";
import { Point } from "./Point.js";
import { PDFLoader } from "./documents/loader/pdf_loader.js";
import { FileDownloader } from "./documents/downloader/downloader.js";
import { Webpage } from "./documents/websites/website.js";
import { cat } from "@xenova/transformers";
import { resolve } from "path";
import { time } from "console";
import { getNWords } from "./documents/utils/utils.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { ConsoleColors } from "./documents/downloader/console_color.js";

export interface Metadata {
  title?: string;
  date?: Date;
  source?: string;
  course?: string;
  book?: { isbn: string; title: string };
  author?: string;
}

async function addDocuments(documents: Document[]): Promise<void> {
  const texts = documents.map(({ pageContent }) => pageContent);
  const colors = new ConsoleColors();

  documents.forEach(({ pageContent, metadata }) => { 
      const first = getNWords(pageContent, 5, true);
      const last = getNWords(pageContent, 5, false);
      console.log(`${colors.yellow(first)},${colors.green(last)}`)
      const source = `${metadata["source"]}#:~:text=${encodeURIComponent(first)},${encodeURIComponent(last)}`;
      metadata["source"] = source;
  });


  documents.forEach(({metadata }) => { 
    console.log(metadata["source"]);
});

  throw new Error("Function not implemented.");
  await addVectors(await embedding.embedDocuments(texts), documents);
}

async function insert(points: Point[], retry: number = 5) {

  const chunkSize = 32;

  if (retry === 0) {
    return Promise.reject("Failed to insert");
  }

  for (let i = 0; i < points.length; i += chunkSize) {
    await qdrant
      .upsert("test", {
        wait: true,
        points: points.slice(i, i + chunkSize),
      })
      .catch((error) => {
        console.log(`Error Retry: , ${6 - retry}`);
        setTimeout(() => {
          (async () => {
            await insert(points.slice(i, i + chunkSize), retry - 1);
          })();
        }, 500);
      });
  }
}

/**
 * Checks if a point is in a collection using Qdrant.
 * @param point The point to check.
 * @param collectionName The name of the collection to check.
 * @param retry The number of times to retry the operation if it fails.
 * @returns A Promise that resolves to a boolean value indicating whether the point is in the collection.
 */
 async function isPointinCollection(point:Point, collectionName : string, retry : number = 5) : Promise<boolean> {

  return new Promise((resolve, reject) => {

    // Set a timeout to limit the amount of time the function can run
    const timeout = setTimeout(async () => {
      try {
        const result = await qdrant.retrieve(collectionName, { ids: [point.id] })
        resolve(result.length !== 0);
      } catch (error) {
        if (retry > 0) {
          const pointInCollection = await isPointinCollection(point, collectionName, retry - 1)
          resolve(pointInCollection);
        } else {
          reject(error);
        }
      }
    }, 500);
    
    const clear = () => clearTimeout(timeout);
  });
}

async function addVectors(vectors: number[][], documents: Document[]): Promise<void> {

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
    const exists = await isPointinCollection(point, "test");
    return { point, exists };
  })).then((results) => results.filter(({ exists }) => !exists).map(({ point }) => point));

  console.log(`From ${points.length} Points where ${Math.abs(filteredPoints.length - points.length)} filtered`)
  console.log(`Adding ${filteredPoints.length} Points`);
  await insert(filteredPoints);
}

// // async function addWebsite(url: string): Promise<void> {
// //   const text = await website.download(url).then((text) => {
// //     console.log("Text downloaded");
// //     return text;
// //   });

//   // let metadata: Metadata = {
//   //   title: website.title,
//   //   date: new Date(),
//   //   source: url,
//   //   //book: { isbn: "9781934206768", title: "Treatise of Revolutionary Psychology" },
//   //   course: "Lectures by Samael Aun Weor",
//   //   author: website.author,
//   // };

//   let metadata: Metadata = {};

//   const splitter = new RecursiveCharacterTextSplitterWithTokenizer({
//     chunkSize: 512,
//     chunkOverlap: 32,
//   });

//   const doc = await splitter.splitDocuments([
//     new Document({ pageContent: text, metadata: metadata }),
//   ]);

//   addDocuments(doc).then((r) => console.log(r));
// }

const embedding = new Embedding();

await embedding.createPipe();

const qdrant = new QdrantClient({
  url: "http://localhost",
  port: 6333,
});

try {
  await qdrant.getCollection("test").then((collection) => {
    console.log("collection exists");
  });
} catch (error) {
  await qdrant.createCollection("test", {
    vectors: {
      size: 384,
      distance: "Cosine",
    },
    shard_number: 2,
  });

  console.log("Collection created");
}

const vectorStore = await QdrantVectorStore.fromExistingCollection(embedding, {
  collectionName: "test",
  url: "http://localhost:6333",
});

//const loader = new PDFLoader();
//const pdfDocument = await loader.load("./doc/The Secret Doctrine_II.pdf")

const test = await FileDownloader.create();

const splitter = new RecursiveCharacterTextSplitterWithTokenizer({
  chunkSize: 512,
  chunkOverlap: 32,
});

const webSite = await axios.get("https://www.gutenberg.org/cache/epub/14209/pg14209.html");
const $ = cheerio.load(webSite.data);

const toSave : Webpage[] = [{title: "THE KYBALION", content: $('body').text(), source: "https://www.gutenberg.org/cache/epub/14209/pg14209.html"}]

//const toSave : Webpage[] = await test.dump("https://glorian.org/", 20);

for(const page of toSave) {

  const metadata: Record<string, any> = Object.fromEntries(
    Object.entries(page).filter(([key, value]) => key !== "content" && value !== undefined)
  );
  const doc = await splitter.splitDocuments([
    new Document({ pageContent: page.content as string, metadata: metadata }),
  ]);

  await addDocuments(doc);
  //console.log(doc)
}




console.log("Finished");
