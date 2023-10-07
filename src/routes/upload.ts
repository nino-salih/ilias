import express from 'express';
import { postUpload } from '../controller/uploadController.js';
import { authenticateMiddleware } from '../controller/authController.js';

const router = express.Router();

router.post('/upload', authenticateMiddleware, postUpload);

export default router;