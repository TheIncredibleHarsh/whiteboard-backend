const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const firebase = require('firebase/app');
const firestore = require('firebase/firestore');
const crypto = require('crypto');

require('dotenv').config();

const firebaseConfig = {
  apiKey: "AIzaSyAHzoxUGSYMFTl1HIRtocBe7bStGsSyNVc",
  authDomain: "whiteboard-harsh.firebaseapp.com",
  projectId: "whiteboard-harsh",
  storageBucket: "whiteboard-harsh.appspot.com",
  messagingSenderId: "1011591292914",
  appId: "1:1011591292914:web:6c9cf994c3546aecbc6d6b",
  measurementId: "G-6E1H0V182V"
};

app.options('*', cors({
  origin: '*'
}));
app.use(cors({
  origin: '*'
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "etchsketch.xyz");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
  next();
});

app.use(express.json());

const firebaseApp = firebase.initializeApp(firebaseConfig)
const db = firestore.getFirestore(firebaseApp);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
});

io.on("connection", (socket) => {

  socket.on('connect-to-room', (data)=>{
    socket.join(data.roomKey);
  });

  socket.on('network-paint-start', (data) => {
    io.to(data.roomKey).emit('paint-start', data);
  });

  socket.on('network-paint-draw', (data) => {
    io.to(data.roomKey).emit('paint-draw', data);
  });

  socket.on('network-paint-stop', (data) => {
    io.to(data.roomKey).emit('paint-stop', data);
  });
});

let port = process.env.PORT || 3000;

httpServer.listen(port, ()=> {
    console.log(`Server running at port ${port}`)
})

function generateRoomId(length=5){
  var alpha = "abcdefghijklmnopqrstuvwxyz123567890"

  code = ""
  for(var i = 0; i<length ;i++){
    code += alpha.charAt(Math.random()*alpha.length);
  }
  return code;
}

async function createNewRoom(data){
  try{
    if(data.creatorSessionId == null)
      return false;
    const roomQuery = firestore.query(firestore.collection(db, "rooms"), firestore.where("creatorSessionId", "==", data.creatorSessionId));
    const querySnapshot = await firestore.getDocs(roomQuery);
    const doc = querySnapshot.docs[0];
    if(doc != null){
      let userList = doc.data().users;
      userList.map((user) => {
        if(user.sessionId == data.creatorSessionId){
          user.socketId = data.users[0].socketId;
        }
      })
      await firestore.setDoc(doc.ref, {users: userList}, {merge: true});
      return {success: true, data: doc.data()}
    }else{
      const docRef = await firestore.addDoc(firestore.collection(db, 'rooms'), data);
      return {success: true, data: data}
    }
  }catch (e){
    console.error(e);
    return false;
  }
}

async function joinRoom(roomKey, user){
  try{
    const roomQuery = firestore.query(firestore.collection(db, "rooms"), firestore.where("roomKey", "==", roomKey));
    const querySnapshot = await firestore.getDocs(roomQuery);
    const doc = querySnapshot.docs[0];
    if(doc != null){
      var users = doc.data().users;
      users = (Array.isArray(users) && users.length>0) ? users : [];
      var userExists = false;
      const newUserList = users.map(roomUser => {
        if(roomUser.sessionId == user.sessionId){
            userExists = true;
            roomUser.socketId = user.socketId;
            // roomUser.playerName = player.playerName;
        }
        return roomUser;

      })

      if(userExists != true) {
        newUserList.push(user);
      }

      await firestore.setDoc(doc.ref, {users: newUserList}, {merge: true} );
      return {success: true, roomKey: roomKey}
    }else{
      return {success: false, message: "Room does not exist"}
    }
  }catch(e){
    return {sucess: false, message: e}
  }
}

app.post('/create-room', (req, res) =>{
  let createParams = {
    roomKey: generateRoomId(),
    creatorSessionId: req.body.sessionId,
    users: [
      {
        sessionId: req.body.sessionId,
        socketId: req.body.socketId
      }
    ]
  };

  createNewRoom(createParams)
    .then((result)=>{
      if(result.success == true){
        res.json({status: 200, roomKey: result.data.roomKey})
      }else{
        res.end(JSON.stringify({status: 500}))
      }
    });
});


app.post('/join-room/:roomKey', (req, res) =>{
  let user = {
    sessionId: req.body.sessionId,
    socketId: req.body.socketId
  };

  let roomKey = req.params.roomKey;

  joinRoom(roomKey, user)
    .then((result)=>{
      if(result.success == true){
        res.end(JSON.stringify({success: true, roomKey: roomKey}))
      }
    });
});

app.get('/', (req, res) =>{ 
  res.end(JSON.stringify({success: true}))
});
