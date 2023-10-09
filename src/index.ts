import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoute from "./routes/auth.js";
import searchRoute from "./routes/search.js";
import uploadRoute from "./routes/upload.js";
import cookieParser from 'cookie-parser';

export const dot = dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use('/', authRoute);
app.use('/', searchRoute);
app.use('/', uploadRoute);
app.use('/', (req, res) => {
  res.redirect('/upload');
});

const port = process.env.ILIAS_PORT ? parseInt(process.env.ILIAS_PORT, 10) : 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});