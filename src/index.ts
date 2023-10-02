import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import {Embedding } from "./embedding.js";

dotenv.config();

const app = express();

const embedding = new Embedding();

await embedding.createPipe();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req: Request<{},{}, {}, { search: string }>, res: Response) => {
  (async () => {
    const { search } = req.query;
    if (!search) {
      res.send('<p>No Search Querry provided</p>');
      return;
    }
    (await embedding.create(search));
    res.send(embedding.embedding);
  })();
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});