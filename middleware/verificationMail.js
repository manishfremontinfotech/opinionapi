const AWS = require('aws-sdk');

//sending mail to given email using ses
const SES_CONFIG = {
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRETE,
    region: process.env.AWS_REGION,
};

const AWS_SES = new AWS.SES(SES_CONFIG);

let sendEmail = (recipientEmail, LINK) => {
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
                <title>Document</title>
            </head>
            <body>
                Hello click on verify to verify
                <a href="${process.env.BASE_URL}/verifyEmail/${LINK}">verify</a>
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
  sendEmail,
  sendTemplateEmail,
};