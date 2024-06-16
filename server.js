const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const firebase = require('firebase/app');
const firestore = require('firebase/firestore');
const crypto = require('crypto');

const firebaseConfig = {
  apiKey: "AIzaSyAHzoxUGSYMFTl1HIRtocBe7bStGsSyNVc",
  authDomain: "whiteboard-harsh.firebaseapp.com",
  projectId: "whiteboard-harsh",
  storageBucket: "whiteboard-harsh.appspot.com",
  messagingSenderId: "1011591292914",
  appId: "1:1011591292914:web:6c9cf994c3546aecbc6d6b",
  measurementId: "G-6E1H0V182V"
};


app.use(cors());
app.use(express.json());

const firebaseApp = firebase.initializeApp(firebaseConfig)
const db = firestore.getFirestore(firebaseApp);


const httpServer = http.createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    },
});

io.on("connection", (socket) => {
  console.log(`connected: ${socket.id}`)
  socket.on('user-connected', (data) => {
    createNewRoom(data)
      .then((result) => {
        console.log(result);

        if(result.data != null){
          console.log('emitting')
          socket.emit('roomkey', {
            roomKey: result.data.roomKey
          })
        }
      });
  })
});

httpServer.listen(4000, ()=> {
    console.log("Server running at port 4000")
})

async function createNewRoom(data){
  try{
    data.roomKey = generateRoomId();
    if(data.sessionid == null)
      return false;
    const roomQuery = firestore.query(firestore.collection(db, "rooms"), firestore.where("sessionid", "==", data.sessionid));
    const querySnapshot = await firestore.getDocs(roomQuery);
    const doc = querySnapshot.docs[0];
    if(doc != null){
      return {sucess: false, data: doc.data()}
    }else{
      const docRef = await firestore.addDoc(firestore.collection(db, 'rooms'), data);
      return {success: true, data: data}
    }
  }catch (e){
    console.error(e);
    return false;
  }
}

function generateRoomId(length=5){
  var alpha = "abcdefghijklmnopqrstuvwxyz123567890"

  code = ""
  for(var i = 0; i<length ;i++){
    code += alpha.charAt(Math.random()*alpha.length);
  }
  return code;
}