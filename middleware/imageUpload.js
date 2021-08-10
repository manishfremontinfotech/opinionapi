const multer = require('multer')
const path = require('path')

// parse the file recived in form data


/****************************************
 *              *
 *             * *
 *  `         * ! *
 *           *  !  *
 *          *   !   *
 *         *    !    *
 *        *************
    The key name of image must be "image"
****************************************/

const imageUpload  = multer({
    //limit the size of image
    //limits:{fileSize: 1000000},
    fileFilter: function(req, file, cb){
        checkFileType(file, cb, req)
    }
}) //this is name attribute of input in from where file is uploaded

//checking file type
//if error error is stored in req.imageUploadError
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
        return cb(null, false)
    }
}

module.exports = imageUpload
