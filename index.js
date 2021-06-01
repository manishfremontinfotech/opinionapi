require('dotenv').config()
const app = require('./expressJSSetup/setup')

//listing on prot derfined
app.listen(process.env.PORT, () => {
    console.log(`app is running on PORT: ${process.env.PORT}`)
})