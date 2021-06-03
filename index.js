require('dotenv').config()
const fs = require('fs');
const https = require('https')
const app = require('./expressJSSetup/setup')

const http = require('http')

//http.createServer(app).listen(80, ()=> {
 //   console.log(`API is running on PORT ${process.env.PORT}`)
//})

/*
https.createServer({
    key: fs.readFileSync('./ssl/manish-key.pem'),
    cert: fs.readFileSync('./ssl/manish-cert.pem'),
    passphrase: 'fairchild'
},app).listen(process.env.PORT, ()=> {
    console.log(`API is running on PORT ${process.env.PORT}`)
})
*/

app.listen(process.env.PORT, ()=> {
    console.log(`API is running on PORT ${process.env.PORT}`)
})
