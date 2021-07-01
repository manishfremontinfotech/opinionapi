const pool = require('../dbConnection')
//calling database quiries 
//as result callback is called with 
// error as error and result as null in case of error
// error as null and result as resluts array if successfull


const DBProcedure = async (query, data, callback) => {
    await pool.getConnection((err, connection) => {
            //checking if any errors
            if(err){
                console.log(err)
                return callback({
                    response: {
                        error:{
                            message:'Failed to connect to database.'
                        }
                    },
                    status:500
                }, null)
            }

            connection.query(query, data, function (error, results, fields) {
                //checking if any error
                if (error) {
                    console.log("Error in Database >>>>>>>>>>>>>>>>>", error)
                    return callback({
                        response: {
                            error:{
                                message:'Database failed to execute query.'
                            }
                        },
                        status:502
                    }, null)

                }
                
                //disconnecting form database and send success respose
                connection.release()
                callback(null, results)
            })
        })
    }

module.exports = DBProcedure
