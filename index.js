const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
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