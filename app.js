var http = require('http');
var fs = require('fs');
var debug = parseInt(fs.readFileSync(__dirname + '/debug'));

var app = http.createServer(function(req, res) {
    var index = fs.readFileSync(__dirname + '/index.html');
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(index);
}).listen('/tmp/chat_socketio.socket');

// Socket.io server listens to our app
var io = require('socket.io').listen(app, {log: false});
io.set('transports', ['xhr-polling']);

var connected_clients = {};
var users = {};
var log_chat = {};

var connection = io.sockets.on('connection', function(socket) {

    // This event is just to recieve the user name sender the client
    socket.on('saveConnection', function(data) {
        users[socket.id] = {socket_id: socket.id, name: data.name};// Save the client name and socket id into users

        // Gives back the connected clients to the user that has just connected
        socket.emit('reciveConnectedClients', users);

        // Send the users list to everyone connected
        io.sockets.emit('reciveNewClient', {socket_id: socket.id, name: data.name});

        if (debug) {
            console.log('"' + data.name + '" is connected on socket: ' + socket.id);
        }

    });

    socket.on('sendMessage', function(data) {

        var reciever_socket = data.socket;// Gets the destination socker id
        var menssagem_text = data.message; // Gets the text message being sent

        var sender_socket_id = socket.id; // Gets the sender socket id

        var sender_name = users[sender_socket_id].name; //Obtem o name de quem esta enviando
        var reciever_socket_obj = io.sockets.socket(reciever_socket); // obtem a instancia do socket da pessoa que ira receber a message


        var message = {message: menssagem_text, sender_name: sender_name, sender_socket: sender_socket_id};
        reciever_socket_obj.emit('recieveMessage', message); // envia a message

        console.log(sender_name);

        if (debug) {
            console.log("Message: \"" + data.message + "\" from \"" + users[sender_socket_id].name + "\" -> to \"" + users[reciever_socket].name);
        }

        // Faz o log das mensagens
        if (log_chat[sender_socket_id + "," + reciever_socket]) {

            log_chat[sender_socket_id + "," + reciever_socket].push(message);

        } else {
            log_chat[sender_socket_id + "," + reciever_socket] = [];
            log_chat[sender_socket_id + "," + reciever_socket].push(message);
        }

        if (log_chat[reciever_socket + "," + sender_socket_id]) {

            log_chat[reciever_socket + "," + sender_socket_id].push(message);

        } else {

            log_chat[reciever_socket + "," + sender_socket_id] = [];
            log_chat[reciever_socket + "," + sender_socket_id].push(message);

        }

    });

    socket.on('getHistory', function(data) {
        var my_socket = socket.id;
        var friend_socket = data.friend_socket;

        var history = log_chat[friend_socket + "," + my_socket];

        socket.emit('sendHistory', history);
    });

    socket.on("disconnect", function() {
        if (debug) {
            console.log("disconnected : " + users[socket.id].name + " -> " + socket.id);
        }

        for (var usuario in users) {
            var socket_id = users[usuario].socket_id;

            if (socket_id != socket.id) {
                delete log_chat[socket.id + "," + socket_id];
                delete log_chat[socket_id + "," + socket.id];
            }

        }

        if (debug) {
            console.log(log_chat);
        }

        io.sockets.emit('disconnectedClient', {socket_id: socket.id});
        delete users[socket.id];

    });

});

debugger;
//app
