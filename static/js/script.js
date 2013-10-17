
$(document).ready( function(){
    $("#name-field").focus();

    $("#connect").click(function(){
        handle_connect_form();
    });

    $("#name-field").keypress(function(e) {
        if(e.which == 13) {
            handle_connect_form();
            return false;
        }
    });

});

function handle_connect_form(){
    var name = $("#name-field").val();

    if (name != ""){
        $("#name").html(name);

        $("#connect").addClass("connecting");
        $("#connect").html("Connecting...");

        // Start the client
        app_client.init();

    }else{
        alert("Insert the name!");
    }
}

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

                app_client.client_name = $("#name-field").val();
                app_client.client_socket.emit('saveConnection', { name: app_client.client_name });

                
                app_client.client_socket.on('connect', function () {
                    $("#connect").fadeOut(500);
                    $("#desconnect").fadeIn(500);
                    $("#name-field").slideUp(500);
                    $("#name").slideDown(500);
                    $("#connect").removeClass("connecting");
                    $("#connect").html("Connect");
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
                    for (var user in connected_users){
                        var name_user = connected_users[user].name;
                        var socket_id = connected_users[user].socket_id;
                        
                        if (socket_id != app_client.client_socket.socket.sessionid){
                           var str_content = str_content + '<div class="user" rel="'+name_user+'" id="'+socket_id+'">'+name_user+'</div>';
                        }
                    }
                    if (str_content != ""){
                        $("#users").html($(str_content).fadeIn(500));
                    }else{
                        $("#column2 h4").first().html("No one else seems to be connected.");
                    }

                });

                app_client.client_socket.on('reciveNewClient', function(data){
                    var name_user = data.name;
                    var socket_id = data.socket_id;
                    console.debug(name_user+" responde no socket: "+socket_id);
                    if (socket_id != app_client.client_socket.socket.sessionid){
                        $("#column2 h4").first().fadeOut('slow');
                        var str_content = '<div class="user" rel="'+name_user+'" id="'+socket_id+'">'+name_user+'</div>';
                        $("#users").append( $(str_content).fadeIn(500) );
                    }
                    
                });

                $("#send").click( function(){
                    send_message();
                });

                $("#text-field").keypress(function(e) {
                    if(e.which == 13) {
                        send_message();
                        return false;
                    }
                });

                // Recebe a message do amigo
                app_client.client_socket.on('recieveMessage', function (data) {
                    var recieved_message = data.message;
                    var sender_name = data.sender_name;
                    console.debug("message recebida de "+sender_name+", id: "+data.sender_socket);
                    var new_message =  createFriendMessage( sender_name, recieved_message );

                    if ( $(".new-messages") ){
                        var id = $(".new-messages").attr("data-idinterval");
                        window.clearInterval(id);
                    }
                    
                    if (!$("#"+data.sender_socket).hasClass("current")){
                        var idInterval = blink( $("#"+data.sender_socket) );
                    }

                    $("#"+data.sender_socket).attr("data-idinterval", idInterval);
                    $("#"+data.sender_socket).addClass("new-messages");
                    
                    var socketCurrent = $(".current").attr("id");
                    if (socketCurrent == data.sender_socket){
                        $("#messages").append( $(new_message).fadeIn(500) );
                    }

                });
                

                $(document).on("click", ".user", function(){

                    var friend_socket = $(this).attr("id");

                    var isCurrent = $(this).hasClass("current");
                    console.debug(isCurrent);
                    if ( !isCurrent ){
                        //alert("oi");
                        app_client.client_socket.emit('getHistory', { friend_socket : friend_socket });
                    }

                    $(".current").removeClass("current");
                    $(this).addClass("current");
                    var name_user = $(this).attr("rel");
                    $("#friend").html("Talking to " + name_user);
                    $("#friend").fadeIn(500);


                    console.debug("conectado a: "+friend_socket);

                    // Pega o Historico das conversas
                    app_client.client_socket.on('sendHistory', function (data) {

                    if (data){ // Se tiver alguma conversa no historico com o user clicado exibe

                        console.debug(data);

                        $("#messages").html(""); // Limpa o container de mensagens

                        for ( var i = 0; i < data.length; i++ ){
                            var sender_socket = data[i].sender_socket;
                            var elementmessage = "";

                            if ( sender_socket == app_client.client_socket.socket.sessionid ){

                                elementmessage = createMyMessage(data[i].sender_name, data[i].message);

                                $("#messages").append( $(elementmessage).fadeIn(500) );

                            }else{
                                elementmessage = createFriendMessage(data[i].sender_name, data[i].message);
                                console.debug(data[i].message);
                                $("#messages").append( $(elementmessage).fadeIn(500) );

                            }

                        }

                    }else{
                        $("#messages").html("");
                    }

                    });

                });
                
                $(document).on("click", ".new-messages", function(){
                    $(this).css("background-color", "");
                    var idInterval = $(this).attr("data-idinterval");
                    window.clearInterval(idInterval);
                });

                $("#desconnect").click(function(){
                    $("#"+app_client.client_socket.socket.sessionid).fadeOut(500, function(){
                        $("#"+app_client.client_socket.socket.sessionid).remove();
                    });
                    app_client.client_socket.disconnect();

                    $("#connect").fadeOut(500, function(){
                        $("#desconnect").fadeIn(500, function(){
                            $("#name-field").slideUp(500, function(){
                                $("#name").slideDown(500);
                            });
                        });
                    });

                    $("#name").html("");
                    $("#name").slideUp(500, function(){
                        $("#name-field").slideDown(500, function(){
                            $("#desconnect").fadeOut(500, function(){
                                $("#connect").fadeIn(500);
                            });
                        });
                    });

                });

                app_client.client_socket.on('disconnectedClient', function(data){
                    //alert("OI");
                    $("#"+data.socket_id).fadeOut(500, function(){
                        $("#"+data.socket_id).remove();
                        if ($(".user").length == 0){
                            $("#column2 h4").first().fadeIn('slow');
                        }
                    });
                        
                });

           }
        }

        var intervalID = setInterval(tryReconnect, 2000);
        
    }
}



function createMyMessage(name, texto){
    return '<div class="message">'+
    '<div class="profile-image"></div>'+
    '<div class="wrap-balloon my-message">'+
    '<div class="my-balloon-header">'+
    '<p class="user-name">'+name+'</p>'+
    '</div>'+
    '<div class="my-balloon-text">'+
    '<p class="text-message">'+texto+'</p>'+
    '</div>'+
    '<div class="my-balloon-bottom"></div>'+
    '</div>'+
    '<div class="clear"></div>'+
    '</div>';
}

function createFriendMessage(name, texto){
    return '<div class="message">'+
    '<div class="profile-image"></div>'+
    '<div class="wrap-balloon friend-message">'+
    '<div class="friend-balloon-header">'+
    '<p class="user-name">'+name+'</p>'+
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
        var reciever_socket = $(".current").attr("id");

        var data = {message: msg_text, socket : reciever_socket}
        console.debug(data.sender_socket);
        // Envia message para o amigo
        app_client.client_socket.emit('sendMessage', data);
        
        document.getElementById("text-field").value = "";
        
        var meu_name = $("#name").html();
        var minha_message = createMyMessage(meu_name, msg_text);

        $("#messages").append( $(minha_message).fadeIn(500) );

        $("#text-field").focus();
        
    }else{
        alert("Selecione um amigo");
    }
}








