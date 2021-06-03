const router = require('express').Router()

const validator = require('validator')
const sanitizeHtml = require('sanitize-html')
const DBProcedure = require('../middleware/callDBProcedures')
const {upload_to_S3, delete_from_S3} = require('../middleware/S3ImageUpload')

const countryCode = require('../middleware/countryCodes')
const imageUpload = require('../middleware/imageUpload')
const compressImage = require('../middleware/compressImage')

//uncomment it when using notification
//also uncomment the firebase setup 
//const sendNotification = require('../firebaseSetup/sendNotification')


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

        //resize image
       //req.file.buffer = await compressImage(req.file.buffer, 200, 200)
        /* Uplading to bucket S3 */
        const [s3data, error] = await upload_to_S3(req.file, false)
        if(error){
            return res.status(505).send({
                error:{
                    message:'Fail to upload image to storage.',
                    missing,
                }
            })
        }


        const Photo = s3data.Location
        const pushNotification = body.pushNotification || 'YES'
        const googleSignIn = body.googleSignIn || "xyz-token"
        const facebookSignIn = body.facebookSignIn || "xyz-token"

        const query = `CALL AddUser("${UserEmail}","${UserName}","${Phone}",${CountryCode}, "${Photo}", @status, "${Password}","${pushNotification}","${googleSignIn}", "${facebookSignIn}"); SELECT @status;`
        DBProcedure(query, (error, results) => {
            if(error){
                delete_from_S3(s3data.Key, false)
                return res.status(error.status).send(error.response)
            }

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

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `CALL AddFriend("${UserEmail}","${FriendEmail}",@status,"${Pword}", @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `CALL AddFriendRequest("${UserEmail}","${FriendEmail}",@status,"${Pword}", @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

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
        for (i = 0; i < emails.length; i++) {
            if(!validator.isEmail(emails[i])){
                missing.push(`Responser Email Invalid - ${i}`)
            }
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

        //resize image
       // req.file.buffer = await compressImage(req.file.buffer, 200, 200)
        /* Uplading to bucket S3 */
        const [s3data, error] = await upload_to_S3(req.file, true)
        if(error){
            return res.status(505).send({
                error:{
                    message:'Fail to upload image to storage.',
                    missing,
                }
            })
        }


        const PhotoLink = s3data.Location
        const Attachment = "http://xxxxxxxxx"

        const query = `CALL AddPost("${UserEmail}", "${PhotoLink}", "${Question}", ${Rating}, "${Comment}", "${Attachment}", "${Pword}", @status, @lastId); SELECT @status, @lastId;`
        DBProcedure(query, (error, results) => {
            if(error){
                delete_from_S3(s3data.Key, true)
                return res.status(error.status).send(error.response)
            }

            //console.log("outer Result :::: ", results)
            if(results[1][0]['@status'] != 1){
                delete_from_S3(s3data.Key, true)
                return res.send({
                    status: results[1][0]['@status']
                })
            }

            let PostId = results[1][0]['@lastId']
            res.send({
                status: results[1][0]['@status']
            })

            let emailProcedure = ``
            emails.forEach(email => {
                emailProcedure += `CALL AddRespondersToPosts(${PostId}, "${email}", @status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
            })

            DBProcedure(emailProcedure, (error, resultsArray) => {
                if(error){
                    return
                }

                for(let i = 1;i < resultsArray.length;i=i+2){
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
                }
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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const Attachment = "http://xxxxxxxxx"
        
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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `CALL CancelFriendRequest("${UserEmail}","${FriendEmail}","${Pword}",@status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

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
router.post('/getResponseForAllPostsOfUser', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, Pword} = body

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `
            CALL GetResponseForAllPostsOfUser("${UserEmail}", "${Pword}", @status); SELECT @status;
            SELECT UserEmail, postId, photoLink, question, ownrating, OwnComments, NoOfResponses, time FROM TempUsersAllPosts WHERE UserEmail="${UserEmail}";
            SELECT postId, ResponserEmail, Rating, Comment, time, attachment FROM TempResponses WHERE UserEmail="${UserEmail}";
            DELETE FROM TempUsersAllPosts WHERE UserEmail="${UserEmail}";
            DELETE FROM TempResponses WHERE UserEmail="${UserEmail}";
        `
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            //console.log("results are ::::::::::::::::::::", results)

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

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
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

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `
            CALL GetUserFriends("${UserEmail}", "${Pword}");
            SELECT userMail, FriendEmailId, FriendName, FriendPhotoLink, FriendRequestEmailId, FriendRequestName, FriendRequestPhotoLink FROM TempFriendList WHERE userMail="${UserEmail}";
            DELETE FROM TempFriendList WHERE userMail="${UserEmail}";
        `
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

        let { FirstPara, SecondPara} = body

        //******  what is pword so I can put varification on it */

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

        const query = `
            CALL getUsers("${FirstPara}", "${SecondPara}");
            SELECT userMail, name, photoLLink FROM TempNames WHERE userMail="${FirstPara}";
            DELETE FROM TempNames WHERE userMail="${FirstPara}";
        `
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

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

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

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `CALL RemoveFriend("${UserEmail}","${FriendEmail}","${Pword}",@status, @NotiToakn, @message); SELECT @status, @NotiToakn, @message;`
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
router.post('/removeUser', async (req, res) => {
    try{
        const body = JSON.parse(JSON.stringify(req.body)) 

        let { UserEmail, Pword} = body

        //******  what is pword so I can put varification on it */

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        //resize image
      	//req.file.buffer = await compressImage(req.file.buffer, 200, 200)
        /* Uplading to bucket S3 */
        const [s3data, error] = await upload_to_S3(req.file, false)
        if(error){
            return res.status(505).send({
                error:{
                    message:'Fail to upload image to storage.',
                    missing,
                }
            })
        }
        const userNewPhoto = s3data.Location

        const query = `CALL UpdateUser("${name}","${userNewEmail}","${userNewPhoto}","${userNewPhone}", "${userNewName}", "${userOldEmail}", "${userNewPassword}", ${userNewCountryCode}, "${pWord}");`
        DBProcedure(query, (error, results) => {
            if(error){
                delete_from_S3(s3.Key)
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
            return res.status(403).send({
                error:{
                    message:'Error/missing feilds',
                    missing,
                },
                data:req.body
            })
        }

        const query = `CALL GetUserProfile("${UserSingUpId}", "${pWord}", @status, @PhoneNumber, @country, @photo, @emailId, @name); SELECT @status, @status, @PhoneNumber, @country, @photo, @emailId, @name;`
        DBProcedure(query, (error, results) => {
            if(error){
                return res.status(error.status).send(error.response)
            }

            //console.log(results)
            res.send({
                status:results[1][0]['@status'],
                phoneNumber:results[1][0]['@PhoneNumber'],
                country:results[1][0]['@Country'],
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


module.exports = router
