
$(document).ready( function(){
    $("#conectar").click(function(){
        var nome = $("#nome-field").val();

        if (nome != ""){

            $("#nome").html(nome);

            $("#conectar").fadeOut(500, function(){
                $("#desconectar").fadeIn(500, function(){
                    $("#nome-field").slideUp(500, function(){
                        $("#nome").slideDown(500);
                    });
                });
            });
            
            var socket = io.connect('/');
            debug = socket;
                // Salva conexao no servidor
                socket.emit('saveConnection', { nome: nome });
                
                // Recebe lista de clientes conectados
                socket.on('reciveConnectedClients', function(data){
                    var str_content = "";
                    var nome_usuario;
                    for (var usuario in data){
                        nome_usuario = data[usuario].nome;
                        var socket_id = data[usuario].socketId;
                        console.debug(nome_usuario+" responde no socket: "+socket_id);
                        var str_content = str_content + '<div class="usuario" rel="'+nome_usuario+'" id="'+socket_id+'">'+nome_usuario+'</div>';
                    }

                    //alert("OI MAE");
                    
                    $("#usuarios").html( $(str_content).fadeIn(500) );
                });

                socket.on('reciveNewClient', function(data){
                    //alert("OI");
                    var nome_usuario = data.nome;
                    var socket_id = data.socketId;
                    console.debug(nome_usuario+" responde no socket: "+socket_id);
                    var str_content = '<div class="usuario" rel="'+nome_usuario+'" id="'+socket_id+'">'+nome_usuario+'</div>';
                    $("#usuarios").append( $(str_content).fadeIn(500) );
                    
                    
                });
                
                $("#enviar").click( function(){

                    var amigo_conetado = $(".current").length;
                    
                    if (amigo_conetado == 1) {
                        var msg_text = document.getElementById("text-field").value;
                        var socketId = $(".current").attr("id");

                        var data = {message: msg_text, socket : socketId, enviadoPor: socket.socket.sessionid }
                        console.debug(data.enviadoPor);
                        // Envia mensagem para o amigo
                        socket.emit('sendMessage', data);
                        
                        document.getElementById("text-field").value = "";
                        
                        var meu_nome = $("#nome").html();
                        var minha_mensagem = createMyMessage(meu_nome, msg_text);

                        $("#menssages").append( $(minha_mensagem).fadeIn(500) );
                        
                    }else{
                        alert("Selecione um amigo");
                    }

                });


             // Recebe a mensagem do amigo
            socket.on('recieveMessage', function (data) {
                var recieved_message = data.message;
                var enviadoPor = data.enviadoPor;
                console.debug("Enviada POR "+data.senderSocket);
                var new_message =  createFriendMessage( enviadoPor, recieved_message );

                if ( $(".new-messages") ){
                    var id = $(".new-messages").attr("data-idinterval");
                    window.clearInterval(id);
                }
                

                var idInterval = blink( $("#"+data.senderSocket) );
                $("#"+data.senderSocket).attr("data-idinterval", idInterval);
                $("#"+data.senderSocket).addClass("new-messages");
                
                var socketCurrent = $(".current").attr("id");
                if (socketCurrent == data.senderSocket){
                    $("#menssages").append( $(new_message).fadeIn(500) );
                }

            });
             
            socket.on('error', function() { console.error(arguments) });
            socket.on('message', function() { console.log(arguments) });
                 
            $(document).on("click", ".usuario", function(){

                var friendSocketId = $(this).attr("id");

                var isCurrent = $(this).hasClass("current");
                console.debug(isCurrent);
                if ( !isCurrent ){
                    //alert("oi");
                    socket.emit('getHistory', { mySocket: socket.socket.sessionid, friendsSocket : friendSocketId });
                }

                $(".current").removeClass("current");
                $(this).addClass("current");
                var nome_usuario = $(this).attr("rel");
                $("#friend").html("Falando com " + nome_usuario);
                $("#friend").fadeIn(500);


                console.debug("conectado a: "+friendSocketId);

                // Pega o Historico das conversas
                socket.on('sendHistory', function (data) {

                if (data){ // Se tiver alguma conversa no historico com o usuario clicado exibe

                    console.debug(data);

                    $("#menssages").html(""); // Limpa o container de mensagens

                    for ( var i = 0; i < data.length; i++ ){
                        var senderSocket = data[i].fromSocketId;
                        var elementMensagem = "";

                        if ( senderSocket == socket.socket.sessionid ){

                            elementMensagem = createMyMessage(data[i].enviadoPor, data[i].message);

                            $("#menssages").append( $(elementMensagem).fadeIn(500) );

                        }else{
                            elementMensagem = createFriendMessage(data[i].enviadoPor, data[i].message);
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
                $("#"+socket.socket.sessionid).fadeOut(500, function(){
                    $("#"+socket.socket.sessionid).remove();
                });
                socket.disconnect();

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
            
            socket.on('disconnectedClient', function(data){
                //alert("OI");
                $("#"+data.socketId).fadeOut(500, function(){
                    $("#"+data.socketId).remove();
                });
                    
            });
            

        }else{
            alert("Insira um nome");
            $("#nome-field").select();
        }

    });

});

function createMyMessage(nome, texto){
    return '<div class="mensagem">'+
    '<div class="profile-image"></div>'+
    '<div class="wrap-balloon">'+
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
    '<div class="wrap-balloon">'+
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









