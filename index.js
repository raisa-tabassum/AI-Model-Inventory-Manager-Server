const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.wsasknz.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("ai-models-db");
    const modelsCollection = db.collection("all-models");

    app.get("/all-models", async (req, res) => {
      const models = await modelsCollection.find().toArray();
      res.send(models);
    });

    app.get("/featured-models", async (req, res) => {
      const result = await modelsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/models/:id", async (req, res) => {
      const id = req.params.id;
      const model = await modelsCollection.findOne({ _id: new ObjectId(id) });
      res.send(model);
    });

    // for add models page
    app.post("/models", async (req, res) => {
      const model = req.body;
      const result = await modelsCollection.insertOne(model);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server in running fine!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
