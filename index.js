const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.t3cl13a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


app.use(express.json());

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
