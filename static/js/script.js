
$(document).ready( function(){
    my_debug = "";
    $("#conectar").click(function(){
        var nome = $("#nome-field").val();

        if (nome != ""){
            $("#nome").html(nome);

            $("#conectar").addClass("connecting");
            $("#conectar").html("Connecting...");

            // Inicia o client
            app_client.init();

        }else{
            alert("Insira um nome!");
        }

    });

});

window.onbeforeunload = function(event) {
    if (app_client) {
        event = event || window.event;

        var confirmClose = 'Are you sure?';

        // For IE and Firefox prior to version 4
        if (event) {
           event.returnValue = confirmClose;
        }

        if (confirmClose){
            app_client.client_socket.socket.disconnect();
        }
        return confirmClose;
    }else{
        return true;
    }
}

var app_client = {
    client_socket: null,
    client_name: null,

    init: function(){
        
        var tryReconnect = function(){

            if (!app_client.client_socket) {
                // use a connect() or reconnect() here if you want
                $("#column2 .userset-overlay").fadeIn('slow');
                app_client.client_socket = io.connect("/", {secure:false});

                app_client.client_name = $("#nome-field").val();
                app_client.client_socket.emit('saveConnection', { nome: app_client.client_name });

                
                app_client.client_socket.on('connect', function () {
                    $("#conectar").fadeOut(500);
                    $("#desconectar").fadeIn(500);
                    $("#nome-field").slideUp(500);
                    $("#nome").slideDown(500);
                    $("#conectar").removeClass("connecting");
                    $("#conectar").html("Connect");
                    // once client connects, clear the reconnection interval function
                    clearInterval(intervalID);
                    console.log("Connected!");
                    //... do other stuff
                });
                
                app_client.client_socket.on('reciveConnectedClients', function(data){
                    $("#column2 .userset-overlay").fadeOut('slow');
                    console.log(data);
                    var connected_users = data;
                    var str_content = "";
                    for (var usuario in connected_users){
                        var nome_usuario = connected_users[usuario].nome;
                        var socket_id = connected_users[usuario].socketId;
                        
                        if (socket_id != app_client.client_socket.socket.sessionid){
                           var str_content = str_content + '<div class="usuario" rel="'+nome_usuario+'" id="'+socket_id+'">'+nome_usuario+'</div>';
                        }
                    }
                    if (str_content != ""){
                        $("#usuarios").html( $(str_content).fadeIn(500));
                    }else{
                        $("#column2 h4").first().html("No one else seems to be connected.");
                    }

                });

                app_client.client_socket.on('reciveNewClient', function(data){
                    
                    var nome_usuario = data.nome;
                    var socket_id = data.socketId;
                    console.debug(nome_usuario+" responde no socket: "+socket_id);
                    if (socket_id != app_client.client_socket.socket.sessionid){
                        $("#column2 h4").first().fadeOut('slow');
                        var str_content = '<div class="usuario" rel="'+nome_usuario+'" id="'+socket_id+'">'+nome_usuario+'</div>';
                        $("#usuarios").append( $(str_content).fadeIn(500) );
                    }
                    
                });

                $("#enviar").click( function(){
                    send_message();
                });

                $("#text-field").keypress(function(e) {
                    if(e.which == 13) {
                        send_message();
                        return false;
                    }
                });

                // Recebe a mensagem do amigo
                app_client.client_socket.on('recieveMessage', function (data) {
                    var recieved_message = data.message;
                    var sender = data.sender;
                    console.debug("Enviada POR "+data.senderSocket);
                    var new_message =  createFriendMessage( sender, recieved_message );

                    if ( $(".new-messages") ){
                        var id = $(".new-messages").attr("data-idinterval");
                        window.clearInterval(id);
                    }
                    
                    if (!$("#"+data.senderSocket).hasClass("current")){
                        var idInterval = blink( $("#"+data.senderSocket) );
                    }

                    $("#"+data.senderSocket).attr("data-idinterval", idInterval);
                    $("#"+data.senderSocket).addClass("new-messages");
                    
                    var socketCurrent = $(".current").attr("id");
                    if (socketCurrent == data.senderSocket){
                        $("#menssages").append( $(new_message).fadeIn(500) );
                    }

                });
                

                $(document).on("click", ".usuario", function(){

                    var friendSocketId = $(this).attr("id");

                    var isCurrent = $(this).hasClass("current");
                    console.debug(isCurrent);
                    if ( !isCurrent ){
                        //alert("oi");
                        app_client.client_socket.emit('getHistory', { mySocket: app_client.client_socket.socket.sessionid, friendsSocket : friendSocketId });
                    }

                    $(".current").removeClass("current");
                    $(this).addClass("current");
                    var nome_usuario = $(this).attr("rel");
                    $("#friend").html("Falando com " + nome_usuario);
                    $("#friend").fadeIn(500);


                    console.debug("conectado a: "+friendSocketId);

                    // Pega o Historico das conversas
                    app_client.client_socket.on('sendHistory', function (data) {

                    if (data){ // Se tiver alguma conversa no historico com o usuario clicado exibe

                        console.debug(data);

                        $("#menssages").html(""); // Limpa o container de mensagens

                        for ( var i = 0; i < data.length; i++ ){
                            var senderSocket = data[i].fromSocketId;
                            var elementMensagem = "";

                            if ( senderSocket == app_client.client_socket.socket.sessionid ){

                                elementMensagem = createMyMessage(data[i].sender, data[i].message);

                                $("#menssages").append( $(elementMensagem).fadeIn(500) );

                            }else{
                                elementMensagem = createFriendMessage(data[i].sender, data[i].message);
                                console.debug(data[i].message);
                                $("#menssages").append( $(elementMensagem).fadeIn(500) );

                            }

                        }

                    }else{
                        $("#menssages").html("");
                    }

                    });

                });
                
                $(document).on("click", ".new-messages", function(){
                    $(this).css("background-color", "");
                    var idInterval = $(this).attr("data-idinterval");
                    window.clearInterval(idInterval);
                });

                $("#desconectar").click(function(){
                    $("#"+app_client.client_socket.socket.sessionid).fadeOut(500, function(){
                        $("#"+app_client.client_socket.socket.sessionid).remove();
                    });
                    app_client.client_socket.disconnect();

                    $("#conectar").fadeOut(500, function(){
                        $("#desconectar").fadeIn(500, function(){
                            $("#nome-field").slideUp(500, function(){
                                $("#nome").slideDown(500);
                            });
                        });
                    });

                    $("#nome").html("");
                    $("#nome").slideUp(500, function(){
                        $("#nome-field").slideDown(500, function(){
                            $("#desconectar").fadeOut(500, function(){
                                $("#conectar").fadeIn(500);
                            });
                        });
                    });

                });

                app_client.client_socket.on('disconnectedClient', function(data){
                    //alert("OI");
                    $("#"+data.socketId).fadeOut(500, function(){
                        $("#"+data.socketId).remove();
                        if ($(".usuario").length == 0){
                            $("#column2 h4").first().fadeIn('slow');
                        }
                    });
                        
                });

           }
        }

        var intervalID = setInterval(tryReconnect, 2000);
        
    }
}



function createMyMessage(nome, texto){
    return '<div class="mensagem">'+
    '<div class="profile-image"></div>'+
    '<div class="wrap-balloon my-message">'+
    '<div class="my-balloon-header">'+
    '<p class="user-name">'+nome+'</p>'+
    '</div>'+
    '<div class="my-balloon-text">'+
    '<p class="text-message">'+texto+'</p>'+
    '</div>'+
    '<div class="my-balloon-bottom"></div>'+
    '</div>'+
    '<div class="clear"></div>'+
    '</div>';
}

function createFriendMessage(nome, texto){
    return '<div class="mensagem">'+
    '<div class="profile-image"></div>'+
    '<div class="wrap-balloon friend-message">'+
    '<div class="friend-balloon-header">'+
    '<p class="user-name">'+nome+'</p>'+
    '</div>'+
    '<div class="friend-balloon-text">'+
    '<p class="text-message">'+texto+'</p>'+
    '</div>'+
    '<div class="friend-balloon-bottom"></div>'+
    '</div>'+
    '<div class="clear"></div>'+
    '</div>';
}


function blink(element){

    var color1 = "#FBB874";
    var color2 = "#FAF9E8";

    var current = 1;
    var idInterval=self.setInterval(function(){

        if (current == 1){
            element.css("background-color", color1);
            current = 2;
        }else{
            element.css("background-color", color2);
            current = 1;
        }

    },600);

    return idInterval;

}

function send_message(){
    var amigo_conetado = $(".current").length;
                    
    if (amigo_conetado == 1) {
        var msg_text = document.getElementById("text-field").value;
        var socketId = $(".current").attr("id");

        var data = {message: msg_text, socket : socketId, sender: app_client.client_socket.socket.sessionid }
        console.debug(data.sender);
        // Envia mensagem para o amigo
        app_client.client_socket.emit('sendMessage', data);
        
        document.getElementById("text-field").value = "";
        
        var meu_nome = $("#nome").html();
        var minha_mensagem = createMyMessage(meu_nome, msg_text);

        $("#menssages").append( $(minha_mensagem).fadeIn(500) );

        $("#text-field").focus();
        
    }else{
        alert("Selecione um amigo");
    }
}








