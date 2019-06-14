const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const exphbs = require('express-handlebars');
const querystring = require('querystring');
const expressSession = require('express-session');
const favicon = require('serve-favicon')

//Creo array de objetos global que contiene todas las canciones que existen en el servidor
var playlist = [];

//lista de formatos compatibles
const listaExtImg = ['.jpg', 'jpeg', '.bmp', '.gif', '.png', '.raw'];
const listaExtSound = ['.mp3', '.m4a', '.aac', '.wma', '.wav', '.ogg'];

// favicon para el tag de la pagina
app.use(favicon('./client/favicon.ico'));

//Inicializacion de express Session
app.use(expressSession({
    secret: 'Groove And Play',
    resave: false,
    saveUninitialized: false
}))

//Configuracion Handlebars
app.engine('handlebars', exphbs({
    defaultLayout: 'main-layout',
    layoutsDir: path.join(__dirname, 'views/layout')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


// JS propios
const usuarios = require('./usuarios');


// Middleware de body-parser para json
app.use(bodyParser.json());

// Ruta para recursos est�ticos.
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.urlencoded({ extended: true }));

//Multer para subir archivos
let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './client/files');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// funcion que carga toda la musica que existe en el servidor y la asigna a la lista "playlist" global
function cargarMusicaSubida(playlist) {
    //leo la carpeta "files" en "client"
    fs.readdir('./client/files', (err, usuarios) => {
        //por cada objeto que hay dentro de "files" (detecta carpetas, cada una tiene el nombre de un usuario)...
        usuarios.forEach(usuario => {
            //lee la carpeta con el nombre de usuario
            fs.readdir(`./client/files/${usuario}`, (err, discos) => {
                //por cada objeto que hay dentro de la carpeta del usuario (detecta carpetas, cada una tiene el nombre de un disco que subio)...
                discos.forEach(disco => {
                    //lee la carpeta "audio" que esta dentro de la carpeta con el nombre de disco
                    fs.readdir(`./client/files/${usuario}/${disco}/audio`, (err, temas) => {
                        //por cada audio que lee de esa carpeta
                        temas.forEach(tema => {
                            //registra los datos que fue recolectando en la lista "playlist" global
                            playlist.push({
                                usuario: usuario,
                                disco: disco,
                                tema: tema,
                                url: `../files/${usuario}/${disco}/audio/${tema}`
                            })
                        });
                    })
                });
            })
        });

    })
}

// GET /
app.get('/', (req, res) => {
    //si existe una sesión
    if (req.session.userId) {
        //redirecciona a /home
        res.redirect('/home');
    } else {
        //si no existe una sesion iniciada 
        //se carga la musica del servidor con la funcion cargarMusicaSubida que recibe la lista Playlist global
        if (playlist.length == 0) {
            cargarMusicaSubida(playlist);
        }
        //espera dos segundos a que terminen de cargarse las canciones
        setTimeout(() => {
            //renderiza el handlebars de index pasandole el playlist global como parametro
            res.render('index', {
                title: 'Groove And Play',
                playlist: playlist
            });
        }, 2000);
    }
});

// GET /home
app.get('/home', (req, res) => {
    //se carga la musica del servidor con la funcion cargarMusicaSubida que recibe la lista Playlist global
    if (playlist.length == 0) {
        cargarMusicaSubida(playlist);
    }

    //creo una lista de objetos vacia
    var listaDiscos = []
        //lee la carpeta "files" de "client"
    fs.readdir(`./client/files`, (err, archivos) => {
        //si existen archivos dentro
        if (archivos != undefined && archivos.length > 0) {
            //por cada archivo dentro de la carpeta "files"
            archivos.forEach(Usuario => {
                //lee la carpeta con el nombre de usuario ubicada en "files"
                fs.readdir(`./client/files/${Usuario}`, (err, archivosUsuario) => {
                    //si existen archivos dentro de la carpeta anterior
                    if (archivosUsuario != undefined && archivosUsuario.length > 0) {
                        //por cada objeto que se encuentra
                        archivosUsuario.forEach(Disco => {
                            //registro los datos recolectados en la lista de objetos "listaDiscos"            
                            listaDiscos.push({
                                usuario: Usuario,
                                nombre: Disco
                            });
                        });
                    }
                })
            });
            //renderizo el handlebars de home con los parametros de usuario, listaDiscos y playlist
            res.render('home', {
                title: 'Groove And Play - Noticias',
                usuario: req.session.userId,
                listaDiscos: listaDiscos,
                playlist: playlist
            })

        } else {
            //renderizo el handlebars de gallery-NoFile con los parametros de usuario, listaDiscos y playlist
            res.render('home-NoFile', {
                title: 'Groove And Play - No hay discos subidos al servidor',
                usuario: req.session.userId,
                listaDiscos: listaDiscos,
                playlist: playlist
            })
        }
    })
});

// GET /registro
app.get('/registro', (req, res) => {
    //renderizo el handlebars de register con el Playlist global como parametro
    res.render('register', {
        title: "Groove And Play - Registrarse",
        playlist: playlist
    })
});


//POST /signin
app.post('/signin', upload.single("file"), (req, res) => {
    //Si el form tiene el campo "user" y "password" rellenados
    if (req.body.user !== undefined && req.body.password !== undefined) {
        console.log(req.file);
        //lee la carpeta del usuario que se encuentra en "client"
        fs.mkdir(`./client/${req.body.user}`, () => {
            console.log("cree carpeta " + req.body.user);
            //espero un segundo y muevo el archivo de la foto de perfil a la carpeta generada del usuario, luego borro el archivo original subido en "client/files"
            setTimeout(() => {
                fs.createReadStream(`./client/files/` + req.file.filename).pipe(fs.createWriteStream(`./client/${req.body.user}/user.jpg`));
                fs.unlink((`./client/files/` + req.file.filename), () => {
                    console.log("listo")
                });
            }, 1000);
        });
        //llamo a la funcion registrarUsuario perteneciente a "usuarios.js" con los parametros obtenidos del form
        usuarios.registrarUsuario(req.body.user, req.body.password,
            function() {

                // Callback para invocar si validó bien. Guarda la sesión e indica navegar al home.
                res.render('signinOK', {
                    title: `Groove And Play - Bienvenido/a ${req.body.user}`,
                    playlist: playlist
                })
            },
            function() {

                // Si validó mal, se renderiza el handlebars de error por usuario y contraseña repetidos
                res.render('signinBAD', {
                    title: "Groove And Play - Error de registro",
                    playlist: playlist
                });
            },
            function() {

                // Si validó mal, se renderiza el handlebars de error por usuario y contraseña vacios
                res.render('signinVacio', {
                    title: "Groove And Play - Error de registro",
                    playlist: playlist
                });
            });

    }

});

//GET /logout
app.get('/logout', (req, res) => {

    // Destruyo sesión y redirijo al login.
    req.session.destroy();
    res.redirect("/");

});

// POST /login
app.post('/login', (req, res) => {
    //Si el form tiene el campo "user" y "password" rellenados
    if (req.body.user !== undefined && req.body.password !== undefined) {
        //llamo a la funcion validarUsuario perteneciente a "usuarios.js" con los parametros obtenidos del form
        usuarios.validarUsuario(req.body.user, req.body.password,
            function() {

                // Callback para invocar si validó bien. Guarda la sesión e indica navegar al home.
                req.session.userId = req.body.user;
                res.redirect('/home');
            },
            function() {

                // Si validó mal, se destruye la sesión (por si la hubiera) y redirige a página inicial
                req.session.destroy();
                res.render('loginBAD', {
                    title: "Groove And Play - Error de inicio de sesion",
                    playlist: playlist
                });
            });

    }

});

// GET /subirarchivos decide a donde redirigir segun donde se encuentre el proceso de subida
app.get('/subirarchivos', (req, res) => {
    //si hay una session activa
    if (req.session.userId !== undefined) {
        //defino un array para determinar donde redireccionar segun el query que se envía al llamarla 
        //se hace un split al req.query.id para dividir en dos al query,
        //dondeRedireccionar[0] define a qué parte de la subida redireccionar
        //dondeRedireccionar[1] define el nombre del disco subido
        let dondeRedireccionar = req.query.id.split('|');
        switch (dondeRedireccionar[0]) {
            case "contP":
                //si llega como query "contP" redirecciona a la subida de la contraportada
                res.render('upload-DiscoContraP', {
                    title: 'Groove And Play - Contraportada del Disco',
                    usuario: req.session.userId,
                    disco: dondeRedireccionar[1],
                    playlist: playlist
                });
                break;
            case "audio":
                //si llega como query "audio" redirecciona a la subida del audio
                res.render('upload-DiscoAudio', {
                    title: 'Groove And Play - Archivos de audio',
                    usuario: req.session.userId,
                    disco: dondeRedireccionar[1],
                    playlist: playlist
                });
                break;
            default:
                //si llega cualquier otra cosa redirecciona a la subida de la portada
                res.render('upload-DiscoPortada', {
                    title: 'Groove And Play - Portada del Disco',
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
        }

    } else {


        // Si mi usuario tipeó "localhost:3000/subirarchivos" en la barra de direcciones del navegador y
        // no tenía una sesión activa, lo redirijo a la página que tiene el login.
        res.redirect("/");

    }

})

// POST /upload Sube los archivos, rellena las carpetas de portada, contraportada o audio segun el estado de la subida
app.post('/upload', upload.array('file'), (req, res) => {
    //defino un array para determinar qué carpeta crear segun el query que se envía al llamarla 
    //se hace un split al req.query.id para dividir en dos al query,
    //queCrear[0] define qué acabo de subir
    //queCrear[1] define el nombre del disco subido
    let queCrear = req.query.id.split('|');
    //llama a la funcion crearCarpeta pasandole el array antes creado y el req para acceder al nombre de la session
    crearCarpeta(req, queCrear);
    //si hay archivos en la cola de subida
    if (req.files != '') {
        // declaro una lista de objetos vacia (resultados), un array vacio (textoResultado), un boolean (aceptado) y un contador de errores (errors)
        let resultados = [];
        let textoResultado = "";
        let aceptado = false;
        var errors = 0;

        //por cada archivo subido
        for (let x = 0; x <= req.files.length - 1; x++) {
            //extraigo su extension   
            let extension = (req.files[x].originalname.substring(req.files[x].originalname.lastIndexOf("."))).toLowerCase();
            //compruebo si la extension anterior coincide con alguno de la lista que declare globalmente
            if (listaExtImg.includes(extension) || listaExtSound.includes(extension)) {
                //si coinciden asigno un mensaje de ok, y le asigno un valor de TRUE a aceptado
                textoResultado = "Archivo subido OK."
                aceptado = true;
            } else {
                //si no coinciden, conteo un error, asigno un mensaje de error y establezco un valor de False a aceptado
                errors++;
                textoResultado = "Archivo no aceptado (tipo no válido)."
                aceptado = false;
                //segun qué haya subido, luego de 2 segundos elimino el archivo subido 
                switch (queCrear[0]) {
                    //en caso de error al subir una portada
                    case 'port':
                        setTimeout(() => {
                            fs.unlink(('./client/files/' + req.session.userId + '/' + req.body.nombreDisco + '/portada/' + `portada-${req.body.nombreDisco}.jpg`), function(err) {
                                if (err) {
                                    console.log(`error al borrar portada-${req.body.nombreDisco}.jpg`);
                                } else {
                                    console.log(`portada-${req.body.nombreDisco}.jpg borrado con éxito`);
                                }
                            });
                        }, 2000);
                        break;
                        //en caso de error al subir una contraportada
                    case 'contP':
                        setTimeout(() => {
                            fs.unlink(('./client/files/' + req.session.userId + '/' + queCrear[1] + '/contraportada/' + `contraportada-${queCrear[1]}.jpg`), function(err) {
                                if (err) {
                                    console.log(`error al borrar contraportada-${queCrear[1]}.jpg `);
                                } else {
                                    console.log(`contraportada-${queCrear[1]}.jpg borrado con éxito`);
                                }
                            });
                        }, 2000);
                        break;
                        //en caso de error al subir un archivo de audio
                    case 'audio':
                        setTimeout(() => {
                            fs.unlink(('./client/files/' + req.session.userId + '/' + queCrear[1] + '/audio/' + `track${x}-${req.files[x].originalname}`), function(err) {
                                if (err) {
                                    console.log(`error al borrar track${x}-${req.files[x].originalname}`);
                                } else {
                                    console.log(`track${x}-${req.files[x].originalname} borrado con éxito`);
                                }
                            });
                        }, 2000);
                        break;
                    default:

                        break;
                }
            }
            //registro los resultados de cada subida
            resultados.push({
                archivo: req.files[x].originalname,
                aceptado: aceptado,
                textoResultado: textoResultado
            });
        }
        // verifico los errores con la funcion verificarErroresAlSubirArchivo
        verificarErroresAlSubirArchivo(errors, queCrear, req, res, resultados);
    } else {
        //si estoy parado en la subida de la portada, renderizo el error con el handlebars de upload-NoFile pasandole como parametro 
        //la redireccion, el disco(usando el dato obtenido del body), el usuario y el playlist
        if (queCrear[0] == 'port') {
            res.render(`upload-NoFile`, {
                title: 'Groove And Play - No se seleccionaron archivos',
                redireccion: queCrear[0],
                disco: req.body.nombreDisco,
                usuario: req.session.userId,
                playlist: playlist
            })
        } else {
            //si estoy parado en la subida de la portada, renderizo el error con el handlebars de upload-NoFile pasandole como parametro 
            //la redireccion, el disco(usando el dato obtenido de la query), el usuario y el playlist
            res.render(`upload-NoFile`, {
                title: 'Groove And Play - No se seleccionaron archivos',
                redireccion: queCrear[0],
                disco: queCrear[1],
                usuario: req.session.userId,
                playlist: playlist
            })
        }
    }
})

// GET /seeGallery (para ver cada disco subido por el usuario)
app.get('/seeGallery', (req, res) => {
    //si existe una sesion iniciada...
    if (req.session.userId !== undefined) {
        //se borra lo que contiene el array de discos para no repetir datos ya existentes guardados en acciones anteriores
        listaDiscos = [];
        //realizo una lectura de la carpeta correspondiente al usuario que tiene la sesion iniciada
        fs.readdir(`./client/files/${req.session.userId}`, (err, archivos) => {
            //si hay archivos dentro de esa carpeta
            if (archivos != undefined && archivos.length > 0) {
                //por cada elemento leido de dicha carpeta
                archivos.forEach(element => {
                    //se pushea el elemento al array "listaDiscos" junto al usuario que le corresponde
                    listaDiscos.push({
                        nombre: element,
                        usuario: req.session.userId
                    });
                });
                /*se renderiza el handlebars de gallery con los datos del usuario, 
                el array "listaDiscos" con los datos recolectados una vez concluido el forEach y el array global "playlist"*/
                res.render('gallery', {
                    title: 'Groove And Play - Archivos',
                    usuario: req.session.userId,
                    listaDiscos: listaDiscos,
                    playlist: playlist
                })
            } else {
                /*En caso de no encontrar datos dentro de la carpeta del usuario,
                se renderiza el handlebars de gallery con los datos del usuario, el array "listaDiscos" vacio y el array global "playlist"*/
                res.render('gallery-NoFile', {
                    title: 'Groove And Play - No hay discos subidos al servidor',
                    usuario: req.session.userId,
                    listaDiscos: listaDiscos,
                    playlist: playlist
                })
            }
        })

    } else {


        // Si mi usuario tipeó "localhost:3000/seeGallery" en la barra de direcciones del navegador y
        // no tenía una sesión activa, lo redirijo a la página que tiene el login.
        res.redirect("/");

    }

})

//GET /notices (para mostrar un disco en especifico)

app.get('/notices', (req, res) => {
    //Tomo el query de la llamada realizada por el usuario y la divido con la funcion "split" para definir el usuario (queLeer[1])
    // y el nombre del disco (queLeer[0]) que quiero mostrar
    let queLeer = req.query.id.split('|')
        //defino lo que voy a mostrar primero, que siempre va a ser la portada del disco
    var carpeta = 'port';
    //defino un array vacio donde guardaré cada portada encontrada (por el momento siempre será una sola portada)
    var fotosPortada = '';
    //defino un array vacio donde guardaré cada contraportada encontrada (por el momento siempre será una sola contraportada)
    var fotosContraportada = '';
    //defino un array vacio donde guardaré cada archivo de audio encontrado
    var audio = '';
    //mientras "carpeta" sea igual a cualquiera de las opciones a mostrar (portada, contraportada, audio) o a "full", que quiere decir
    //que terminé de recolectar información
    while (carpeta == 'port' || carpeta == 'contP' || carpeta == 'audio' || carpeta == 'full') {
        //realizo un switch por cada opcion posible
        switch (carpeta) {
            //en caso de buscar la portada
            case 'port':
                //realizo una lectura de la carpeta "portada" del disco (queLeer[0]) perteneciente al usuario definido (queLeer[1])
                fs.readdir(`./client/files/${queLeer[1]}/${queLeer[0]}/portada`, (err, archivos) => {
                        //si existen archivos dentro de dicha carpeta...
                        if (archivos.length > 0) {
                            //por cada archivo encontrado (en este caso siempre será uno)...
                            for (let x = 0; x < archivos.length; x++) {
                                //se sumariza el codigo HTML que representa la imagen a mostrar en el HTML final al array vacio "fotosPortada"
                                fotosPortada += `<img src="../files/${queLeer[1]}/${queLeer[0]}/portada/${archivos[x]}"></img>
                                
                                <br>
                                   <br>
                                `;
                            }
                        } else {
                            //si no existen archivos, se le asigna una notificacion de error al array vacío "fotosPortada" para mostrar 
                            //luego en el HTML final
                            fotosPortada = "El disco no posee portada aún";
                        }
                    })
                    //le asigno lo siguiente que quiero mostrar a la variable "carpeta", cambiando de caso en el switch
                carpeta = 'contP';
                break;
                //en caso de buscar la contraportada
            case 'contP':
                //realizo una lectura de la carpeta "contraportada" del disco (queLeer[0]) perteneciente al usuario definido (queLeer[1])
                fs.readdir(`./client/files/${queLeer[1]}/${queLeer[0]}/contraportada`, (err, archivos) => {
                        //si existen archivos dentro de dicha carpeta...
                        if (archivos.length > 0) {
                            //por cada archivo encontrado (en este caso siempre será uno)...
                            for (let x = 0; x < archivos.length; x++) {
                                //se sumariza el codigo HTML que representa la imagen 
                                //a mostrar en el HTML final al array vacio "fotosContraportada"
                                fotosContraportada += `<img src="../files/${queLeer[1]}/${queLeer[0]}/contraportada/${archivos[x]}"></img>
                                
                                <br>
                                   <br>
                                `;
                            }
                        } else {
                            //si no existen archivos, se le asigna una notificacion de error al array vacío "fotosContraportada" para mostrar 
                            //luego en el HTML final
                            fotosContraportada = "El disco no posee contraportada aún";
                        }
                    })
                    //le asigno lo siguiente que quiero mostrar a la variable "carpeta", cambiando de caso en el switch
                carpeta = 'audio';
                break;
                //en caso de buscar audios
            case 'audio':
                //realizo una lectura de la carpeta "audio" del disco (queLeer[0]) perteneciente al usuario definido (queLeer[1])
                fs.readdir(`./client/files/${queLeer[1]}/${queLeer[0]}/audio`, (err, archivos) => {
                        //si existen archivos dentro de dicha carpeta...
                        if (archivos.length > 0) {
                            //por cada archivo encontrado...
                            for (let x = 0; x < archivos.length; x++) {
                                //se sumariza el codigo HTML que representa el archivo de audio
                                //a mostrar en el HTML final al array vacio "audio"
                                audio += `<audio controls src="../files/${queLeer[1]}/${queLeer[0]}/audio/${archivos[x]}"></audio>${archivos[x]}
                                
                                <br>
                                   <br>
                                `;
                            }

                        } else {
                            //si no existen archivos, se le asigna una notificacion de error al array vacío "audio" para mostrar 
                            //luego en el HTML final
                            audio = "El disco no posee Tracklist aún";
                        }
                    })
                    //le asigno la palabra "full" a la variable "carpeta", cambiando de caso en el switch
                carpeta = 'full';
                break;
                //en caso de haber concluido con la recolección de datos
            case 'full':
                //luego de 2 segundos, dandole tiempo al script a rellenar cada array...
                setTimeout(() => {
                    //renderizo el handlebars "home-General" con cada array ya completo, el nombre del usuario y el array global "playlist"
                    res.render('home-General', {
                        title: `Groove And Play - ${queLeer[1]} - ${queLeer[0]}`,
                        fotosPortada: fotosPortada,
                        fotosContraportada: fotosContraportada,
                        audio: audio,
                        usuario: req.session.userId,
                        playlist: playlist
                    })

                }, 2000);
                //vacío la variable "carpeta" para cortar con el loop generado en el while
                carpeta = '';
        }
    }

});

//GET /gallery (para mostrar todos los discos subidos al servidor)
app.get('/gallery', (req, res) => {
    //defino lo que voy a mostrar primero, que siempre va a ser la portada del disco
    var carpeta = 'port';
    //defino un array vacio donde guardaré cada portada encontrada (por el momento siempre será una sola portada)
    var fotosPortada = '';
    //defino un array vacio donde guardaré cada contraportada encontrada (por el momento siempre será una sola contraportada)
    var fotosContraportada = '';
    //defino un array vacio donde guardaré cada archivo de audio encontrado
    var audio = '';
    //mientras "carpeta" sea igual a cualquiera de las opciones a mostrar (portada, contraportada, audio) o a "full", que quiere decir
    //que terminé de recolectar información
    while (carpeta == 'port' || carpeta == 'contP' || carpeta == 'audio' || carpeta == 'full') {
        //realizo un switch por cada opcion posible
        switch (carpeta) {
            //en caso de buscar la portada








            case 'port':
                //realizo una lectura de la carpeta "portada" del disco (req.query.id) perteneciente al usuario definido (req.session.userId)
                fs.readdir(`./client/files/${req.session.userId}/${req.query.id}/portada`, (err, archivos) => {
                        //si existen archivos dentro de dicha carpeta...
                        if (archivos.length > 0) {
                            //por cada archivo encontrado (en este caso siempre será uno)...
                            for (let x = 0; x < archivos.length; x++) {
                                //se sumariza el codigo HTML que representa la imagen a mostrar en el HTML final al array vacio "fotosPortada"
                                fotosPortada += `<img src="../files/${req.session.userId}/${req.query.id}/portada/${archivos[x]}"></img><br>
                                <button onclick="window.location.href = '/remove?id=${req.query.id}|portada|${x}'">Borrar archivo</button>
                                <br>
                                   <br>
                                `;
                            }
                        } else {
                            //si no existen archivos, se le asigna una notificacion de error al array vacío "fotosPortada" para mostrar 
                            //luego en el HTML final
                            fotosPortada = "El disco no posee portada aún";
                        }
                    })
                    //le asigno lo siguiente que quiero mostrar a la variable "carpeta", cambiando de caso en el switch
                carpeta = 'contP';
                break;
                //en caso de buscar la contraportada







            case 'contP':
                //realizo una lectura de la carpeta "contraportada" del disco (req.query.id) 
                //perteneciente al usuario definido (req.session.userId)
                fs.readdir(`./client/files/${req.session.userId}/${req.query.id}/contraportada`, (err, archivos) => {
                        //si existen archivos dentro de dicha carpeta...
                        if (archivos.length > 0) {
                            //por cada archivo encontrado (en este caso siempre será uno)...
                            for (let x = 0; x < archivos.length; x++) {
                                //se sumariza el codigo HTML que representa la imagen 
                                //a mostrar en el HTML final al array vacio "fotosContraportada"
                                fotosContraportada += `<img src="../files/${req.session.userId}/${req.query.id}/contraportada/${archivos[x]}"></img>
                            <br><button onclick="window.location.href = '/remove?id=${req.query.id}|contraportada|${x}'">Borrar archivo</button>
                                <br>
                                   <br>
                                `;
                            }
                        } else {
                            //si no existen archivos, se le asigna una notificacion de error al array vacío "fotosContraportada" para mostrar 
                            //luego en el HTML final
                            fotosContraportada = "El disco no posee contraportada aún";
                        }
                    })
                    //le asigno lo siguiente que quiero mostrar a la variable "carpeta", cambiando de caso en el switch
                carpeta = 'audio';
                break;
                //en caso de buscar audios







            case 'audio':
                //realizo una lectura de la carpeta "audio" del disco (req.query.id) perteneciente al usuario definido (req.session.userId)
                fs.readdir(`./client/files/${req.session.userId}/${req.query.id}/audio`, (err, archivos) => {
                        //si existen archivos dentro de dicha carpeta...
                        if (archivos.length > 0) {
                            //por cada archivo encontrado...
                            for (let x = 0; x < archivos.length; x++) {
                                //se sumariza el codigo HTML que representa el archivo de audio
                                //a mostrar en el HTML final al array vacio "audio"
                                audio += `<audio controls src="../files/${req.session.userId}/${req.query.id}/audio/${archivos[x]}"></audio><br><br>${archivos[x]}
                            <br><button onclick="window.location.href = '/remove?id=${req.query.id}|audio|${x}'">Borrar archivo</button>
                                <br>
                                   <br>
                                `;
                            }
                            //creo un boton que redirecciona al GET de /remove con los datos 
                            //de cada archivo de audio en concreto, para ser eliminado
                            audio += `<br><button onclick="window.location.href = '/remove?id=${req.query.id}|audio|all'">Borrar tracklist</button>`
                        } else {
                            //si no existen archivos, se le asigna una notificacion de error al array vacío "audio" para mostrar 
                            //luego en el HTML final
                            audio = "El disco no posee Tracklist aún";
                        }
                    })
                    //le asigno la palabra "full" a la variable "carpeta", cambiando de caso en el switch
                carpeta = 'full';
                break;
                //en caso de haber concluido con la recolección de datos



            case 'full':
                //luego de 2 segundos, dandole tiempo al script a rellenar cada array...
                setTimeout(() => {
                    //renderizo el handlebars "home-General" con cada array ya completo, el nombre del usuario y el array global "playlist"
                    res.render('gallery-General', {
                        title: `Groove And Play - ${req.query.id}`,
                        fotosPortada: fotosPortada,
                        fotosContraportada: fotosContraportada,
                        audio: audio,
                        carpeta: req.query.id,
                        usuario: req.session.userId,
                        playlist: playlist
                    })

                }, 2000);
                //vacío la variable "carpeta" para cortar con el loop generado en el while        
                carpeta = '';
        }
    }

});


// GET /remove (otorga la posibilidad de eliminar tanto un disco completo, como cada una de sus partes)
app.get('/remove', (req, res) => {
    //vacío el array de resultados para no repetir datos que ya haya obtenido en ejecuciones anteriores
    resultados = '';
    //Tomo el query de la llamada realizada por el usuario y la divido con la funcion "split" para definir:
    //-Qué item especifico voy a borrar (queBorrar[2]), el cual puede ser todos o uno en especifico (éste último se utiliza para borrar audios)
    //-Qué items voy a borrar (QueBorrar[1]), el cual puede ser todos o uno('all', o el nombre de la categoría),
    //-Qué disco voy a borrar (QueBorrar[0]) 
    let queBorrar = req.query.id.split('|');
    //realizo un switch por cada opcion posible refiriendome a queBorrar[1]
    switch (queBorrar[1]) {
        //en caso de que el usuario elija borrar el disco completo
        case 'all':
            //realizo una lectura de la carpeta "audio", dentro de la carpeta del disco correspondiente, 
            //el cual se ubica dentro de la carpeta propia del usuario
            fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/audio`, (err, archivos) => {
                    //por cada elemento obtenido...
                    for (let x = 0; archivos.length > x; x++) {
                        //realizo la funcion "unlink" (eliminar archivo) pasando como parametro los datos necesarios para crear la ruta del archivo correspondiente
                        fs.unlink(`./client/files/${req.session.userId}/${queBorrar[0]}/audio/${archivos[x]}`, (err) => {
                            //si hay error al eliminar el archivo
                            if (err) {
                                console.log(`error al borrar ${archivos[x]}`);
                                //si no hay ningun tipo de error
                            } else {
                                console.log(`${archivos[x]} borrado con éxito`);
                            }
                        })
                    }
                })
                //realizo una lectura de la carpeta "portada", dentro de la carpeta del disco correspondiente, 
                //el cual se ubica dentro de la carpeta propia del usuario
            fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/portada`, (err, archivos) => {
                    //realizo la funcion "unlink" (eliminar archivo) pasando como parametro los datos 
                    //necesarios para crear la ruta del archivo correspondiente
                    fs.unlink(`./client/files/${req.session.userId}/${queBorrar[0]}/portada/${archivos}`, (err) => {
                        //si hay error al eliminar el archivo
                        if (err) {
                            console.log(`error al borrar ${archivos}`);
                            //si no hay ningun tipo de error
                        } else {
                            console.log(`${archivos} borrado con éxito`);
                        }
                    })
                })
                //realizo una lectura de la carpeta "contraportada", dentro de la carpeta del disco correspondiente, 
                //el cual se ubica dentro de la carpeta propia del usuario
            fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/contraportada`, (err, archivos) => {
                    //realizo la funcion "unlink" (eliminar archivo) pasando como parametro los datos 
                    //necesarios para crear la ruta del archivo correspondiente
                    fs.unlink(`./client/files/${req.session.userId}/${queBorrar[0]}/contraportada/${archivos}`, (err) => {
                        //si hay error al eliminar el archivo
                        if (err) {
                            console.log(`error al borrar ${archivos}`);
                            //si hay error al eliminar el archivo
                        } else {
                            console.log(`${archivos} borrado con éxito`);
                        }
                    })
                })
                //seteo un TimeOut de 1 segundo para darle tiempo al script a que elimine los archivos dentro de las carpetas
                //para poder eliminar dichas carpetas
            setTimeout(() => {
                //Lanzo la funcion "rmdir" (eliminar carpeta) pasando como parametro los datos 
                //necesarios para crear la ruta de la carpeta correspondiente
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}/portada`, (err) => {
                        //si hay error al eliminar la carpeta
                        if (err) {
                            console.log(`error al borrar la carpeta "portada"`);
                            //si no hay ningun tipo de error
                        } else {
                            console.log(`carpeta "portada" borrado con éxito`);
                        }
                    })
                    //Lanzo la funcion "rmdir" (eliminar carpeta) pasando como parametro los datos 
                    //necesarios para crear la ruta de la carpeta correspondiente
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}/contraportada`, (err) => {
                        //si hay error al eliminar la carpeta
                        if (err) {
                            console.log(`error al borrar la carpeta "contraportada"`);
                            //si no hay ningun tipo de error
                        } else {
                            console.log(`carpeta "contraportada" borrado con éxito`);
                        }
                    })
                    //Lanzo la funcion "rmdir" (eliminar carpeta) pasando como parametro los datos 
                    //necesarios para crear la ruta de la carpeta correspondiente
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}/audio`, (err) => {
                    //si hay error al eliminar la carpeta
                    if (err) {
                        console.log(`error al borrar la carpeta "audio"`);
                        //si no hay ningun tipo de error
                    } else {
                        console.log(`carpeta "audio" borrado con éxito`);
                    }
                })
            }, 1000);
            //seteo un TimeOut de 2 segundos para darle tiempo al script a eliminar las anteriores carpetas
            //para poder eliminar la carpeta raiz del disco
            setTimeout(() => {
                //Lanzo la funcion "rmdir" (eliminar carpeta) pasando como parametro los datos 
                //necesarios para crear la ruta de la carpeta correspondiente
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}`, (err) => {
                    //si hay error al eliminar la carpeta
                    if (err) {
                        console.log(`error al borrar la carpeta "${queBorrar[0]}"`);
                        //si no hay ningun tipo de error
                    } else {
                        console.log(`carpeta "${queBorrar[0]}" borrado con éxito`);
                    }
                })
            }, 2000);
            //seteo un TimeOut de 3 segundos para darle tiempo al script a eliminar las anteriores carpetas
            //para poder eliminar la carpeta raiz del usuario
            setTimeout(() => {
                //Lanzo la funcion "rmdir" (eliminar carpeta) pasando como parametro los datos 
                //necesarios para crear la ruta de la carpeta correspondiente
                fs.rmdir(`./client/files/${req.session.userId}`, (err) => {
                    //si hay error al eliminar la carpeta
                    if (err) {
                        console.log(`error al borrar la carpeta "${req.session.userId}"`);
                        //si no hay ningun tipo de error
                    } else {
                        console.log(`carpeta "${req.session.userId}" borrado con éxito`);
                    }
                })
            }, 3000);
            //seteo un TimeOut de 4 segundos para darle tiempo al script a eliminar las anteriores carpetas
            //para poder renderizar el handlebars "removeAll" con el mensaje de exito
            setTimeout(() => {
                //vacio el array "playlist" para evitar datos repetidos
                playlist = [];
                //cargo el array "playlist" con los archivos que quedaron dentro del servidor
                cargarMusicaSubida(playlist);
                //renderizo el handlebars "removeAll" con el mensaje de exito
                res.render('removeAll', {
                    title: "Groove And Play - Borrado de archivos",
                    usuario: req.session.userId,
                    playlist: playlist
                })
            }, 4000);
            break;
            //en caso de que la variable queBorrar[1] sea distinta de "all"
        default:
            //realizo un switch por cada opcion posible refiriendome a queBorrar[2]
            switch (queBorrar[2]) {
                //en caso de que la variable queBorrar[2] sea "all"
                case 'all':
                    //realizo una lectura de la carpeta establecida por queBorrar[1], dentro de la carpeta del disco correspondiente, 
                    //el cual se ubica dentro de la carpeta propia del usuario
                    fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}`, (error, archivos) => {
                        //por cada elemento encontrado en la carpeta establecida por queBorrar[1]...
                        for (let x = 0; x < archivos.length; x++) {
                            //realizo la función  "unlink" (eliminar archivos) pasando como parametro los datos 
                            //necesarios para crear la ruta de la carpeta correspondiente
                            fs.unlink((`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}/` + archivos[x]), function(err) {
                                //si hay error al eliminar el archivo
                                if (err) {
                                    console.log(`error al borrar ${archivos[x]}`);
                                    //si no hay ningun tipo de error
                                } else {
                                    console.log(`${archivos[x]} borrado con éxito`);
                                }
                            });
                        }
                    });
                    //seteo un TimeOut de 2 segundos para darle tiempo al script a eliminar los archivos correspondientes
                    //para poder renderizar el handlebars "removeAll" con el mensaje de exito
                    setTimeout(() => {
                        //vacio el array "playlist" para evitar datos repetidos
                        playlist = [];
                        //cargo el array "playlist" con los archivos que quedaron dentro del servidor
                        cargarMusicaSubida(playlist);
                        //renderizo el handlebars "removeAll" con el mensaje de exito
                        res.render('removeAll', {
                            title: "Groove And Play - Borrado de archivos",
                            usuario: req.session.userId,
                            playlist: playlist
                        })
                    }, 2000);
                    break;
                    //en caso de que la variable queBorrar[2] sea distinto de "all"
                default:
                    //realizo una lectura de la carpeta establecida por queBorrar[1], dentro de la carpeta del disco correspondiente, 
                    //el cual se ubica dentro de la carpeta propia del usuario
                    fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}`, (error, archivos) => {
                        //realizo la función  "unlink" (eliminar archivos) pasando como parametro los datos 
                        //necesarios para crear la ruta de la carpeta correspondiente
                        fs.unlink((`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}/` + archivos[queBorrar[2]]), function(err) {
                            //si hay error al borrar el archivo
                            if (err) {
                                console.log(`error al borrar ${archivos[queBorrar[2]]}`);
                                //si no hay ningun tipo de error
                            } else {
                                console.log(`${archivos[queBorrar[2]]} borrado con éxito`);
                            }
                        });
                    });
                    //seteo un TimeOut de 2 segundos para darle tiempo al script a eliminar los archivos correspondientes
                    //para poder renderizar el handlebars "removeAll" con el mensaje de exito                   
                    setTimeout(() => {
                        //vacio el array "playlist" para evitar datos repetidos
                        playlist = [];
                        //cargo el array "playlist" con los archivos que quedaron dentro del servidor
                        cargarMusicaSubida(playlist);
                        //renderizo el handlebars "removeAll" con el mensaje de exito
                        res.render('removeAll', {
                            title: "Groove And Play - Borrado de archivos",
                            usuario: req.session.userId,
                            playlist: playlist
                        })
                    }, 2000);
                    break;
            }
            break;
    }
});

// Listen de node
app.listen(3000, function() {
    console.log("Escuchando puerto 3000")
});

// crear carpeta segun el nombre del Disco que pone el usuario 
//y sube cada archivo al servidor ubicandolo dentro de su carpeta correspondiente
function crearCarpeta(req, queCrear) {
    //por cada elemento seleccionado por el usuario en el formulario de subida de archivos
    for (let x = 0; x <= req.files.length - 1; x++) {
        //realizo un switch por cada opcion posible refiriendome a queCrear[0]
        switch (queCrear[0]) {
            //en caso de que la variable queCrear[0] sea igual a "port"
            case "port":
                //realizo la funcion "mkdir" (crear carpeta) para crear la carpeta con el nombre del usuario actual
                fs.mkdir(`./client/files/${req.session.userId}`, () => {
                        //realizo la funcion "mkdir" (crear carpeta) para crear la carpeta con el nombre del disco que el usuario especificó
                        fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}`, () => {
                            //realizo la funcion "mkdir" (crear carpeta) para crear la carpeta "portada" correspondiente al disco especificado
                            fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}/portada`, () => {

                                })
                                //realizo la funcion "mkdir" (crear carpeta) para crear la carpeta "contraportada" correspondiente al disco especificado
                            fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}/contraportada`, () => {

                                })
                                //realizo la funcion "mkdir" (crear carpeta) para crear la carpeta "audio" correspondiente al disco especificado
                            fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}/audio`, () => {

                            })
                        })
                    })
                    //seteo un TimeOut de 1 segundo para darle tiempo al script a crear las carpetas correspondientes
                setTimeout(() => {
                    //realizo la funcion "createReadStream" para leer el arhcivo de origen de la subida, luego utilizo la funcion "pipe" 
                    //para unir a la primer funcion con la funcion "createWriteStream" para, desde el archivo de origen, crear otro archivo
                    //igual dentro de la carpeta correspondiente y con su nombre final
                    fs.createReadStream('./client/files/' + req.files[x].filename).pipe(fs.createWriteStream('./client/files/' + req.session.userId + '/' + req.body.nombreDisco + '/portada/' + 'portada-' + req.body.nombreDisco + '.jpg'));
                    //realizo la funcion "unlink" con la ruta del archivo original, para eliminarlo
                    fs.unlink(('./client/files/' + req.files[x].filename), () => {

                    });
                }, 1000);
                break;
                //en caso de que la variable queCrear[0] sea igual a "contP"
            case "contP":
                //realizo la funcion "createReadStream" para leer el arhcivo de origen de la subida, luego utilizo la funcion "pipe" 
                //para unir a la primer funcion con la funcion "createWriteStream" para, desde el archivo de origen, crear otro archivo
                //igual dentro de la carpeta correspondiente y con su nombre final
                fs.createReadStream('./client/files/' + req.files[x].filename).pipe(fs.createWriteStream('./client/files/' + req.session.userId + '/' + queCrear[1] + '/contraportada/' + 'contraportada-' + queCrear[1] + '.jpg'));
                //realizo la funcion "unlink" con la ruta del archivo original, para eliminarlo
                fs.unlink(('./client/files/' + req.files[x].filename), () => {

                });
                break;
                //en caso de que la variable queCrear[0] sea igual a "audio"
            case "audio":
                //realizo la funcion "createReadStream" para leer el arhcivo de origen de la subida, luego utilizo la funcion "pipe" 
                //para unir a la primer funcion con la funcion "createWriteStream" para, desde el archivo de origen, crear otro archivo
                //igual dentro de la carpeta correspondiente y con su nombre final
                fs.createReadStream('./client/files/' + req.files[x].filename).pipe(fs.createWriteStream(`./client/files/${req.session.userId}/${queCrear[1]}/audio/track${x}-${req.files[x].originalname}`));
                //realizo la funcion "unlink" con la ruta del archivo original, para eliminarlo
                fs.unlink(('./client/files/' + req.files[x].filename), () => {

                });
                break;
                //en caso de que la variable queCrear[0] sea distinto a cualquier opcion anterior 
            default:
                //vacio "req.files", que contiene los archivos seleccionados para subir
                req.files = '';
                break;
        }
    }
}

// verificar si hay errores, y si no los hay, redireccionar al siguiente paso de la subida del disco
/**
 * 
 * @param {int} errors 
 * @param {array} queCrear 
 * @param {object} req 
 * @param {object} res 
 * @param {array} resultados 
 */
function verificarErroresAlSubirArchivo(errors, queCrear, req, res, resultados) {
    //si no se ha conteado ningun error
    if (errors == 0) {
        //realizo un switch por cada opcion posible refiriendome a queCrear[0]
        switch (queCrear[0]) {
            //en caso de que la variable queCrear[0] sea igual a "port"
            case "port":
                //renderizo el handlebars "upload-DiscoContraP" para continuar con la subida de los 
                //archivos correspondientes a la contraportada
                res.render('upload-DiscoContraP', {
                    title: 'Groove And Play - Contraportada del Disco',
                    disco: req.body.nombreDisco,
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
                //en caso de que la variable queCrear[0] sea igual a "contP"
            case "contP":
                //renderizo el handlebars "upload-Discoaudio" para continuar con la subida de los 
                //archivos de audio 
                res.render('upload-DiscoAudio', {
                    title: 'Groove And Play - Archivos de audio',
                    disco: queCrear[1],
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
                //en caso de que la variable queCrear[0] sea distinta de las opciones anteriores
            default:
                //vacio el array "playlist" para evitar datos repetidos
                playlist = [];
                ç
                //seteo un TimeOut para darle tiempo al script a subir los archivos al servidor
                //para luego cargar el array "playlist" incluyendo los nuevos archivos de audio
                setTimeout(function() {
                    //cargo el array "playlist" incluyendo los archivos nuevos
                    cargarMusicaSubida(playlist);
                }, 2000);
                //renderizo el handlebars "upload-Complete" mostrando el mensaje de exito en la subida
                res.render('upload-Complete', {
                    title: 'Groove And Play - Finalizar',
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
        }
        //si el conteo de errores supera a 0
    } else {
        //si queCrear[0] es igual a "port"
        if (queCrear[0] == 'port') {
            //renderizo el handlebars "upload-General" mostrando que hubo errores de subida, y cuales fueron
            res.render('upload-General', {
                    title: 'Groove And Play - Errores de subida',
                    listaArchivos: resultados,
                    redireccion: queCrear[0],
                    //al ser la subida principal, donde defino el nombre del disco, utilizo "req.body.nombreDisco"
                    disco: req.body.nombreDisco,
                    usuario: req.session.userId,
                    playlist: playlist
                })
                //si queCrear[0] es igual a cualquier opcion restante
        } else {
            //renderizo el handlebars "upload-General" mostrando que hubo errores de subida, y cuales fueron
            res.render('upload-General', {
                title: 'Groove And Play - Errores de subida',
                listaArchivos: resultados,
                redireccion: queCrear[0],
                //al no ser la subida principal, donde defino el nombre del disco, utilizo "queCrear[1]", 
                //el cual contiene el nombre del disco
                disco: queCrear[1],
                usuario: req.session.userId,
                playlist: playlist
            })
        }
    }
}