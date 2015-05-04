/**
 * Created by sjayaram on 4/26/2015.
 */
var redisStore = require('./redisStore.js');
var debug = require('debug')('chatApp-routes');

module.exports = function(app) {

    app.put('/api/resetUnreadCount/:userId/:from', function (req, res) {
        redisStore.resetUnreadCount(req.params.from, req.params.userId);
        res.sendStatus(200);
    });

    app.put('/api/updateUnreadCount/', function (req, res) {
        //redisStore.resetUnreadCount(req.body.from, req.params.userId);
        res.sendStatus(200);
    });

    app.get('/api/getMessagesForRange/:userId/:start/:end', function (req, res) {
        redisStore.getMessagesForRange(req.params.userId, req.params.start, req.params.end).then(function (messages) {
            debug("messages " + JSON.stringify(messages));
            res.send(messages);
        });
    });

}