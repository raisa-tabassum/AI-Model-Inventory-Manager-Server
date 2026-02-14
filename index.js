const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("./ai-model-inventory-manager-serviceKey.json");
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "Unauthorized Access. Token Not Found",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({
      message: "Unauthorized Access.",
    });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("ai-models-db");
    const modelsCollection = db.collection("models");

    app.get("/models", async (req, res) => {
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

    app.delete("/models/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      const model = await modelsCollection.findOne({ _id: new ObjectId(id) });

      if (!model) {
        return res.status(404).send({ message: "Model not found" });
      }

      if (model.createdBy !== req.decoded.email) {
        return res.status(403).send({
          message: "Forbidden! You are not the creator.",
        });
      }
      const result = await modelsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send({
        success: true,
        result,
      });
    });

    // update model
    app.put("/models/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const model = await modelsCollection.findOne({ _id: new ObjectId(id) });
      if (!model) {
        return res.status(404).send({ message: "Model not found" });
      }
      if (model.createdBy !== req.decoded.email) {
        return res.status(403).send({
          message: "Forbidden! You are not the creator.",
        });
      }
      const result = await modelsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );
      res.send({
        success: true,
        result,
      });
    });
    // purchase count,add
    const purchaseCollection = db.collection("purchases");

    app.post("/purchase/:id", verifyToken, async (req, res) => {
      const data = req.body;
      const id = req.params.id;

      const PurchaseResult = await purchaseCollection.insertOne(data);

      // increment
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: {
          purchased: 1,
        },
      };
      const purchaseCount = await modelsCollection.updateOne(filter, update);
      res.send({
        success: true,
        PurchaseResult,
        purchaseCount,
      });
    });

    // my models
    app.get("/my-models", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await modelsCollection
        .find({ createdBy: email })
        .toArray();
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
