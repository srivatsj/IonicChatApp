angular.module('starter.services', [])

.factory('socket', function ($rootScope,$localStorage) {
    var socket = io.connect("http://192.168.1.13:8080");
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
})

.factory('ContactService', function() {
    var ContactService = {};
    var jsonStr = {'contactList' : ['Srivats','Esra','Jeff','Ling','Piya','Sasha']};

    ContactService.createJsonMsg = function(userId) { jsonStr["phoneNo"] = userId; return jsonStr; }

    return ContactService;
})

.factory('DBService', function($cordovaSQLite, $q, $localStorage) {
    var DBService = {};

        DBService.addUserMessages = function(msgList, devicePhoneNo) {
            if($localStorage.webSqlFlag) {
                _.each(msgList.reverse(), function (msg) {
                    var jsonMsg = JSON.parse(msg);
                    var query = "INSERT INTO messages (fromUserId, toUserId, data, sentDate) VALUES (?,?,?,?)";

                    $cordovaSQLite.execute(db, query, [jsonMsg.fromPhoneNo, jsonMsg.toPhoneNo, jsonMsg.message, jsonMsg.sentDate]).then(function (res) {
                        console.log("insertId: " + res.insertId);
                    }, function (err) {
                        console.error(err);
                    });
                })
            }
        }

        DBService.addUserMessage = function(msg, userId) {
            var query = "INSERT INTO messages (fromUserId, toUserId, data, sentDate) VALUES (?,?,?,?)";
            console.log("add message to web SQL " + moment(msg.sentDate).format('MM/DD/YYYY hh:mm:ss'));
            if($localStorage.webSqlFlag) {
                $cordovaSQLite.execute(db, query, [msg.fromPhoneNo, msg.toPhoneNo, msg.message, moment(msg.sentDate).format('MM/DD/YYYY hh:mm:ss')]).then(function (res) {
                    console.log("insertId: " + res.insertId);
                }, function (err) {
                    console.error(err);
                });
            }
        }

        DBService.getUserMessagesForUser = function(user) {
            var deferred = $q.defer();
            if($localStorage.webSqlFlag)
            {
                query = "SELECT fromUserId, toUserId, data, sentDate FROM messages WHERE fromUserId = ? or toUserId = ? order by sentDate desc LIMIT 10 OFFSET " + user.offset ;

                $cordovaSQLite.execute(db, query, [user.userId, user.userId]).then(function (res) {
                    results = parseData(res);
                    user.offset = user.offset + res.rows.length;
                    deferred.resolve(results);
                }, function (err) {
                    console.error(err);
                });
            }

            return deferred.promise;
        }

        DBService.getUserMessages = function(userList) {
            var query = "";
            var deferred = $q.defer();
            var paramList = [];
            if($localStorage.webSqlFlag)
            {
                _.each(userList, function (user, i) {
                    query = query + "SELECT * from (SELECT fromUserId, toUserId, data, sentDate FROM messages WHERE fromUserId = ? or toUserId = ? order by sentDate desc LIMIT 10 OFFSET " + user.offset + ") as " + user.userId;
                    if(i<userList.length-1)
                        query = query + " UNION ALL ";

                    user.offset = user.offset + 10;
                    paramList.push(user.userId);
                    paramList.push(user.userId);
                })

                console.log("query is " + query);

                $cordovaSQLite.execute(db, query, paramList).then(function (res) {
                    results = parseData(res);

                    deferred.resolve(results);
                }, function (err) {
                    console.error(err);
                });
            }

            return deferred.promise;
        }

        parseData = function(res){
            var msgList = [];
            for(var i = 0; i < res.rows.length; i++) {
                var content = {
                    message: res.rows.item(i).data,
                    toPhoneNo: res.rows.item(i).toUserId,
                    fromPhoneNo: res.rows.item(i).fromUserId
                };
                msgList.push(JSON.stringify(content));
            }

            return msgList;
        }

    return DBService;
})

.factory('UserService', function(DBService) {
    var UserService = {};
    var list = [];
        getUser = function(userId) { return _.findWhere(list, {userId: userId}); }

        UserService.getUser = function(userId) { return getUser(userId); }

        UserService.getUsers = function() { return list; }

        UserService.addUser = function(user, currentuser) {

            _.each(user, function(key) {
                console.log("addUser " + JSON.stringify(key) + " currentuser " + JSON.stringify(currentuser));
                if (getUser(key.phoneNo) === undefined) {
                        var u = new User(key.phoneNo, key.lastSeen, key.status);
                        var temp = "unreadCountFor" + u.userId;
                        u.unReadMsgCount = eval(currentuser[temp])===undefined ? 0 :eval(currentuser[temp]);
                        console.log("addUser " + u.userId + " uread " + u.unReadMsgCount + " lastseen " + u.lastSeen);
                        list.push(u);
                }
                else{
                    var addUser = getUser(key.phoneNo);
                    addUser.status = key.status;
                    addUser.lastSeen = key.lastSeen;
                    var temp = "unreadCountFor" + addUser.userId;
                    addUser.unReadMsgCount = eval(key[temp])===undefined ? 0 :eval(key[temp]);
                }
            });

        }

        UserService.addUserMessage = function(userId, msg) {
            var obj =  getUser(userId);
            obj.messages.push(msg);
            DBService.addUserMessage(msg, userId);
        }

        UserService.addUserMessages = function(msgList, devicePhoneNo, dbFlag) {
            _.each(msgList.reverse(), function(msg) {
                console.log("msg is " + JSON.stringify(msg));
                var jsonMsg = JSON.parse(msg);
                var id = jsonMsg.fromPhoneNo;
                if(id == devicePhoneNo)
                    id = jsonMsg.toPhoneNo;

                var obj = getUser(id);
                if(obj != undefined)
                    obj.messages.push(jsonMsg);
            })
            if(dbFlag)
                DBService.addUserMessages(msgList, devicePhoneNo);
        }

        UserService.concatUserMessages = function(msgList, devicePhoneNo, dbFlag) {

            _.each(msgList, function(msg) {
                console.log("concat msg is " + JSON.stringify(msg));
                var jsonMsg = JSON.parse(msg);
                var id = jsonMsg.fromPhoneNo;
                if(id == devicePhoneNo)
                    id = jsonMsg.toPhoneNo;

                var obj = getUser(id);
                if(obj != undefined)
                    obj.messages.unshift(jsonMsg)
            })
            if(dbFlag)
                DBService.addUserMessages(msgList, devicePhoneNo);
        }

        UserService.getUserMessages = function(userId) {
            var obj =  getUser(userId);
            return obj.messages;
        }

        UserService.getLastMessage = function(userId) {
            var obj =  getUser(userId);
            if(obj=== undefined)
                return "";
            else
                return obj.messages[obj.messages.length - 1].message;
        }

        UserService.incrementUnreadCount = function(userId) {
            var obj =  getUser(userId);
            obj.unReadMsgCount = obj.unReadMsgCount + 1;
        }

        UserService.resetUnreadCount = function(userId) {
            var obj =  getUser(userId);
            obj.unReadMsgCount = 0;
        }

        UserService.getUnreadCount = function(userId) {
            var obj =  getUser(userId);
            return obj.unReadMsgCount;
        }

        UserService.getLastSeenForUser = function(userId) {
            var obj =  getUser(userId);
            if(obj=== undefined)
                return "";
            else
                return obj.lastSeen;
        }

        UserService.updateUser = function(user) {
            var jsonUser = user;//JSON.parse(user);
            console.log("disconnected userId " + jsonUser.phoneNo);
            var obj =  getUser(jsonUser.phoneNo);
            if(obj != undefined) {
                obj.lastSeen = jsonUser.lastSeen;
                obj.status = jsonUser.status;
                console.log("user Updated");
            }
        }

        UserService.size = function() { return list.length; }

    return UserService;
});

var User =  function(userId, lastSeen, status) {

    this.userId = userId;
    this.unReadMsgCount = 0;
    this.messages = [];
    this.lastSeen = lastSeen;
    this.status = (status === undefined) ? "Invite" : status;
    this.offset = 0;
}

