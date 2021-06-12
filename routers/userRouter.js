const router = require('express').Router()

const validator = require('validator')
const sanitizeHtml = require('sanitize-html')

//function for calling procedures in db
const DBProcedure = require('../middleware/callDBProcedures')
//function for uploding and deleteing form S3 bucket
const {upload_to_S3, delete_from_S3} = require('../middleware/S3ImageUpload')

//list of country codes
const countryCode = require('../middleware/countryCodes')

//multer middleware for image upload to nodejs
const imageUpload = require('../middleware/imageUpload')
//image compression middleware
//const compressImage = require('../middleware/compressImage')

//uncomment it when using notification
//also uncomment the firebase setup 
const sendNotification = require('../firebaseSetup/sendNotification')
//generate unique link for verificaton
const generateUUID = require('../middleware/randomVerificationString')
//ses mail service
const { sendEmail } = require('../middleware/verificationMail')
//pages for verficaiton status
const {success, failed} = require('./verificationTemplet')
//fucntion for bcrytping password
const bcryptPass = require('../middleware/bcryptPass')


router.post('/addEmail', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, pWord} = body
        UserEmail = sanitizeHtml(UserEmail)

        //check if anything feild missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!pWord || pWord == '' || pWord == 'undefined'){
            missing.push('pWord')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                },
                data:req.body
            })
        }

        //generating verifing string
        const LINK = await generateUUID()
        //bcrypting password
        pWord = await bcryptPass(pWord)

        //calling database
        const query = `CALL AddEmail("${UserEmail}","${pWord}",@status, "${LINK}"); SELECT @status;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            //if user created sending verification mail
            if(results[1][0]['@status'])
                sendEmail(UserEmail, LINK)

            res.send({
                status: results[1][0]['@status']
            })

        })
    
    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//************************************************************************************** */
router.get('/verifyEmail/:link', async (req, res) => {
    try{
        const Link = req.params.link
        //chekcing if link present
        if(!Link || Link == '' || Link == 'undefined'){
            return res.send(failed)
        }

        //calling database
        const query = `CALL VerifyEmail("${Link}",@status); SELECT @status;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.send(failed)
            }

            if(results[1][0]['@status'] != 1)
                return res.send(failed)

            res.send(success)

        })
    
    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/addUser', imageUpload, async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, UserName, Phone, CountryCode, Password} = body
        UserName = sanitizeHtml(UserName)
        UserEmail = sanitizeHtml(UserEmail)

        //Checking if any of feild is missing
        const missing = []
        if(!UserName || UserName == '' || UserName == 'undefined'){
            missing.push('UserName')
        }
        if(!Phone || Phone == '' || !validator.isNumeric(Phone) || Phone.toString().length != 10 ){
            missing.push('Phone')
        }
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!Password || Password == '' || Password == 'undefined'){
            missing.push('Password')
        }
        if(!CountryCode || !countryCode.includes(Number(CountryCode))){
            missing.push('CountryCode')
        }
        if(!req.file || req.imageUploadError){
            missing.push('Photo')
        }
        if(!body.pushNotification|| body.pushNotification == ""){
            missing.push('pushNotificationToken')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                },
                data:req.body
            })
        }

        //resize image
       //req.file.buffer = await compressImage(req.file.buffer, 200, 200)

        /* Uplading to bucket S3 */
        const [s3data, error] = await upload_to_S3(req.file, false)
        if(error){
            return res.status(502).send({
                error:{
                    message:'Fail to upload image to storage.',
                    missing,
                }
            })
        }

        //bcryting password
        Password = await bcryptPass(Password)
        const Photo = s3data.Location
        const pushNotification = body.pushNotification || 'NULL'
        const googleSignIn = body.googleSignIn || "NULL"
        const facebookSignIn = body.facebookSignIn || "NULL"

        //calling database
        const query = `CALL AddUser("${UserEmail}","${UserName}","${Phone}",${CountryCode}, "${Photo}", @status, "${Password}","${pushNotification}","${googleSignIn}", "${facebookSignIn}"); SELECT @status;`
        DBProcedure(query, (error, results) => {
            if(error){
                delete_from_S3(s3data.Key, false)
                return res.status(error.status).send(error.response)
            }

            //delete image form bucket if procedure failed
            if(results[1][0]['@status'] != 1){
                delete_from_S3(s3data.Key, false)
            }
            res.send({
                status: results[1][0]['@status']
            })

        })
    
    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/addFriend', async (req, res) => {
    try{
        
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, FriendEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!FriendEmail || FriendEmail == '' || !validator.isEmail(FriendEmail)){
            missing.push('FriendEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL AddFriend("${UserEmail}","${FriendEmail}",@status,"${Pword}", @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({ 
                status:results[1][0]['@status'],
            })

            //firebase notification
            if(results[1][0]['@status'] == 1 && results[1][0]['@message'] && results[1][0]['@NotiToakn']){
                // ****************************** 
                //  Firebase Notification
                //  results[1][0]['@message']
                //  results[1][0]['@NotiToakn']
                //  ******************************
                 const  registrationToken = results[1][0]['@NotiToakn']
                 const message = {
                         notification: {
                             title: "Friend Request",
                             body: results[1][0]['@message'].toString()||"New friend request"
                         }
                     }

                 sendNotification(registrationToken, message)
            }

        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/addFriendRequest', async (req, res) => {
    try{
        
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, FriendEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!FriendEmail || FriendEmail == '' || !validator.isEmail(FriendEmail)){
            missing.push('FriendEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL AddFriendRequest("${UserEmail}","${FriendEmail}",@status,"${Pword}", @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({ 
                status:results[1][0]['@status'],
            })

            //firebase notification
            if(results[1][0]['@status'] == 1 && results[1][0]['@message'] && results[1][0]['@NotiToakn']){
                // ****************************** 
                //  Firebase Notification
                //  results[1][0]['@message']
                //  results[1][0]['@NotiToakn']
                //  ******************************
                 const  registrationToken = results[1][0]['@NotiToakn']
                 const message = {
                         notification: {
                             title: "Friend Request",
                             body:results[1][0]['@message'].toString() || "Friend Request"
                         }
                     }

                 sendNotification(registrationToken, message)
            }

        })    

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

// ******************************************************************************
router.post('/addPost', imageUpload, async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail , Question, Rating, Comment, Pword, emails} = body

        UserEmail = sanitizeHtml(UserEmail)
        Question = sanitizeHtml(Question)
        Comment = sanitizeHtml(Comment)

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        // if(!PhotoLink || PhotoLink == '' /* ||!validator.isURL(PhotoLink) */){
        //     missing.push('PhotoLink')
        // }
        if(!Question || Question == ''){
            missing.push('Question')
        }
        if(!Rating || !validator.isNumeric(Rating)){
            missing.push('Rating')
        }
        if(!Comment || Comment == ''){
            missing.push('Comment')
        }
        if(!req.file || req.imageUploadError){
            missing.push('Photo')
        }
        if(!Pword || Pword == ''){
            missing.push('Pword')
        }
        
        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //resize image
       // req.file.buffer = await compressImage(req.file.buffer, 200, 200)

        /* Uplading to bucket S3 */
        const [s3data, error] = await upload_to_S3(req.file, true)
        if(error){
            return res.status(502).send({
                error:{
                    message:'Fail to upload image to storage',
                }
            })
        }


        const PhotoLink = s3data.Location
        const Attachment = "http://xxxxxxxxx"

        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL AddPost("${UserEmail}", "${PhotoLink}", "${Question}", ${Rating}, "${Comment}", "${Attachment}", "${Pword}", @status, @lastId); SELECT @status, @lastId;`
        DBProcedure(query, (error, results) => {
            if(error){
                delete_from_S3(s3data.Key, true)
                return res.status(error.status).send(error.response)
            }

            //delete image form bucket if procedure failed
            if(results[1][0]['@status'] != 1){
                delete_from_S3(s3data.Key, true)
                return res.send({
                    status: results[1][0]['@status']
                })
            }

            let PostId = results[1][0]['@lastId']
            res.send({
                status: results[1][0]['@status'],
		        PostId 
            })

            //notificaiton to requested responders
            let emailProcedure = ``
            emails.forEach(email => {
                emailProcedure += `CALL AddRespondersToPosts(${PostId}, "${email}", @status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
            })

            DBProcedure(emailProcedure, (error, resultsArray) => {
                if(error){
                    return
                }

                    //firebase notification
/*                for(let i = 1;i < resultsArray.length;i=i+2){
                    //console.log("Inner Result :::: ", resultsArray[i][0])
                    if(resultsArray[i][0]['@status'] == 1 && resultsArray[i][0]['@message'] && resultsArray[i][0]['@NotiToakn']){
                        // ****************************** 
                        //  Firebase Notification
                        //  resultsArray[i][0]['@message']
                        //  resultsArray[i][0]['@NotiToakn']
                        //  ******************************
                        // const  registrationToken = resultsArray[i][0]['@NotiToakn']
                        // const message = {
                        //         notification: {
                        //             title: "Friend Request",
                        //             body: "Friend Request"//resultsArray[i][0]['@message'].toString()
                        //         }
                        //     }
        
                        // sendNotification(registrationToken, message)
                    }
                } */
            })

        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})


// ******************************************************************************
//uncomment attachment code
//for fututre
router.post('/addResponse', /* imageUpload, */ async (req, res) => {
    try{
        
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, postId, Rating, Comment, Pword} = body

        Comment = sanitizeHtml(Comment)

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!postId || !validator.isNumeric(postId.toString())){
            missing.push('postId')
        }
        if(!Rating || !validator.isNumeric(Rating.toString())){
            missing.push('Rating')
        }
        if(!Comment || Comment == ''){
            missing.push('Comment')
        }
        // if(!req.file || req.imageUploadError){
        //     missing.push('Attachment')
        // }
        if(!Pword || Pword == ''){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const Attachment = "http://xxxxxxxxx"
        
        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL AddResponse("${UserEmail}", "${postId}", ${Rating}, "${Comment}", "${Attachment}", "${Pword}", @status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({ 
                status:results[1][0]['@status'],
            })
            
        }) 

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/cancelFriendRequest', async (req, res) => {
    try{
        
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, FriendEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!FriendEmail || FriendEmail == '' || !validator.isEmail(FriendEmail)){
            missing.push('FriendEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL CancelFriendRequest("${UserEmail}","${FriendEmail}","${Pword}",@status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({ 
                status:results[1][0]['@status'],
            })

            //firebase notification
            if(results[1][0]['@status'] == 1 && results[1][0]['@message'] && results[1][0]['@NotiToakn']){
                // ****************************** 
                //  Firebase Notification
                //  results[1][0]['@message']
                //  results[1][0]['@NotiToakn']
                //  ******************************
                // const  registrationToken = results[1][0]['@NotiToakn']
                // const message = {
                //         notification: {
                //             title: "Friend Request",
                //             body: "Friend Request"//results[1][0]['@message'].toString()
                //         }
                //     }

                // sendNotification(registrationToken, message)
            }

        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/getResponseForAllPostsOfUser', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        const query = `
            CALL GetResponseForAllPostsOfUser("${UserEmail}", "${Pword}", @status); SELECT @status;
            SELECT UserEmail, postId, photoLink, question, ownrating, OwnComments, NoOfResponses, time FROM TempUsersAllPosts WHERE UserEmail="${UserEmail}";
            SELECT postId, ResponserEmail, Rating, Comment, time, attachment FROM TempResponses WHERE UserEmail="${UserEmail}";
            DELETE FROM TempUsersAllPosts WHERE UserEmail="${UserEmail}";
            DELETE FROM TempResponses WHERE UserEmail="${UserEmail}";
        `
        //calling database
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            // if status 0 sending only status
            if(results[1][0]['@status'] != 1){
                return res.send({
                    status:results[1][0]['@status'],
                })
            }
            res.send({ 
                status:results[1][0]['@status'],
                post:results[2],
                responses: results[3]
            })
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

// ****************************************************************************
router.post('/getResponseForPost', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 
        let { PostId, UserEmail} = body

        //Checking if any of feild is missing
        const missing = []
        if(!PostId || PostId == '' || !validator.isNumeric(PostId.toString())){
            missing.push('PostId')
        }
        if(!UserEmail || !validator.isEmail(UserEmail)) {
            missing.push('UserEmail')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        // const query = `
        //     CALL GetResponseForPost(${PostId});
        //     SELECT UserEmail, postId, photoLink, question, ownrating, OwnComments, NoOfResponses, time FROM TempUsersAllPosts WHERE postId=${PostId};
        //     SELECT postId, ResponserEmail, Rating, Comment, time, attachment FROM TempResponses WHERE postId=${PostId};
        //     DELETE FROM TempUsersAllPosts WHERE postId=${PostId};
        //     DELETE FROM TempResponses WHERE postId=${PostId};
        // `

        const query = `
            CALL GetResponseForPost(${PostId}, "${UserEmail}");
            SELECT postId, ResponserEmail, Rating, Comment, time, attachment FROM TempResponses WHERE postId=${PostId};
            DELETE FROM TempResponses WHERE postId=${PostId};
        `
        //calling database
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({
                    tempResponse:results[1]
            })

        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/getUserFriends', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        const query = `
            CALL GetUserFriends("${UserEmail}", "${Pword}");
            SELECT userMail, FriendEmailId, FriendName, FriendPhotoLink, FriendRequestEmailId, FriendRequestName, FriendRequestPhotoLink, Sent_Recieved FROM TempFriendList WHERE userMail="${UserEmail}";
            DELETE FROM TempFriendList WHERE userMail="${UserEmail}";
        `
        //calling database
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({
                freindsList:results[1]
            })

        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

// ****************************************************************************
router.post('/getUsers', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { FirstPara, SecondPara, offset} = body

        //Checking if any of feild is missing
        const missing = []

        if(FirstPara){
            SecondPara = " "
        } else if(SecondPara){
            FirstPara = " "
        } else {
            missing.push('FirstPara')
            missing.push('SecondPara')
        }

        if(!offset || !validator.isNumeric(offset.toString())){
            offset = 0
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `
            CALL getUsers("${FirstPara}", "${SecondPara}", ${Number(offset)});
            SELECT userMail, name, photoLink FROM TempNames WHERE userMail="${FirstPara}";
            DELETE FROM TempNames WHERE userMail="${FirstPara}";
        `
        //calling database
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            //console.log(results[1])
            res.send({
                freindsList:results[1]
            })
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

//*********************************************************************************************** */
router.post('/rejectFriendRequest', async (req, res) => {
    try{
        
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, FriendEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!FriendEmail || FriendEmail == '' || !validator.isEmail(FriendEmail)){
            missing.push('FriendEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL RejectFriendRequest("${UserEmail}","${FriendEmail}","${Pword}",@status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            //console.log(results)
            res.send({ 
                status:results[1][0]['@status'],
            })

            if(results[1][0]['@status'] == 1 && results[1][0]['@message'] && results[1][0]['@NotiToakn']){
                // ****************************** 
                //  Firebase Notification
                //  results[1][0]['@message']
                //  results[1][0]['@NotiToakn']
                //  ******************************
                // const  registrationToken = results[1][0]['@NotiToakn']
                // const message = {
                //         notification: {
                //             title: "Friend Request",
                //             body: "Friend Request"//results[1][0]['@message'].toString()
                //         }
                //     }

                // sendNotification(registrationToken, message)
            }
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})


//*********************************************************************************************** */
router.post('/removeFriend', async (req, res) => {
    try{
        
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, FriendEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!FriendEmail || FriendEmail == '' || !validator.isEmail(FriendEmail)){
            missing.push('FriendEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        //calling database
        const query = `CALL RemoveFriend("${UserEmail}","${FriendEmail}","${Pword}",@status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            res.send({ 
                status:results[1][0]['@status'],
            })

            //firebase notificaiton
            if(results[1][0]['@status'] == 1 && results[1][0]['@message'] && results[1][0]['@NotiToakn']){
                // ****************************** 
                //  Firebase Notification
                //  results[1][0]['@message']
                //  results[1][0]['@NotiToakn']
                //  ******************************
                // const  registrationToken = results[1][0]['@NotiToakn']
                // const message = {
                //         notification: {
                //             title: "Friend Request",
                //             body: "Friend Request"//results[1][0]['@message'].toString()
                //         }
                //     }

                // sendNotification(registrationToken, message)
            }
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})


//*********************************************************************************************** */
router.post('/removeUser', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserEmail || UserEmail == '' || !validator.isEmail(UserEmail)){
            missing.push('UserEmail')
        }
        if(!Pword || Pword == '' || Pword == 'undefined'){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)

        //calling database
        const query = `CALL RemoveUser("${UserEmail}", "${Pword}", @status); SELECT @status;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            //console.log(results)
            res.send({ 
                status:results[1][0]['@status'],
            })
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})


// ***********************************************************************
router.post('/UpdateUser', imageUpload, async (req, res) => {
    try{

        const body = JSON.parse(JSON.stringify(req.body)) 

        let { name, userNewEmail, userNewPhone, userNewName, userOldEmail, userNewPassword, userNewCountryCode, pWord } = body
        UserName = sanitizeHtml(userNewName)
        UserEmail = sanitizeHtml(userNewEmail)

        //Checking if any of feild is missing
        const missing = []
        if(!name || name == '' || name == 'undefined'){
            missing.push('name')
        }
        if(!userNewName || userNewName == '' || userNewName == 'undefined'){
            missing.push('userNewName')
        }
        if(!userNewEmail || userNewEmail == '' || !validator.isEmail(userNewEmail)){
            missing.push('userNewEmail')
        }
        if(!userOldEmail || userOldEmail == '' || !validator.isEmail(userOldEmail)){
            missing.push('userOldEmail')
        }
        if(!userNewPhone || userNewPhone == '' || !validator.isNumeric(userNewPhone) || userNewPhone.toString().length != 10 ){
            missing.push('userNewPhone')
        }
        if(!userNewPassword || userNewPassword == '' || userNewPassword == 'undefined'){
            missing.push('userNewPassword')
        }
        if(!pWord || pWord == '' || pWord == 'undefined'){
            missing.push('pWord')
        }
        if(!userNewCountryCode || !countryCode.includes(Number(userNewCountryCode))){
            missing.push('userNewCountryCode')
        }
        if(!req.file || req.imageUploadError){
            missing.push('userNewPhoto')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                },
                data:req.body
            })
        }

        //resize image
      	//req.file.buffer = await compressImage(req.file.buffer, 200, 200)

        /* Uplading to bucket S3 */
        const [s3data, error] = await upload_to_S3(req.file, false)
        if(error){
            return res.status(502).send({
                error:{
                    message:'Fail to upload image to storage.',
                    missing,
                }
            })
        }
        const userNewPhoto = s3data.Location

        //bcrypting password
        pWord = await bcryptPass(pWord)
        //calling database
        const query = `CALL UpdateUser("${name}","${userNewEmail}","${userNewPhoto}","${userNewPhone}", "${userNewName}", "${userOldEmail}", "${userNewPassword}", ${userNewCountryCode}, "${pWord}", @status);`
        DBProcedure(query, (error, results) => {
            if(error){
                //deleteing from bucket if any error occur
                delete_from_S3(s3data.Key)
                return res.status(error.status).send(error.response)
            }

            //console.log(results)
            res.send({ 
                status:1,
            })
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})


//*********************************************************************************************** */
router.post('/getUserProfile', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserSingUpId, pWord} = body

        //Checking if any of feild is missing
        const missing = []
        if(!UserSingUpId || UserSingUpId == '' || !validator.isEmail(UserSingUpId)){
            missing.push('UserSingUpId')
        }
        if(!pWord || pWord == '' || pWord == 'undefined'){
            missing.push('pWord')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(400).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        pWord = await bcryptPass(pWord)
        //calling database
        const query = `CALL GetUserProfile("${UserSingUpId}", "${pWord}", @status, @PhoneNumber, @country, @photo, @emailId, @name); SELECT @status, @status, @PhoneNumber, @country, @photo, @emailId, @name;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            console.log(results)
            res.send({
                status:results[1][0]['@status'],
                phoneNumber:results[1][0]['@PhoneNumber'],
                country:results[1][0]['@country'],
                emailId:results[1][0]['@emailId'],
                name:results[1][0]['@name'],
                photo:results[1][0]['@photo']
            })
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})


//*********************************************************************************************** */
router.post('/getAnalyticsData', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { StartDate, Endate, Pword} = body

        //Checking if any of feild is missing
        const missing = []
        if(!StartDate || StartDate == ''){
            missing.push('StartDate')
        }
        if(!Endate || Endate == ''){
            missing.push('Endate')
        }
        if(!Pword || Pword == ''){
            missing.push('Pword')
        }

        //If anything missing sending it back to user with error
        if(missing.length){
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //bcrypting password
        Pword = await bcryptPass(Pword)
        const query = `
            CALL GetAnalyticsData("${StartDate}", "${Endate}", ${Pword});
            Select * from TempAnalyticsData
        `
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            console.log(results)
            res.send({
                TempAnalyticsData: results[1],
                msg:"done"
            })
        })

    } catch(e) {
        //Network or internal errors
        console.log(e)
        res.status(500).send({error:{message:"API internal error, refer console for more information."}})
    }
})

module.exports = router
