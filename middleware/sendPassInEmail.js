const AWS = require('aws-sdk');

//sending mail to given email using ses
const SES_CONFIG = {
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRETE,
    region: process.env.AWS_REGION,
};

const AWS_SES = new AWS.SES(SES_CONFIG);

let sendPassInEmail = (recipientEmail, pass) => {
	console.log(recipientEmail, pass)
    let params = {
      Source: process.env.AWS_SES_EMAIL,
      Destination: {
        ToAddresses: [
          recipientEmail
        ],
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Opinion</title>
            </head>
            <body>
                Here is your new password for tempory login and change your password
                <h1>${pass}</h1>
		
            </body>
            </html>`,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: `Hello, verification mail`,
        }
      },
    };
    return AWS_SES.sendEmail(params).promise();
};

let sendTemplateEmail = (recipientEmail) => {
    let params = {
      Source: '<email address you verified>',
      Template: '<name of your template>',
      Destination: {
        ToAddresse: [ 
          recipientEmail
        ]
      },
      TemplateData: '{ \"name\':\'John Doe\'}'
    };
    return AWS_SES.sendTemplatedEmail(params).promise();
};

module.exports = {
    sendPassInEmail,
  sendTemplateEmail,
};
