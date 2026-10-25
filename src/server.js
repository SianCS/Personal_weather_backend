import 'dotenv/config'
import app from "./app.js"
import shutdown from './utils/shutdown.util.js'




const PORT = process.env.PORT || 8000


app.listen(PORT , ()=> console.log(`Server Running on:`, PORT))

process.on("SIGINT", ()=>	shutdown('SIGINT'))
process.on("SIGTERM", ()=>	shutdown('SIGTERM'))

process.on("uncaughtException", (err)=>	shutdown('uncaughtException', err))
process.on("unhandledRejection", (reason)=>	shutdown('unhandledRejection', reason))