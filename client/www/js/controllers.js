//todo update unread count when online and user close window or go offline
//todo update code to get last unread messages from redis when offline and history from web sql and older history from mongodb
//todo notification when not online
//todo add contacts code
//todo test on android and check UI

angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope) {})

.controller('ChatsCtrl', function($rootScope, $scope,  UserService, socket, $localStorage, DBService) {

        socket.on('user:list', function(user) {

            console.log('user:list' + JSON.stringify(user) + " localstorage " + $localStorage.devicePhoneNo);

            var filteredUsers = _.filter(user, function(key){ return key.phoneNo != $localStorage.devicePhoneNo;});
            var currentUser = _.find(user, function(key){ return key.phoneNo == $localStorage.devicePhoneNo;});

            UserService.addUser(filteredUsers, currentUser);
            $scope.users = UserService.getUsers();
            console.log(JSON.stringify(UserService.getUsers()));

            if($localStorage.webSqlFlag) {
                DBService.getUserMessages(UserService.getUsers()).then(function (res) {
                    console.log("result from dbservice " + res)
                    UserService.addUserMessages(res, $localStorage.devicePhoneNo, false);
                });
            }

        });

})

.controller('ChatDetailCtrl', function($rootScope, $scope, $stateParams, UserService, socket, $localStorage, $http,
                                       $ionicScrollDelegate, DBService, $timeout) {
        $rootScope.fromPhone = $stateParams.chatId;
        $scope.data = UserService.getUserMessages($stateParams.chatId);
        if(!angular.isUndefined(UserService.getLastSeenForUser($stateParams.chatId)))
            $scope.lastSeen = moment(UserService.getLastSeenForUser($stateParams.chatId)).format('MM/DD/YYYY hh:mm:ss');
        else
            $scope.lastSeen = null;

        if(UserService.getUnreadCount($stateParams.chatId)>0) {
            UserService.resetUnreadCount($stateParams.chatId);

            $http.put('http://10.0.2.2:8080/api/resetUnreadCount/' + $localStorage.devicePhoneNo + '/' + $rootScope.fromPhone).then(function (result) {
                console.log("result " + result);
            })
        }

        $timeout(function(){
            $ionicScrollDelegate.$getByHandle('myScroll').scrollBottom(true);
        },50);

        $rootScope.$on('scroll.bottom', function() {
            $ionicScrollDelegate.scrollBottom(true);
        })

        $scope.addComment= function(newComment, phoneNo) {
            var content = { message: newComment, toPhoneNo :  phoneNo, fromPhoneNo : $localStorage.devicePhoneNo, sentDate : moment()};
            UserService.addUserMessage(phoneNo, content);
            console.log("sending message " + JSON.stringify(content));
            socket.emit('send', content);
            $scope.newComment = '';
            $ionicScrollDelegate.scrollBottom(true);
        };

        $scope.doRefresh = function() {
            if($localStorage.webSqlFlag) {
                DBService.getUserMessagesForUser(UserService.getUser($rootScope.fromPhone)).then(function (res) {
                    UserService.concatUserMessages(res, $localStorage.devicePhoneNo, false);
                    //$scope.$broadcast('scroll.refreshComplete');
                    $ionicScrollDelegate.scrollTop(true);
                });
            }
            /*$http.put('/api/getMessagesForRange/:userId/:start/:end' + $localStorage.devicePhoneNo + '/' + $rootScope.fromPhone).then(function (result) {
                console.log("result " + result);
            })*/

        };

})


.controller('UserCtrl', function($rootScope, $scope, $state, socket, $localStorage, ContactService) {

        $scope.registerUser = function(phone) {
            console.log('registerUser', phone);

            if (phone != "") {
                $localStorage.devicePhoneNo = phone;
                socket.emit("join", ContactService.createJsonMsg($localStorage.devicePhoneNo));
                socket.emit('user:getMessages', $localStorage.devicePhoneNo);
                $state.go('tab.chats');
                return;
            }

        };

 })

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
