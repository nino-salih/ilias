import express from 'express';
import { getUpload, postUpload, uploadMiddleware } from '../controller/uploadController.js';
import { authenticateMiddleware } from '../controller/authController.js';

const uploadRoute = express.Router();

uploadRoute.post('/upload', authenticateMiddleware, uploadMiddleware ,postUpload);
uploadRoute.get('/upload', getUpload);

export default uploadRoute;