// Módulos Obrigatórios
var express= require("express");
var morgan     = require("morgan");
var bodyParser = require("body-parser");
var jwt        = require("jsonwebtoken");
var mongoose   = require("mongoose");
var app        = express();

var port = process.env.PORT || 3001;
var User = require('./models/User');

const JWT_SECRET = 'teste'

// Conecta-se o Banco de Dados
const con = 'mongodb://teste:123@ds163699.mlab.com:63699/got';
mongoose.connect(con);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});

process.on('uncaughtException', function(err) {
    console.log(err);
});

// Start Server
app.listen(port, function () {
    console.log( "Servidor Express observando a porta " + port);
});

//Cadastrar um usuario para criar a colection
app.post('/cadUser', function(req, res) {
    
    console.log('aqui')
    
    var userModel = new User();
    userModel.email = req.body.email;
    userModel.password = req.body.password;
    userModel.save(function(err) {
        console.log('this fires after the `post` hook');
        res.send('foi')
    });
    
});

//Cadastrar novos Usuarios
app.post('/signin', function(req, res) {
    User.findOne({email: req.body.email, password: req.body.password}, function(err, user) {
        if (err) {
            res.json({
                type: false,
                data: "Error occured: " + err
            });
        } else {
            if (user) {
                res.json({
                    type: false,
                    data: "Usuario ja cadastrado!"
                });
            } else {
                var userModel = new User();
                userModel.email = req.body.email;
                userModel.password = req.body.password;
                userModel.save(function(err, user) {
                    let payLoad = {
                        email : user.email,
                        exp : Math.floor(Date.now() / 1000) + (30*60)
                    }
                    user.token = jwt.sign(payLoad, JWT_SECRET);
                    user.save(function(err, user1) {
                        res.json({
                            type: true,
                            data: user1,
                            token: user1.token
                        });
                    });
                })
            }
        }
    });
});


//autenticar novos usuarios
app.post('/authenticate', function(req, res) {
    User.findOne({email: req.body.email, password: req.body.password}, function(err, user) {
        if (err) {
            res.json({
                type: false,
                data: "Error occured: " + err
            });
        } else {
            if (user) {
                user.token = null
                let payLoad = {
                    email : user.email,
                    exp : Math.floor(Date.now() / 1000) + (30*60)
                }
                user.token = jwt.sign(
                    payLoad, 
                    JWT_SECRET
                );
                console.log(user.token)
                user.save(function(err, user1) {
                    res.json({
                        token: user.token
                    });
                });
            } else {
                res.json({
                    type: false,
                    data: "Incorreto email/password"
                });
            }
        }
    });
});

app.get('/session', (req, res) =>{
    let auth = req.headers["authorization"];
    
    console.log(auth)
    
    if(!auth || !auth.startsWith('token')){
        console.log('deu ruim session')
        return res.status(401).json({Erro : 'sessao invalida'})        
    } else {
        auth = auth.split('token').pop().trim()
        console.log('deu boa session')
    }
    jwt.verify(auth, JWT_SECRET, (err, data)=>{
        console.log('============== jwt ==========')
        if(err){
            return res.status(401).json({erro : 'token invalido'});
        }
        
        return res.status(201).json({data});
    })
})


app.get('/me', ensureAuthorized, function(req, res) {
    User.findOne({token: req.token}, function(err, user) {
        if (err) {
            res.json({
                type: false,
                data: "Error occured: " + err
            });
        } else {
            res.json({
                type: true,
                data: user
            });
        }
    });
});

function ensureAuthorized(req, res, next) {
    var bearerToken;
    var bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== 'undefined') {
        var bearer = bearerHeader.split(" ");
        bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.send(403);
    }
}