import express from 'express';
import { getLogin, getRegister, postlogin, postRegister } from '../controller/authController.js';

const authRoute = express.Router();

authRoute.get('/login', getLogin);   
authRoute.get('/register', getRegister);

authRoute.post('/login', postlogin);
authRoute.post('/register', postRegister);

export default authRoute;