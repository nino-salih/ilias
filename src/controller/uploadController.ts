import multer from "multer";
import fs from "fs";
import { Request, Response } from "express";
import * as FileType from "file-type"

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
        const filePath = req.file?.path;

        // Validate the file contents
        const fileContents = fs.createReadStream(filePath);
        const fileType = await FileType.fileTypeFromStream(fileContents);

        if (!fileType || (fileType.mime !== 'application/epub+zip' && fileType.mime !== 'application/pdf')) {
            res.status(400).json({ message: 'Invalid file type' });
            return;
        }

        res.send(fileContents);
        
        // Delete the temporary file
        fs.unlinkSync(req.file.path);

        // Return a response indicating the upload was successful
        res.json({ message: 'Upload successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const uploadMiddleware = upload.single('file');

