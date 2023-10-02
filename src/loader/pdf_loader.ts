import { DirectoryLoader, LoadersMapping } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { EPubLoader } from "langchain/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitterWithTokenizer } from "../embedding.js";
import { Document } from "langchain/document";
import { File } from "buffer";
import * as fs from "fs";
import PdfParse, { Options } from "pdf-parse";
import { normalize } from "path";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { Loader } from "./loader.js";

export class PDFLoader implements Loader{

    /**
     * Loads a PDF file and splits its content into smaller documents.
     * @returns A 2D array of documents, where each element of the outer array represents a page and each element of the inner array represents a chunk of text.
     */ 
    async load(filePath : string) : Promise<Document<Record<string, any>>[]> {


    //Load file
    const databuffer = new Uint8Array(await fs.promises.readFile(filePath));


    console.log("File Loaded");

    const docs: Document[] = await this.extractText(databuffer);


    const splitter = new RecursiveCharacterTextSplitterWithTokenizer({
        chunkSize: 512,
        chunkOverlap: 32,
    });

    const splitedDoc : Document[] = [];

    for (const doc of docs) {
        const splitted : Document[] = await splitter.splitDocuments([doc])
        for (const split of splitted) {
            splitedDoc.push(split);
        } 
    }     

    return splitedDoc
    }

 private async extractText(databuffer: Uint8Array) : Promise<Document[]> {
    const pdf = await pdfjsLib.getDocument(databuffer).promise;

    const metadata = await pdf.getMetadata();

    const totalPages = pdf.numPages;

    const docs: Document[] = [];

    // Extract the text from each page and transform it into a document
    for (let i = 1; i <= totalPages; i++) {
        let pageText = await pdf.getPage(i).then(async (pageData) => {
            const textContent = await pageData.getTextContent();
            let lastY, text = '';
            for (let item of textContent.items) {
                if ('transform' in item) {
                    if (lastY == item.transform[5] || !lastY) {
                        text += item.str;
                    } else {
                        text += '\n' + item.str;
                    }
                    lastY = item.transform[5];
                }
            }
            return text;
        });

        docs.push({
            pageContent: pageText,
            metadata: {
                pdf: {
                    info: metadata.info,
                    totalPages: pdf.numPages,
                },
                loc: {
                    pageNumber: i,
                },
            },
        });

    }

    return docs;
}

}
