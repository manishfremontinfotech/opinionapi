const { admin, notification_options } = require("./config");

 const sendNotification = (registrationToken, message)=>{
    admin.messaging().sendToDevice(registrationToken, message, notification_options)
        .then( response => {
            console.log("Notification sent:", response)
        })
        .catch( error => {
            console.log(error);
        })
}

module.exports = sendNotification