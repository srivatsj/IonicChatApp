/**
 * Created by sjayaram on 4/23/2015.
 */
var redis = require('redis');
var moment = require('moment');
var Q = require('q');
var client = redis.createClient();
var debug = require('debug')('chatApp-redis');

function RedisStore() {
    redis.debug_mode = false;
    client.on('connect', function() {
        debug('connected');
    });
}

RedisStore.prototype.addUser = function(userId, socketId) {
    var deferred = Q.defer();
    client.hmset(userId, "socketId", socketId, "lastSeen", moment(), "status", "Online", function (err, obj) {
        if(err) debug("error adding users " + err);
        debug("Added user " + userId);
        module.exports.getUserInfo(userId).then(function (user) {
            deferred.resolve(user);
        });
    });
    return deferred.promise;
};

RedisStore.prototype.getUserInfo = function(userId) {
    var deferred = Q.defer();
    debug("userId " + userId);
    client.hgetall(userId, function (err, obj) {
        if(obj==null)
        {
            obj = {};
        }
        obj["phoneNo"] = userId;
        if(err){ debug("error getting users " + err); deferred.resolve(""); }
        debug(obj);

        deferred.resolve(obj);
    });
    return deferred.promise;
};

RedisStore.prototype.updateLastSeenInfo = function(userId) {
    client.hmset(userId, "lastSeen", moment(), redis.print);
};

RedisStore.prototype.updateUnreadCount = function(from, userId) {
    client.hmget(userId, "unreadCountFor" + from, function(err, obj){
            if(obj[0]==null)
                obj =1;
            else
                obj = JSON.parse(obj) +1;
            client.hmset(userId, "unreadCountFor" + from, obj);
    });
};

RedisStore.prototype.resetUnreadCount = function(from, userId) {
    client.hmset(userId, "unreadCountFor" + from, 0 , redis.print);
};


RedisStore.prototype.disconnectUser = function(userId) {
    var deferred = Q.defer();

    client.hmset(userId, "lastSeen", moment(), "status", "Offline", function (err, data) {
        debug("disconnected user " + userId);
        module.exports.getUserInfo(userId).then(function (user) {
            deferred.resolve(user);
        });
    });

    return deferred.promise;
};

RedisStore.prototype.addMessage = function(msg) {
    var content = {"message": msg.message, "fromPhoneNo": msg.fromPhoneNo, "toPhoneNo": msg.toPhoneNo, "sentDate": msg.sentDate};
    debug("content is " + JSON.stringify(content));
    client.lpush("messages:" + msg.fromPhoneNo, JSON.stringify(content), redis.print);
    client.lpush("messages:" + msg.toPhoneNo, JSON.stringify(content), redis.print);
    debug("done");
};

RedisStore.prototype.getMessages = function(userId) {
    var deferred = Q.defer();

    client.lrange("messages:" + userId, 0, -1, function (err, data) {
          deferred.resolve(data);
    });

    return deferred.promise;
};

module.exports = exports = new RedisStore();