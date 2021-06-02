const express = require('express')
const userRouter = require('../routers/userRouter')
const app = express()
const cors = require('cors')
const pool = require('../dbConnection')

//cross origin requests
app.use(cors())

//Json parser for reading post request data
app.use(express.json())
app.use(express.urlencoded({extended:false}))


//basic route to check if api is working
app.get('/', async (req, res) => {
    try{
        let response
        await pool.getConnection((err, connection) => {
            //checking if any errors
            if(err){
                console.log(err)
                return res.send({error:{message:'Failed to connect to database', details: err}})
            }

            connection.release()
            res.status(505).send({message:"Upwork Test API, database connection test successfull.", response})
        })
        
    } catch(e) {
        console.log(e)
        res.status(505).send({error:{message:'This is an internal app error'}})
    }
})


//user relates routes
app.use('/', userRouter)

module.exports = app