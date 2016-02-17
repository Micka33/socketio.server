"use strict";

//Dependencies
var app                   = require('express')(),
    server                = require('http').Server(app),
    io                    = require('socket.io')(server),
    _                     = require('underscore'),
    redis                 = require('redis'),
    moment                = require('moment'),
    yaml                  = require('js-yaml'),
    fs                    = require('fs');

//Configuation
var pubsub_prefix         = 'socketio.',
    redis_conf            = yaml.safeLoad(fs.readFileSync('./redis.yml', 'utf8')),
    env                   = process.env.NODE_ENV            || 'development',
    port                  = process.env.REDIS_PORT          || redis_conf[env].port,
    host                  = process.env.REDIS_HOST          || redis_conf[env].host,
    subscriber_redis      = redis.createClient(port, host);

var log = function(msg) {console.log('['+moment().format('h:mm:ss a')+'] '+msg);};

// Not binding the 'error' event will cause node to stop when Redis is unreachable
subscriber_redis.on('error', function(err) {log('Connection to Redis failed: ['+err+']');});


var sockets = {};

subscriber_redis.on('ready', function() {log('Subscriber Redis is ready to request.');
  subscriber_redis.on('pmessage', function (pat, chann, message) {
    var user_channel = chann.split('/')[0] + '/';
    log('New message in '+chann+' ('+pat+'): '+message+'.');
    log('io.to('+user_channel+').emit(message, {chann:'+chann+', message:'+message+'});');
    io.to(user_channel).emit('message', {chann:chann, message:message});
  });
});


io.on('connection', function (socket) {
  socket.on('subscribe', function (rooms)
  {
    _.each(rooms, function(room/*, index, list*/) {
      log('+1: '+pubsub_prefix+room);
      socket.join(pubsub_prefix+room);
      subscriber_redis.psubscribe(pubsub_prefix+room+'*');


    });
  });
});

server.listen(8811, 'localhost');
log("listenning on localhost:8811");


// <script>
//   var socket = io.connect("localhost:8811");
//   socket.emit('subscribe', ['achannel', anotherchannel]);
//   socket.on('connect', function() {
//      socket.on('message', function (data) {
//         console.log(data);
//       });
//   });
// </script>
