const AWS =require('aws-sdk')

//uploading image to s3 and retruning promise
//if success
//return [error, null]
//if error
//return [null, result]
const upload_to_S3 = async (file, post) => {

    let s3
    if(post){
        s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ID,
            secretAccessKey: process.env.AWS_SECRETE,
            Bucket: `${process.env.AWS_BUCKET_POST}`,
        })
    } else {
        s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ID,
            secretAccessKey: process.env.AWS_SECRETE,
            Bucket: `${process.env.AWS_BUCKET_USER}`,
        })
    }

    const randomNo = await Math.floor(Math.random() * 10000)
    const fileName = `${randomNo}${Date.now()}${file.fileExtension}`
    
    let params
    if(post){
        params = {
            Key: fileName,
            Body: file.buffer,
            ACL: "public-read",
            Bucket :`${process.env.AWS_BUCKET_POST}`
        }
    } else {
        params = {
            Key: fileName,
            Body: file.buffer,
            ACL: "public-read",
            Bucket : `${process.env.AWS_BUCKET_USER}`
        }
    }

    return new Promise((resolve, reject) => {
        console.log(params)
        s3.upload(params, (error, data) => {
            if(error){
                console.log(error)
		delete s3
                return resolve([null, error])
            }

            delete s3
            console.log(data)
            resolve([data, null])
        })
    })
}

const delete_from_S3 = (key, post) => {
    let s3
    if(post){
        s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ID,
            secretAccessKey: process.env.AWS_SECRETE,
            Bucket: `${process.env.AWS_BUCKET_POST}`,
        })
    } else {
        s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ID,
            secretAccessKey: process.env.AWS_SECRETE,
            Bucket: `${process.env.AWS_BUCKET_USER}`,
        })
    }

    console.log(key)

    let params
    if(post){
        params = {
            Key: key,
            Bucket :`${process.env.AWS_BUCKET_POST}`
        }
    } else {
        params = {
            Key: key,
            Bucket :`${process.env.AWS_BUCKET_USER}`
        }
    }

    
    s3.deleteObject(params, function (err, data) {
        if (data) {
            console.log("File deleted successfully");
            delete s3
            console.log(data)
        }
        else {
            console.log("Check if you have sufficient permissions : "+err);
            delete s3
        }
    })
}



module.exports = {upload_to_S3, delete_from_S3}

