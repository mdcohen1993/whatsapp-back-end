//imports
const express = require("express");
const mongoose = require("mongoose");
const Messages = require("./dbMessages.js");
const Pusher = require("pusher");
const cors = require("cors");

//config
const app = express();
const port = process.env.PORT || 9000;


const pusher = new Pusher({
  appId: process.env.APP_ID,
  key: process.env.KEY,
  secret: process.env.SECRET,
  cluster: process.env.CLUSTER,
  useTLS: true
});

pusher.trigger("my-channel", "my-event", {
  message: "hello world"
});

//middleware
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
})

//DB config
const dbPassword = "Hilleltorah1993!"
const connection_url = "mongodb+srv://mdcohen1993:"+dbPassword+"@cluster0.clbnj.mongodb.net/whatsapp-clone-db?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.once("open", ()=>{
    console.log("DB Connected");

    const msgCollection = db.collection("messagecontent");
    const changeStream = msgCollection.watch();

    changeStream.on("change", change =>{
        console.log("A change occured", change);

        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;
            pusher.trigger("message", "inserted",
            {
                name: messageDetails.user,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp
            })
        } else {
            console.log("error triggering Pusher")
        }
    });
});

//api routes
app.get('/', (req, res)=>res.status(200).send('hello world'));

app.get("/messages/sync", (req,res)=>{
    Messages.find((err, data) =>{
        if(err) {
            res.status(500).send(err)
        } else{
            res.status(200).send(data)
        };
    });
});

app.post("/messages/new", (req, res)=> {
    const dbMessage = req.body;

    Messages.create(dbMessage, (err, data) =>{
        if(err) {
            res.status(500).send(err)
        }else{
            res.status(201).send(data)
        }
    })
});



//app listening
app.listen(port,()=>console.log(`Listening on localhost:${port}`));
