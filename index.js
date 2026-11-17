const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db = client.db("equipmentRentalDB");
    const usersCollection = db.collection("users");
    const equipmentCollection = db.collection("equipment");
    const bookingsCollection = db.collection("bookings");
    const paymentsCollection = db.collection("payments");
    const favoritesCollection = db.collection("favorites");

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = authHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== 'Admin') {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    const verifyOwner = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== 'Owner') {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    const verifyRenter = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== 'Customer') {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Equipment Rental Platform Server is Running!');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
