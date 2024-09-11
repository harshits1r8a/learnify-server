// IMORTS SECTION
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'

import errorMiddleware from './middlewares/error.middleware.js'
import userRouter from './router/user.router.js'


const app = express()


// MIDDLEWARE
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(cors({
    origin : [],
    credentials:true,
}))
app.use(morgan('dev'))







app.use('/ping', (req,res)=>{
    res.send('Pong')
})

// ROUTES OF 3 MODULES
app.use('/api/v1/user', userRouter)





app.all('*',(req, res)=>{
    res.status(200).send(`OPPS 404 error !! PAGE NOT FOUND`)
})

// ERROR DESIGN
app.use(errorMiddleware);

export default app