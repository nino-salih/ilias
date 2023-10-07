import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import {Embedding } from "./embedding.js";
import * as fs from "fs";
import authRoute from "./routes/auth.js";
import searchRoute from "./routes/search.js";
import uploadRoute from "./routes/upload.js";

export const dot = dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use('/', authRoute);
app.use('/', searchRoute);
app.use('/', uploadRoute);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});