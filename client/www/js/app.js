// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova', 'ngStorage'])

.run(function($ionicPlatform, $rootScope, $state, $location, $cordovaSQLite, $localStorage, $q, socket, ContactService, DBService, UserService) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleLightContent();
        }

        if(window.cordova) {
            // App syntax
            console.log("App syntax")
            db = $cordovaSQLite.openDB("starter.db");
            $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS userUnreadCount (userId integer primary key, unreadCount integer default 0 )");
            $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS messages (fromUserId integer,  toUserId integer, data text, sentDate date)");
        } else {
            // Ionic serve syntax
            console.log("Ionic serve syntax")
            $localStorage.webSqlFlag = true;
            try{
                db = window.openDatabase("starter.db", "1.0", "My app", -1);
                $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS userUnreadCount (userId integer primary key, unreadCount integer default 0 )");
                $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS messages (fromUserId integer,  toUserId integer, data text, sentDate date)");
            }catch(ex){
                console.log("err with web sql " + ex);
                $localStorage.webSqlFlag = false;
            }

        }

        if($localStorage.devicePhoneNo!="" && $localStorage.devicePhoneNo!=null)
        {
            socket.emit("join", ContactService.createJsonMsg($localStorage.devicePhoneNo));

            if(!$localStorage.webSqlFlag) {
                socket.emit('user:getMessages', $localStorage.devicePhoneNo);
            }
        }
    })

})

.run(function($rootScope, socket, UserService, $state, $localStorage) {
    $rootScope.fromPhone = '';
    $rootScope.storage = $localStorage;

    socket.on("chat", function(msg){
        console.log("" + JSON.stringify(msg) + "");
        UserService.addUserMessage(msg.fromPhoneNo, msg);
        $rootScope.$broadcast('scroll.bottom');
        if($rootScope.fromPhone == "" || $rootScope.fromPhone != msg.fromPhoneNo)
            UserService.incrementUnreadCount(msg.fromPhoneNo);
    });

    socket.on('user:joined', function(user) {
        console.log("user:joined " + JSON.stringify(user));
        if(user.phoneNo != $localStorage.devicePhoneNo)
            UserService.addUser([user]);
    });

    socket.on("user:receiveMessages", function(msg){
        console.log("" + JSON.stringify(msg) + "");
        UserService.addUserMessages(msg, $localStorage.devicePhoneNo, true);

    });

    socket.on("user:disconnected", function(user){
        console.log("disconnected user " + user);
        UserService.updateUser(user);

    });

    window.onbeforeunload = function() {
        console.log("disconnecting");
        socket.emit("user:disconnect", $localStorage.devicePhoneNo);
    }
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html"
  })

  // Each tab has its own nav history stack:

  .state('tab.dash', {
    url: '/dash',
    views: {
      'tab-dash': {
        templateUrl: 'templates/tab-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

  .state('tab.chats', {
      url: '/chats',
      views: {
        'tab-chats': {
          templateUrl: 'templates/tab-chats.html',
          controller: 'ChatsCtrl'
        }
      }
    })
    .state('tab.chat-detail', {
      url: '/chats/:chatId',
      views: {
        'tab-chats': {
          templateUrl: 'templates/chat-detail.html',
          controller: 'ChatDetailCtrl'
        }
      }
    })

  .state('signup', {
      url: '/sign-up',
      templateUrl: 'templates/user-signup.html',
      controller: 'UserCtrl'
  })

  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/sign-up');

})

.run(function($rootScope, $location, $localStorage) {
    $rootScope.$on( "$stateChangeStart", function(event, next, current) {
        var logged = ($localStorage.devicePhoneNo !="" && $localStorage.devicePhoneNo !=null);

        if (!logged) {
            // no logged user, redirect to /login
            if ( next.templateUrl === "templates/user-signup.html") {
            } else {
                $location.path("/sign-up");
            }
        }
        else if(next.templateUrl === "templates/user-signup.html" && logged){
            $rootScope.fromPhone = "";
            $location.path("/tab/chats");
        }
        else if(next.name != "tab/chat-detail" && logged){
            $rootScope.fromPhone = "";
        }

    });

});