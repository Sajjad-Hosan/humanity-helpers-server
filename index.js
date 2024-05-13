const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.t3cl13a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    const platformServices = client
      .db("platformdb")
      .collection("platformServices");
    const platformUsers = client.db("platformdb").collection("platformUsers");
    const platformVolunteers = client
      .db("platformdb")
      .collection("platformVolunteers");

    app.get("/volunteers", async (req, res) => {
      const result = await platformServices.find().toArray();
      res.send(result);
    });

    app.post("/volunteers", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await platformServices
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });
    app.get("/volunteer_posts_count", async (req, res) => {
      const count = await platformServices.estimatedDocumentCount();
      res.send({ count: count });
    });
    // user data get,put,post,delete methods_____
    app.get("/user_volunteer_posts", async (req, res) => {
      // console.log('email:',req.query)
      if (req.query?.email !== req.user?.email) {
        return res.status(401).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await platformUsers.find(query).toArray();
      res.send(result);
    });
    app.post("/user_volunteer_post", async (req, res) => {
      const post = req.body;
      const result = await platformUsers.insertOne(post);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    //
  }
};
run().catch((e) => console.log(e));

app.get("/", (req, res) => {
  res.send("The Humanity Helpers Platform is running now!");
});
app.listen(port, () => {
  console.log(`the sever is running now ${port}`);
});
