export abstract class Website { 

    abstract  baseUrl : string;

    abstract  webpage : Webpage;

    abstract  download(url : string) : Promise<string>;

    abstract sitemap : string | undefined;

    abstract skip : { url : RegExp}[];


    
}

export interface Rules {
   url : RegExp;
   selector: string;
   remove?: string;
   title?: string;
   author?: string;
   isbn?: string; 
   course?: string;    
}

export type Webpage = {
    title?: string;
    author?: string;
    book?: {
        isbn: string;
        title: string;
    }
    content?: string;
    source?: string;
    course?: string;
}
