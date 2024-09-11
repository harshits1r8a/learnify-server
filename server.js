 
// IMPORTS
import dotenv from 'dotenv'; 
dotenv.config(); 
import { v2 as cloudinary } from 'cloudinary';

import app from './app.js'
import connectionToDB from './config/dbConnection.js';


const PORT = process.env.PORT || 4001

cloudinary.config({
     
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
})

app.listen(PORT, async()=>{
    await connectionToDB()
    console.log(`Server is listening at http://localhost:${PORT}`);
})