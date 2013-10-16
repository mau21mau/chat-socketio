var http = require('http');
var fs = require('fs');
var debug = parseInt( fs.readFileSync(__dirname + '/debug') );

var app = http.createServer(function(req, res) {
    var index = fs.readFileSync(__dirname + '/index.html');
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(index);
});

// Socket.io server listens to our app
var io = require('socket.io').listen(app, { log: false } );

var connected_clients={};
var usuarios = {};
var log_chat = {};

var connection = io.sockets.on('connection', function(socket) {
   
    // Este evento salva Nome : idDoSocket
    socket.on('saveConnection', function (data) {
        usuarios[socket.id] = {socketId : socket.id, nome : data.nome};// Salva o cliente atual para ser exibido pro client
        
        // Envia lista de usuarios para quem acabu de se conectar
        socket.emit('reciveConnectedClients', usuarios);

        // Envia o novo usuario conectado para todos
        io.sockets.emit('reciveNewClient', {socketId : socket.id, nome : data.nome} );
        
        if (debug){
            console.log(data.nome+" conectou-se no socket: "+ socket.id);
        }
        
    });
    
    socket.on('sendMessage', function (data) {
        var toSocketId = data.socket;// Obtem o id do socket do amigo que ira receber a mensagem
        var enviadaPara = usuarios[toSocketId].nome; //Obtem o nome de quem esta recebendo
        var menssagem_text = data.message; // Obtem a mensagem que esta sendo enviada
        
        var fromSocketId = data.sender; // Obtem o id do socket de quem esta enviando

        var sender = usuarios[fromSocketId].nome; //Obtem o nome de quem esta enviando
        var reciever_socket = io.sockets.socket(toSocketId); // obtem a instancia do socket da pessoa que ira receber a mensagem

        
        var mensagem = {message : menssagem_text, sender: sender, senderSocket : fromSocketId };
        reciever_socket.emit('recieveMessage', mensagem); // envia a mensagem

        if (debug){
            console.log("Mensagem: "+sender+" '"+data.message+"' -> para '"+enviadaPara+"' | id-conexao: "+reciever_socket.id);
        }

        // Faz o log das mensagens
        if ( log_chat[fromSocketId+","+toSocketId] ){

            log_chat[fromSocketId+","+toSocketId].push(mensagem);

        }else{
            log_chat[fromSocketId+","+toSocketId] = [];
            log_chat[fromSocketId+","+toSocketId].push(mensagem);
        }
       
        if ( log_chat[toSocketId+","+fromSocketId] ){
            
               log_chat[toSocketId+","+fromSocketId].push(mensagem);

        }else{

            log_chat[toSocketId+","+fromSocketId] = [];
            log_chat[toSocketId+","+fromSocketId].push(mensagem);

        }
        
    });
    
    socket.on('getHistory', function (data) {
        var mySocket = data.mySocket;
        var friendsSocket = data.friendsSocket;

        var history = log_chat[friendsSocket+","+mySocket];
        
        socket.emit('sendHistory', history);
        //console.log("Meu id: "+mySocket+"| Amigo id: "+friendsSocket);
        //console.log(log_chat[mySocket+friendsSocket]);
    });

    socket.on("disconnect", function(){
        if (debug){
            console.log("disconnected : " + usuarios[socket.id].nome);
        }

        for (var usuario in usuarios){
            var socket_id = usuarios[usuario].socketId;
            
            if (socket_id != socket.id){
                delete log_chat[socket.id+","+socket_id];
                delete log_chat[socket_id+","+socket.id];
            }
            
        }

        delete usuarios[socket.id];
        
        if (debug){
            console.log(log_chat);
        }

        io.sockets.emit('disconnectedClient', {socketId : socket.id} );
    });
    
});

debugger;
app.listen(3000);
