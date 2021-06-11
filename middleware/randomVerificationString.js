const { v4: uuidv4 } = require('uuid');

//generatin unique string for verifying email
//16 bit string
const generateUUID = () => {
    return uuidv4();
}

module.exports = generateUUID