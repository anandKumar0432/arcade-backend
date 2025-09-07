
import express from 'express'
import cors from 'cors'
import mainRouter from "./routes/index.js"
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
const app = express()
app.use(express.json())
app.use(cors())

app.use("/api/v1",mainRouter);

app.listen(process.env.PORT || 8080);