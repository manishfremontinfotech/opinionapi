require('dotenv').config()
const fs = require('fs');
const https = require('https')
const app = require('./expressJSSetup/setup')

https.createServer({
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
    ca : fs.readFileSync('./ssl/csr.pem'),
    passphrase: '1998'
},app).listen(process.env.PORT, ()=> {
    console.log(`API is running on PORT ${process.env.PORT}`)
})