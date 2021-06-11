var bcrypt = require('bcryptjs');

//bcrypt password using salt
const bcryptPass = async (pass) => {
    return bcrypt.hashSync(pass, process.env.SALT);
}

module.exports = bcryptPass