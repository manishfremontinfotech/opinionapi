var admin = require("firebase-admin");
//uncomment when using firebase
//also uncomment in ../routers/userrouter.js

 var serviceAccount = require("./secretefile.json");

admin.initializeApp({
   credential: admin.credential.cert(serviceAccount)
 });

const notification_options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
};


//extra options if required
// type notification_options = {
//     dryRun?: boolean;
//     priority?: string; // normal or high
//     timeToLive?: number; // in second
//     collapseKey?: string;
//     mutableContent?: boolean;
//     contentAvailable?: boolean;
//     restrictedPackageName?: string;
//     [key: string]: any | undefined;
// };

module.exports = {admin, notification_options}

