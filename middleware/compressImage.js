const sharp = require('sharp');

//copressing image using sharp
//size can changed using widht and height as fucntion parameter
//if success return compressed buffer
//if error return original buffer
const compress = async (buffer, width, height) => {
    
    return await sharp(buffer).resize(width||320, height||240).toBuffer()
        .then( data => { 
            return data
        })
        .catch( err => {
            console.log(err)
            return buffer
        })
}

module.exports = compress