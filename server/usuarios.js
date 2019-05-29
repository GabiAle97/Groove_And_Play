const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

const dbURL = "mongodb://localhost:27017"

/**
 * Valida usuario y clave
 * 
 * @param {string} user Usuario
 * @param {string} password Clave
 */
function validarUsuario(user, password, cbOK, cbErr) {

    // Se conecta al motor de base de datos
    MongoClient.connect(dbURL, (err, client) => {

        // Trae referencia a la base
        const db = client.db("testdb");

        // Trae referencia a la colección
        const collUser = db.collection("users");

        // Busca todos los documentos en la colección que coincidan con el criterio
        // de username y password enviado.
        collUser.find({ username: user, password: password }).toArray((err, data) => {
            if (data.length == 1) {
                // Si encontró un solo registro con ese usuario y clave, invoco al callback de éxito
                cbOK();
            } else {
                // Si no encontró ninguno o encontró más de uno (que solo sería posible si tengo algún
                // usuario duplicado por error, pero ya que estamos), llamo al callback de error
                cbErr();
            }

            client.close();
        })

    })


}

function registrarUsuario(user, password, cbOK, cbErr, cbVacio) {
    MongoClient.connect(dbURL, (err, client) => {

        // Trae referencia a la base
        const db = client.db("testdb");

        // Trae referencia a la colección
        const collUser = db.collection("users");

        // Busca todos los documentos en la colección que coincidan con el criterio
        // de username y password enviado.
        if (user != undefined || user != '' && password != '' || password != undefined) {
            collUser.find({ username: user, password: password }).toArray((err, data) => {
                if (data.length == 0) {
                    // Si no encontró un registro con ese usuario y clave, invoco al callback de exito
                    collUser.insert({
                        username: user,
                        password: password
                    })
                    cbOK();

                    client.close()
                } else {
                    // Si encontró uno o más de uno (que solo sería posible si tengo algún
                    // usuario duplicado por error), llamo al callback de error
                    cbErr();
                    client.close()
                }
            })
        } else {
            cbVacio();
            client.close()
        }
    })
}

function currentTimeAudioStore(sessionID, currentTimeAudio, cbOK, cbErr) {
    MongoClient.connect(dbURL, (err, client) => {
        const db = client.db("testdb");

        const collUser = db.collection("users");

        if (sessionID != undefined || sessionID != '') {
            collUser.find({ username: sessionID }).toArray((err, data) => {
                if (data.length == 1) {

                    collUser.insert({
                        currentTimeAudio: currentTimeAudio
                    })
                    cbOK();

                    client.close()
                } else {


                    cbErr();
                    client.close()
                }
            })
        }
    })
}

module.exports.validarUsuario = validarUsuario;
module.exports.registrarUsuario = registrarUsuario;
module.exports.currentTimeAudioStore = currentTimeAudioStore;