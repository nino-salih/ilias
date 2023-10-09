import { Embedding } from "../documents/embedding.js";
import { Request, Response } from "express";

const embedding = new Embedding();

await embedding.createPipe();

export const getSearch = async (req: Request<{},{}, {}, { search: string }>, res: Response) => {
    const { search } = req.query;
      if (!search) {
        res.status(400).send('<p>No Search Querry provided</p>');
        return;
      }
      await embedding.create(search);
      res.send(embedding.embedding);
};