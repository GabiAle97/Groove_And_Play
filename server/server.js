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
var playlist=[];

//lista de formatos compatibles
const listaExtImg = ['.jpg','jpeg', '.bmp', '.gif', '.png', '.raw'];
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
function cargarMusicaSubida(playlist){
    //leo la carpeta "files" en "client"
    fs.readdir('./client/files',(err,usuarios)=>{
        //por cada objeto que hay dentro de "files" (detecta carpetas, cada una tiene el nombre de un usuario)...
        usuarios.forEach(usuario => {
            //lee la carpeta con el nombre de usuario
            fs.readdir(`./client/files/${usuario}`,(err,discos)=>{
                //por cada objeto que hay dentro de la carpeta del usuario (detecta carpetas, cada una tiene el nombre de un disco que subio)...
                discos.forEach(disco => {
                    //lee la carpeta "audio" que esta dentro de la carpeta con el nombre de disco
                    fs.readdir(`./client/files/${usuario}/${disco}/audio`,(err,temas)=>{
                        //por cada audio que lee de esa carpeta
                        temas.forEach(tema => {
                            //registra los datos que fue recolectando en la lista "playlist" global
                            playlist.push({
                                usuario : usuario,
                                disco : disco,
                                tema : tema,
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
    if(req.session.userId){
        //redirecciona a /home
        res.redirect('/home');
    }else{
        //si no existe una sesion iniciada 
        //se carga la musica del servidor con la funcion cargarMusicaSubida que recibe la lista Playlist global
        cargarMusicaSubida(playlist);
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
    cargarMusicaSubida(playlist);
    //creo una lista de objetos vacia
    var listaDiscos=[]
    //lee la carpeta "files" de "client"
    fs.readdir(`./client/files`,(err,archivos)=>{
        //si existen archivos dentro
        if (archivos != undefined && archivos.length>0){
            //por cada archivo dentro de la carpeta "files"
            archivos.forEach(Usuario => {
                //lee la carpeta con el nombre de usuario ubicada en "files"
                fs.readdir(`./client/files/${Usuario}`,(err,archivosUsuario)=>{    
                    //si existen archivos dentro de la carpeta anterior
                    if(archivosUsuario != undefined && archivosUsuario.length>0){
                        //por cada objeto que se encuentra
                        archivosUsuario.forEach(Disco => {
                            //registro los datos recolectados en la lista de objetos "listaDiscos"            
                            listaDiscos.push({
                                usuario : Usuario,
                                nombre : Disco
                            });
                        });
                    }
                })
            });
           //renderizo el handlebars de home con los parametros de usuario, listaDiscos y playlist
            res.render('home',{
                title: 'Groove And Play - Noticias',
                usuario: req.session.userId,
                listaDiscos: listaDiscos,
                playlist: playlist
            })
            
        }
        else{
            //renderizo el handlebars de gallery-NoFile con los parametros de usuario, listaDiscos y playlist
            res.render('home-NoFile',{
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
    res.render('register',{
        title:"Groove And Play - Registrarse",
        playlist: playlist
    })
  });


  //POST /signin
  app.post('/signin', upload.single("file"), (req, res) => {
    //Si el form tiene el campo "user" y "password" rellenados
    if (req.body.user !== undefined && req.body.password !== undefined) {
        console.log(req.file);
        //lee la carpeta del usuario que se encuentra en "client"
        fs.mkdir(`./client/${req.body.user}`,()=>{
            console.log("cree carpeta "+req.body.user);
            //espero un segundo y muevo el archivo de la foto de perfil a la carpeta generada del usuario, luego borro el archivo original subido en "client/files"
            setTimeout(() => {
                fs.createReadStream(`./client/files/`+req.file.filename).pipe(fs.createWriteStream(`./client/${req.body.user}/user.jpg`)); 
                fs.unlink((`./client/files/`+req.file.filename) , ()=>{
                    console.log("listo")
                });
            }, 1000);
        });
        //llamo a la funcion registrarUsuario perteneciente a "usuarios.js" con los parametros obtenidos del form
        usuarios.registrarUsuario(req.body.user, req.body.password,
          function() {
             
            // Callback para invocar si validó bien. Guarda la sesión e indica navegar al home.
            res.render('signinOK',{
                title: `Groove And Play - Bienvenido/a ${req.body.user}`,
                playlist: playlist
            })
          }, function() {
           
            // Si validó mal, se renderiza el handlebars de error por usuario y contraseña repetidos
            res.render('signinBAD',{
                title: "Groove And Play - Error de registro",
                playlist: playlist
            });
        }, function() {
           
            // Si validó mal, se renderiza el handlebars de error por usuario y contraseña vacios
            res.render('signinVacio',{
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
          }, function() {
           
            // Si validó mal, se destruye la sesión (por si la hubiera) y redirige a página inicial
            req.session.destroy();
            res.render('loginBAD',{
                title: "Groove And Play - Error de inicio de sesion",
                playlist: playlist
            });
          });
    
      }

});

// GET /subirarchivos decide a donde redirigir segun donde se encuentre el proceso de subida
app.get('/subirarchivos', (req,res)=>{
    //si hay una session activa
    if (req.session.userId !== undefined) {
       //defino un array para determinar donde redireccionar segun el query que se envía al llamarla 
       //se hace un split al req.query.id para dividir en dos al query,
       //dondeRedireccionar[0] define a qué parte de la subida redireccionar
       //dondeRedireccionar[1] define el nombre del disco subido
        let dondeRedireccionar= req.query.id.split('|');
        switch (dondeRedireccionar[0]) {    
            case "contP":
            //si llega como query "contP" redirecciona a la subida de la contraportada
                res.render('upload-DiscoContraP',{
                    title: 'Groove And Play - Contraportada del Disco',
                    usuario: req.session.userId,
                    disco: dondeRedireccionar[1],
                    playlist: playlist
                });
                break;
            case "audio":
            //si llega como query "audio" redirecciona a la subida del audio
                res.render('upload-DiscoAudio',{
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
       
        
        // Si mi usuarix tipeó "localhost:3000/home" en la barra de direcciones del navegador y
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
    crearCarpeta(req,queCrear);
    //si hay archivos en la cola de subida
    if (req.files != ''){
        // declaro una lista de objetos vacia (resultados), un array vacio (textoResultado), un boolean (aceptado) y un contador de errores (errors)
        let resultados = [];
        let textoResultado = "";
        let aceptado = false;
        var errors=0;

        //por cada archivo subido
        for (let x = 0; x <= req.files.length-1; x++) {         
            //extraigo su extension   
            let extension = (req.files[x].originalname.substring(req.files[x].originalname.lastIndexOf("."))).toLowerCase();
            //compruebo si la extension anterior coincide con alguno de la lista que declare globalmente
            if(listaExtImg.includes(extension)||listaExtSound.includes(extension)){
                //si coinciden asigno un mensaje de ok, y le asigno un valor de TRUE a aceptado
                textoResultado = "Archivo subido OK."
                aceptado = true;
            }
            else{
                //si no coinciden, conteo un error, asigno un mensaje de error y establezco un valor de False a aceptado
                errors++;
                textoResultado = "Archivo no aceptado (tipo no válido)."
                aceptado = false;
                //segun qué haya subido, luego de 2 segundos elimino el archivo subido 
                switch (queCrear[0]) {
                    case 'port':
                        setTimeout(() => {
                            fs.unlink(('./client/files/'+req.session.userId+'/'+req.body.nombreDisco +'/portada/'+ `portada-${req.body.nombreDisco}.jpg`), function (err) {
                                if (err) {
                                   
                                } else {
                                   
                                }  
                            });
                        }, 2000);
                        break;
                    case 'contP':
                        setTimeout(() => {
                            fs.unlink(('./client/files/'+req.session.userId+'/'+queCrear[1] +'/contraportada/'+ `contraportada-${queCrear[1]}.jpg`), function (err) {
                                if (err) {
                                   
                                } else {
                                   
                                }  
                            });
                        }, 2000);
                        break;
                    case 'audio':
                        setTimeout(() => {
                            fs.unlink(('./client/files/'+req.session.userId+'/'+queCrear[1] +'/audio/'+ `track${x}-${req.files[x].originalname}`), function (err) {
                                if (err) {
                                   
                                } else {
                                   
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
        verificarErroresAlSubirArchivo(errors,queCrear,req,res,resultados);
    }
    else{
       //si estoy parado en la subida de la portada, renderizo el error con el handlebars de upload-NoFile pasandole como parametro 
       //la redireccion, el disco(usando el dato obtenido del body), el usuario y el playlist
        if(queCrear[0]=='port'){
            res.render(`upload-NoFile`, {
                title: 'Groove And Play - No se seleccionaron archivos',
                redireccion: queCrear[0],
                disco: req.body.nombreDisco,
                usuario: req.session.userId,
                playlist: playlist
            })
        }else{
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

// GET /seeGallery
app.get('/seeGallery',(req,res)=>{
    if (req.session.userId !== undefined) {
       
        listaDiscos=[]
        fs.readdir(`./client/files/${req.session.userId}`,(err,archivos)=>{
            if (archivos != undefined && archivos.length>0){
                archivos.forEach(element => {
                    listaDiscos.push({
                        nombre: element,
                        usuario: req.session.userId
                    });
                });
                res.render('gallery',{
                    title: 'Groove And Play - Archivos',
                    usuario: req.session.userId,
                    listaDiscos: listaDiscos,
                    usuario: req.session.userId,
                    playlist: playlist
                })
            }
            else{
                res.render('gallery-NoFile',{
                    title: 'Groove And Play - No hay discos subidos al servidor',
                    usuario: req.session.userId,
                    listaDiscos: listaDiscos,
                    usuario: req.session.userId,
                    playlist: playlist
                })
            }
        })
    
    } else {
       
        
        // Si mi usuarix tipeó "localhost:3000/home" en la barra de direcciones del navegador y
        // no tenía una sesión activa, lo redirijo a la página que tiene el login.
        res.redirect("/");
    
    }
    
})

app.get('/notices', (req, res) => {
    let queLeer= req.query.id.split('|')
    var carpeta = 'port';
    var fotosPortada = '';
    var fotosContraportada = '';
    var audio = '';
    while(carpeta=='port' || carpeta=='contP' || carpeta=='audio'|| carpeta=='full'){
        
        switch (carpeta) {
            case 'port':
            
                fs.readdir(`./client/files/${queLeer[1]}/${queLeer[0]}/portada`,(err,archivos)=>{
                    if(archivos.length > 0){
                        for (let x = 0; x < archivos.length; x++) {
                            fotosPortada += `<img src="../files/${queLeer[1]}/${queLeer[0]}/portada/${archivos[x]}"></img>
                                
                                <br>
                                   <br>
                                `;
                        }
                    }
                    else{
                        fotosPortada = "El disco no posee portada aún";
                    }
                })
                carpeta='contP';
                break;
            case 'contP':
                
                fs.readdir(`./client/files/${queLeer[1]}/${queLeer[0]}/contraportada`,(err,archivos)=>{
                    if(archivos.length > 0){
                        for (let x = 0; x < archivos.length; x++) {
                            fotosContraportada += `<img src="../files/${queLeer[1]}/${queLeer[0]}/contraportada/${archivos[x]}"></img>
                                
                                <br>
                                   <br>
                                `;
                        }
                    }else{
                        fotosContraportada = "El disco no posee contraportada aún";
                    }
                })
                carpeta='audio';
                break;
            case 'audio':
                
                fs.readdir(`./client/files/${queLeer[1]}/${queLeer[0]}/audio`,(err,archivos)=>{
                    if(archivos.length > 0){
                        for (let x = 0; x < archivos.length; x++) {
                            audio += `<audio controls src="../files/${queLeer[1]}/${queLeer[0]}/audio/${archivos[x]}"></audio>${archivos[x]}
                                
                                <br>
                                   <br>
                                `;
                        }
                        
                    }else{
                        audio = "El disco no posee Tracklist aún";
                    }
                })
                carpeta='full';
                break;
            case 'full':
                
                setTimeout(() => {
                    res.render('home-General',{
                        title : `Groove And Play - ${queLeer[1]} - ${queLeer[0]}`,
                        fotosPortada : fotosPortada,
                        fotosContraportada : fotosContraportada,
                        audio : audio,
                        usuario: req.session.userId,
                        playlist: playlist
                    })
                    
                }, 2000);
                carpeta='';
        }
    }
    
});


app.get('/gallery', (req, res) => {
    
    var carpeta = 'port';
    var fotosPortada = '';
    var fotosContraportada = '';
    var audio = '';
    while(carpeta=='port' || carpeta=='contP' || carpeta=='audio'|| carpeta=='full'){
        
        switch (carpeta) {
            case 'port':
            
                fs.readdir(`./client/files/${req.session.userId}/${req.query.id}/portada`,(err,archivos)=>{
                    if(archivos.length > 0){
                        for (let x = 0; x < archivos.length; x++) {
                            fotosPortada += `<img src="../files/${req.session.userId}/${req.query.id}/portada/${archivos[x]}"></img><br>
                                <button onclick="window.location.href = '/remove?id=${req.query.id}|portada|${x}'">Borrar archivo</button>
                                <br>
                                   <br>
                                `;
                        }
                    }
                    else{
                        fotosPortada = "El disco no posee portada aún";
                    }
                })
                carpeta='contP';
                break;
            case 'contP':
                
                fs.readdir(`./client/files/${req.session.userId}/${req.query.id}/contraportada`,(err,archivos)=>{
                    if(archivos.length > 0){
                        for (let x = 0; x < archivos.length; x++) {
                            fotosContraportada += `<img src="../files/${req.session.userId}/${req.query.id}/contraportada/${archivos[x]}"></img>
                            <br><button onclick="window.location.href = '/remove?id=${req.query.id}|contraportada|${x}'">Borrar archivo</button>
                                <br>
                                   <br>
                                `;
                        }
                    }else{
                        fotosContraportada = "El disco no posee contraportada aún";
                    }
                })
                carpeta='audio';
                break;
            case 'audio':
                
                fs.readdir(`./client/files/${req.session.userId}/${req.query.id}/audio`,(err,archivos)=>{
                    if(archivos.length > 0){
                        for (let x = 0; x < archivos.length; x++) {
                            audio += `<audio controls src="../files/${req.session.userId}/${req.query.id}/audio/${archivos[x]}"></audio><br><br>${archivos[x]}
                            <br><button onclick="window.location.href = '/remove?id=${req.query.id}|audio|${x}'">Borrar archivo</button>
                                <br>
                                   <br>
                                `;
                        }
                        audio +=`<br><button onclick="window.location.href = '/remove?id=${req.query.id}|audio|all'">Borrar tracklist</button>`
                    }else{
                        audio = "El disco no posee Tracklist aún";
                    }
                })
                carpeta='full';
                break;
            case 'full':
                
                setTimeout(() => {
                    res.render('gallery-General',{
                        title : `Groove And Play - ${req.query.id}`,
                        fotosPortada : fotosPortada,
                        fotosContraportada : fotosContraportada,
                        audio : audio,
                        carpeta: req.query.id,
                        usuario: req.session.userId,
                        playlist: playlist
                    })
                    
                }, 2000);
                carpeta='';
        }
    }
    
});


// GET /remove
app.get('/remove', (req, res) => {
    resultados='';
    let queBorrar = req.query.id.split('|');
   
    switch (queBorrar[1]) {
        case 'all':
            fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/audio`, (err,archivos)=>{
                for(let x=0 ; archivos.length > x ; x++){
                    fs.unlink(`./client/files/${req.session.userId}/${queBorrar[0]}/audio/${archivos[x]}`,(err)=>{
                       
                    })
                }
            })
            fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/portada`, (err,archivos)=>{                
                fs.unlink(`./client/files/${req.session.userId}/${queBorrar[0]}/portada/${archivos}`,(err)=>{
                   
                })
            })
            fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/contraportada`, (err,archivos)=>{                
                fs.unlink(`./client/files/${req.session.userId}/${queBorrar[0]}/contraportada/${archivos}`,(err)=>{
                   
                })
            })
            setTimeout(() => {
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}/portada`,(err)=>{
                   
                })
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}/contraportada`,(err)=>{
                   
                })
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}/audio`,(err)=>{
                   
                })
            }, 1000);
            setTimeout(() => {
                fs.rmdir(`./client/files/${req.session.userId}/${queBorrar[0]}`,(err)=>{
               
            })
            }, 2000);
            setTimeout(() => {
                fs.rmdir(`./client/files/${req.session.userId}`,(err)=>{
               
            })
            }, 3000);
            setTimeout(() => {
                res.render('removeAll',{
                    title: "Groove And Play - Borrado de archivos",
                    usuario: req.session.userId,
                    playlist: playlist
                })
            }, 4000);           
            break;
    
        default:
            switch (queBorrar[2]) {
                case 'all':
                    fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}`, (error, archivos) => {
                        for (let x = 0; x < archivos.length; x++) {
                            fs.unlink((`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}/` + archivos[x]), function (err) {
                            });       
                        }        
                    });
                    setTimeout(() => {
                        res.render('removeAll',{
                            title: "Groove And Play - Borrado de archivos",
                            usuario: req.session.userId,
                            playlist: playlist
                        })
                    }, 2000); 
                    break;
            
                default:
                    fs.readdir(`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}`, (error, archivos) => {
                        fs.unlink((`./client/files/${req.session.userId}/${queBorrar[0]}/${queBorrar[1]}/` + archivos[queBorrar[2]]), function (err) {
                        });        
                    });
                    setTimeout(() => {
                        res.render('removeAll',{
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
app.listen(3000, function () {
   console.log("Escuchando puerto 3000")
});

// crear carpeta segun el nombre del Disco que pone el usuario
function crearCarpeta(req,queCrear){  
    for (let x = 0; x <= req.files.length-1; x++) {
        switch (queCrear[0]) {
            case "port":
                fs.mkdir(`./client/files/${req.session.userId}`,()=>{
                    fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}`, ()=>{
                       
                        fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}/portada`, ()=>{
                           
                        })
                        fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}/contraportada`, ()=>{
                           
                        })
                        fs.mkdir(`./client/files/${req.session.userId}/${req.body.nombreDisco}/audio`, ()=>{
                           
                        })
                    })
                })
                setTimeout(() => {
                    fs.createReadStream('./client/files/'+req.files[x].filename).pipe(fs.createWriteStream('./client/files/'+req.session.userId+'/'+req.body.nombreDisco+'/portada/'+'portada-'+req.body.nombreDisco+'.jpg')); 
                    fs.unlink(('./client/files/'+req.files[x].filename) , ()=>{
                       
                    }); 
                }, 1000);
                break;
            case "contP":
                fs.createReadStream('./client/files/'+req.files[x].filename).pipe(fs.createWriteStream('./client/files/'+req.session.userId+'/'+queCrear[1]+'/contraportada/'+'contraportada-'+queCrear[1]+'.jpg')); 
                fs.unlink(('./client/files/'+req.files[x].filename) , ()=>{
                   
                });
                break;
            case "audio":
                fs.createReadStream('./client/files/'+req.files[x].filename).pipe(fs.createWriteStream(`./client/files/${req.session.userId}/${queCrear[1]}/audio/track${x}-${req.files[x].originalname}`)); 
                fs.unlink(('./client/files/'+req.files[x].filename) , ()=>{
                   
                }); 
                break;
            default:
                req.files = '';
                break;
        }
    }
}

// verificar si hay errores, y si no los hay, redireccionar al siguiente paso de la subida del disco
function verificarErroresAlSubirArchivo(errors,queCrear,req,res,resultados){
    if(errors==0){
        switch (queCrear[0]) {
            case "port":
                res.render('upload-DiscoContraP',{
                    title: 'Groove And Play - Contraportada del Disco',
                    disco: req.body.nombreDisco,
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
            case "contP":
                res.render('upload-DiscoAudio',{
                    title: 'Groove And Play - Archivos de audio',
                    disco: queCrear[1],
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
            default:
                res.render('upload-Complete',{
                    title: 'Groove And Play - Finalizar',
                    usuario: req.session.userId,
                    playlist: playlist
                });
                break;
        }
    }
    else{
        if(queCrear[0]=='port'){
            res.render('upload-General',{
                title: 'Groove And Play - Errores de subida',
                listaArchivos: resultados,
                redireccion: queCrear[0],
                disco: req.body.nombreDisco,
                usuario: req.session.userId,
                playlist: playlist
            })
        }else{
            res.render('upload-General',{
                title: 'Groove And Play - Errores de subida',
                listaArchivos: resultados,
                redireccion: queCrear[0],
                disco: queCrear[1],
                usuario: req.session.userId,
                playlist: playlist
            })
        }
    }
}

