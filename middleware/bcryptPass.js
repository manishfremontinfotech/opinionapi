var bcrypt = require('bcryptjs');

//bcrypt password using salt
const bcryptPass = async (pass) => {
	console.log(process.env.SALT.toString())
    	//var hash = await bcrypt.hashSync(pass, "DB4334kdfjsdf23kl4j23kjdfklsd");
	return pass
}

module.exports = bcryptPass
