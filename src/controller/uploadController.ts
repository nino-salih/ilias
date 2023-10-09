import multer from "multer";
import fs from "fs";
import { Request, Response } from "express";
import * as FileType from "file-type"
import { isLoggedIn } from "./authController.js";
import { QdrantDocumentLoader } from "../documents/qdrant-document-loader.js";
import { PDFLoader } from "../documents/loader/pdf_loader.js";

const qdrantDocumentLoader = await QdrantDocumentLoader.create();
const pdf = new PDFLoader();

// Set up multer middleware to handle file uploads
const upload = multer({
    dest: '/tmp/ilias/uploads/',
    fileFilter: (req, file, cb) => {
      // Check if the file is an epub or pdf file
      if (file.mimetype === 'application/epub+zip' || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('File must be an epub or pdf file'));
      }
    }
  });


export const postUpload = async (req: Request, res: Response): Promise<void> => {
    try {

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        const metadata = {title : undefined, source : undefined, author : undefined}

        if(req.body.title) {
          const title = req.body.title;
          metadata.title = title;
        }

        if(req.body.source) {
          const source = req.body.source;
          metadata.source = source;
        }

        if(req.body.author) {
          const author = req.body.author;
          metadata.author = author;
        }

        const filePath = req.file?.path;

        // Validate the file contents
        const fileContents = fs.createReadStream(filePath);
        const fileType = await FileType.fileTypeFromStream(fileContents);

        if (!fileType || (fileType.mime !== 'application/epub+zip' && fileType.mime !== 'application/pdf')) {
            res.status(400).json({ message: 'Invalid file type' });
            return;
        }

        if(fileType.mime === 'application/pdf') {
            const documents = await pdf.load(filePath);

            for (const doc of documents) {
              doc.metadata.pdf.info.Title = metadata.title ? metadata.title : doc.metadata.pdf.info.Title;
              doc.metadata.pdf.info.Author = metadata.author ? metadata.author : doc.metadata.pdf.info.Author;
              doc.metadata.source = metadata.source ? metadata.source : doc.metadata.source;
            }
            qdrantDocumentLoader.upload(documents)
        }
        
        // Delete the temporary file
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error(err);
        }

        // Return a response indicating the upload was successful
        res.json({ message: 'Upload successful' });
      

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUpload = async (req: Request, res: Response): Promise<void> => {

  const data = {isLoggedIn: false};
  let token = req.headers.authorization?.split(' ')[1];

  if(!token) {
    try {
      token = req.cookies.token;
    } catch (err) {} 
  }
  data.isLoggedIn= await isLoggedIn(token);

  res.render('pages/upload/upload', data);
};

export const uploadMiddleware = upload.single('file');