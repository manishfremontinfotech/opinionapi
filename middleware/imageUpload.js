const multer = require('multer')
const path = require('path')

const imageUpload  = multer({
    // storage: storage,
//    limits:{fileSize: 1000000},
    fileFilter: function(req, file, cb){
        checkFileType(file, cb, req)
    }
}).single('image') //this is name attribute of input in from where file is uploaded


function checkFileType(file, cb, req){
    // allowed exte
    const fileTypes = /image|jpeg|jpg|png|gif/
    //check ext
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase())

    //check mine type
    const mimeType = fileTypes.test(file.mimetype)

    if(mimeType && extname){
        file.fileExtension = path.extname(file.originalname).toLowerCase()
        return cb(null, true)
    } else {
        req.imageUploadError = true
        return cb(null, true)
    }
}

module.exports = imageUpload
