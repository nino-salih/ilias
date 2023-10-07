import express from 'express';
import { getSearch } from '../controller/searchController.js';

const searchRoute = express.Router();

searchRoute.get('/search', getSearch);   


export default searchRoute;