import {
  pipeline,
  Pipeline,
  Tensor,
  PreTrainedTokenizer,
} from "@xenova/transformers";
import { Embeddings } from "langchain/embeddings";
import { EmbeddingsParams } from "langchain/embeddings/base";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export class RecursiveCharacterTextSplitterWithTokenizer extends RecursiveCharacterTextSplitter {
  private tokenizer!: PreTrainedTokenizer;

  constructor(fields?: Partial<RecursiveCharacterTextSplitter>) {
    super(fields);

    this.lengthFunction = async (chunk: string): Promise<number> => {
      if (!this.tokenizer) {
        await this.initilizeTokenizer();
      }

      return this.tokenizer.encode(chunk).length;
    };
  }

  private async initilizeTokenizer() {
    this.tokenizer = await PreTrainedTokenizer.from_pretrained(
      "xenova/gte-small",
      { quantized: true }
    );
  }
}
/**
 * @class Embedding
 * @description Creates an embedding for a given text
 */
export class Embedding extends Embeddings {
  private pipe!: Pipeline;
  private _embedding!: Tensor;
  private chunkSize = 512;

  constructor(params?: EmbeddingsParams) {
    super(params ?? {});
  }

  /**
   * Creates a pipeline for feature extraction using the `pipeline` function from the `@xenova/transformers` package.
   * @returns A Promise that resolves when the pipeline is created.
   */
  public async createPipe() {
    this.pipe = await pipeline("feature-extraction", "xenova/gte-small", {
      quantized: true,
    });
    console.log("Pipeline created");
  }

  /**
   *
   * @param text  The text to be embedded
   * @description Creates an embedding for the given text
   * @returns  {Promise<Tensor>}
   */
  public async create(text: string): Promise<Tensor> {
    if (!this.pipe) {
      console.log("Pipe not initiliazed");
      await this.createPipe();
    }
    //console.log("Creating embedding");
    this._embedding = await this.pipe(text, {
      pooling: "mean",
      normalize: true,
    });
    //console.log("Embedding created");
    return this._embedding;
  }

  public get embedding(): Tensor {
    if (!this._embedding) {
      console.log("Embedding not initiliazed. Run createPipe() first");
      return {} as Tensor;
    }

    return this._embedding;
  }
  /**
   * Embeds an array of documents by calling the `embedQuery` method for each document.
   * @param documents An array of strings representing the documents to embed.
   * @returns A Promise that resolves to a two-dimensional array of numbers representing the embeddings for each document.
   * @throws An error if any of the documents are too long to embed.
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    const list = await Promise.all(
      documents.map(async (text) => {
        //text = text.replace(/\n/g, " ");
        return await this.embedQuery(text);
      })
    );

    return list;
  }

  /**
   * Embeds a single document by calling the `create` method and flattening the resulting tensor.
   * @param document A string representing the document to embed.
   * @returns A Promise that resolves to an array of numbers representing the embedding for the document.
   * @throws An error if the document is too long to embed.
   */
  async embedQuery(document: string): Promise<number[]> {

    if (this.pipe.tokenizer.encode(document).length > this.chunkSize) {
      console.log(`Document is too long: was ${document.length} but only ${this.chunkSize} is allowed`);
      throw new Error("Document too long");
    }

    return (await this.create(document)).tolist().flat();
  }
}
