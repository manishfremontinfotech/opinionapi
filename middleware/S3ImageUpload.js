const AWS =require('aws-sdk')

const upload_to_S3 = async (file, post) => {
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRETE,
        Bucket: `${process.env.AWS_BUCKET_NAME}`,
    })

    const randomNo = await Math.floor(Math.random() * 10000)
    const fileName = `${randomNo}${Date.now()}${file.fileExtension}`
    const params = {
        Key: fileName,
        Body: file.buffer,
        ACL: "public-read"
    } 

    if(post){
        params.Bucket = `${process.env.AWS_BUCKET_NAME}/images/post`
    } else {
        params.Bucket = `${process.env.AWS_BUCKET_NAME}/images/user`
    }

    return new Promise((resolve, reject) => {
        console.log(params)
        s3.upload(params, (error, data) => {
            if(error){
                delete s3
                return resolve([null, error])
            }

            delete s3
            console.log(data)
            resolve([data, null])
        })
    })
}

const delete_from_S3 = (key) => {
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRETE,
        Bucket: `${process.env.AWS_BUCKET_NAME}`,
    })
    console.log(key)

    var params = {
        Bucket:`${process.env.AWS_BUCKET_NAME}`,
        Key: key
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