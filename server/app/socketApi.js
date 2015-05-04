/**
 * Created by sjayaram on 4/23/2015.
 */
var moment = require('moment');
var Q = require('q');
var redisStore = require('./redisStore.js');
var debug = require('debug')('chatApp-socket');

module.exports = function(http) {

    var io = require('socket.io')(http);

    io.on('connection', function(socket){
        debug('a user connected');

        socket.on("join", function(data){
            debug('user joining ' + data.phoneNo + " contactlist " + data.contactList);

            if(data != undefined)
            {
                redisStore.addUser(data.phoneNo, socket.id).then(function (currentUser) {

                    var userPromises = data.contactList.map(redisStore.getUserInfo);

                    Q.all(userPromises)
                        .then(function (userList) {
                            debug("Q.all return " + JSON.stringify(userList));
                            io.sockets.connected[socket.id].emit("user:list", userList);
                            io.emit("user:joined", currentUser);
                        });
                });
            }

        });

        socket.on("user:getMessages", function(phoneNo){
            redisStore.getMessages(phoneNo).then(function (data) {
                debug("get messages from redis " + JSON.stringify(data));
                io.sockets.connected[socket.id].emit("user:receiveMessages", data);
            });
        });

        socket.on("send", function(msg){
            debug(msg);

            if(msg != undefined) {
                redisStore.getUserInfo(msg.toPhoneNo).then(function (user) {
                    debug("socketId " + user.socketId);
                    if(user.status == "Offline")
                    {
                        redisStore.updateUnreadCount(msg.fromPhoneNo, msg.toPhoneNo);
                    }
                    else {
                        io.sockets.connected[user.socketId].emit('chat', msg);
                    }

                    redisStore.addMessage(msg);
                    redisStore.updateLastSeenInfo(msg.fromPhoneNo);
                });
            }

        });

        socket.on('user:disconnect', function(userId){
            debug('user disconnecting ' + userId);
            if(userId != undefined) {
                redisStore.disconnectUser(userId).then(function (user) {
                    debug('user disconnected');
                    io.emit("user:disconnected", user);
                });
            }
        });
    });

};