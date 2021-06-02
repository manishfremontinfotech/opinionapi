const sharp = require('sharp');

const compress = async (buffer, width, height) => {
    return await sharp(buffer).resize(320, 240).toBuffer()
        .then( data => { 
            return data
        })
        .catch( err => {
            console.log(err)
            return buffer
        })
}

module.exports = compress