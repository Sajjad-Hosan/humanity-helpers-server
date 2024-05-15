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
    origin: [
      "http://localhost:5173",
      "https://humanityhelpersplatform.web.app",
      "humanityhelpersplatform.firebaseapp.com",
    ],
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

const logger = (req, res, nxt) => {
  // console.log("log:", req.method, "url:", req.url);
  nxt();
};
const verifyToken = async (req, res, nxt) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unAuthorized Access!" });
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unAuthorized Access!" });
    }
    req.user = decoded;
    nxt();
  });
};
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const run = async () => {
  try {
    const platformServices = client
      .db("platformdb")
      .collection("platformServices");
    const platformUsers = client.db("platformdb").collection("platformUsers");
    const platformVolunteers = client
      .db("platformdb")
      .collection("platformVolunteers");
    const volunteerRequestes = client
      .db("platformdb")
      .collection("volunteerRequestes");
    // jwt
    app.post("/jwt", async (req, res, next) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
    // volunteer default db data
    app.get("/volunteers", async (req, res) => {
      const result = await platformServices.find().toArray();
      res.send(result);
    });
    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await platformServices.findOne(filter);
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
    app.patch("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const post = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatePost = {
        $set: {
          thumbnail: post.thumbnail,
          postTitle: post.postTitle,
          description: post.description,
          category: post.category,
          location: post.location,
          dateline: post.dateline,
          volunteerNeed: post.volunteerNeed,
        },
      };
      const result = await platformServices.updateOne(
        filter,
        updatePost,
        option
      );
      res.send(result);
    });
    app.get("/volunteer_posts_count", async (req, res) => {
      const count = await platformServices.estimatedDocumentCount();
      res.send({ count: count });
    });
    // requested userdb data
    app.post(
      "/volunteer_requested/:id",
      logger,
      verifyToken,
      async (req, res) => {
        const request = req.body;
        const id = req.params.id;
        const exFilter = { postId: request.postId };
        const filter = { _id: new ObjectId(id) };
        const existData = await volunteerRequestes.findOne(exFilter);
        if (existData?.postId === request.postId) {
          return res.send({ message: "Data already exist!" });
        }
        await volunteerRequestes.insertOne(request);
        const update = await platformServices.updateOne(filter, {
          $inc: { volunteerNeed: -1 },
        });
        res.send(update);
      }
    );
    app.get(
      "/                                                                  ",
      logger,
      verifyToken,
      async (req, res) => {
        if (req.query?.email !== req.user?.email) {
          return res.status(401).send({ message: "forbidden access" });
        }
        let query = {};
        if (req.query?.email) {
          query = {
            organizerEmail: req.query.email,
          };
        }
        const result = await volunteerRequestes.find(query).toArray();
        res.send(result);
      }
    );
    app.delete(
      "/volunteer_requested/:id",
      logger,
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const result = await volunteerRequestes.deleteOne(filter);
        res.send(result);
      }
    );
    //
    // user data get,put,post,delete methods_____
    app.get("/user_volunteer_post/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await platformUsers.findOne(filter);
      res.send(result);
    });
    app.get("/user_volunteer_posts", logger, verifyToken, async (req, res) => {
      if (req.query?.email !== req.user?.email) {
        return res.status(401).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = {
          organizerEmail: req.query.email,
        };
      }
      const result = await platformUsers.find(query).toArray();
      res.send(result);
    });
    app.post("/user_volunteer_post", logger, verifyToken, async (req, res) => {
      const post = req.body;
      const result = await platformUsers.insertOne(post);
      res.send(result);
    });
    app.patch(
      "/user_volunteer_post/:id",
      logger,
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        const post = req.body;
        const filter = { _id: new ObjectId(id) };
        const option = { upsert: true };
        const updatePost = {
          $set: {
            thumbnail: post.thumbnail,
            postTitle: post.postTitle,
            description: post.description,
            category: post.category,
            location: post.location,
            dateline: post.dateline,
            volunteerNeed: post.volunteerNeed,
          },
        };
        const result = await platformUsers.updateOne(
          filter,
          updatePost,
          option
        );
        res.send(result);
      }
    );
    app.delete(
      "/user_volunteer_post/:id",
      logger,
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await platformUsers.deleteOne(filter);
        res.send(result);
      }
    );

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
