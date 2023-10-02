import { Document } from "langchain/document";

export interface Loader {
    load(url : string) : Promise<Document<Record<string, any>>[]>;
} 