// Variables necesarias para utilizar MongoDB
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const dbURL = "mongodb://localhost:27017"

/**
 * Valida usuario y clave al hacer login
 * 
 * 
 * @param {string} user 
 * @param {string} password 
 * @param {function} cbOK 
 * @param {function} cbErr 
 */
function validarUsuario(user, password, cbOK, cbErr) {
    //conección de la base de datos en MongoDB
    MongoClient.connect(dbURL, (err, client) => {
        //definición del nombre de la base de datos a utilizar
        const db = client.db("testdb");
        //definición del nombre de la coleccion a utilizar
        const collUser = db.collection("users");
        //Busco dentro de la coleccion las coincidencias de username y password con los datos que el usuario ingresó
        collUser.find({ username: user, password: password }).toArray((err, data) => {
            if (data.length == 1) {
                //Si hay una y solo una coincidencia, se llama a la funcion cbOK 
                //(callback de la función a realizar en caso de un ingreso correcto)
                cbOK();
            } else {
                //Si no hay coincidencias, o hay mas de una, se dispara el callback de error en el inicio de sesion
                cbErr();
            }
            //Cierra la conexion con la base de datos
            client.close();
        })

    })


}

/**
 * 
 * Registra usuarios nuevos en la Base de Datos
 * 
 * @param {string} user 
 * @param {string} password 
 * @param {function} cbOK 
 * @param {function} cbErr 
 * @param {function} cbVacio 
 */

function registrarUsuario(user, password, cbOK, cbErr, cbVacio) {
    //Conección con la base de datos de MongoDB
    MongoClient.connect(dbURL, (err, client) => {
        //definición del nombre de la base de datos
        const db = client.db("testdb");
        //definicion del nombre de la colección a utilizar
        const collUser = db.collection("users");
        //si se ingresaron datos al realizar el registro...
        if (user != undefined || user != '' && password != '' || password != undefined) {
            //se buscan coincidencias en username y password con los datos ingresados por el usuario
            collUser.find({ username: user, password: password }).toArray((err, data) => {
                if (data.length == 0) {
                    //si no hay datos iguales existentes, se insertan dichos datos a la colección
                    collUser.insert({
                            username: user,
                            password: password
                        })
                        //Llamo a la funcion cbOK, en respuesta de un registro exitoso
                    cbOK();
                    //cierro la base de datos
                    client.close()
                } else {
                    //Llamo a la callback de error, en respuesta de un registro fallido
                    cbErr();
                    //cierro la base de datos
                    client.close()
                }
            })
        } else {
            /*si no existen datos ingresados por el usuario, se llama al callback "vacio". en respuesta a un formulario de registro
            sin datos*/
            cbVacio();
            //cierro la base de datos
            client.close()
        }
    })
}


//exportación de las funciones necesarias para server.js
module.exports.validarUsuario = validarUsuario;
module.exports.registrarUsuario = registrarUsuario;