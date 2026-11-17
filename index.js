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
      const token = authHeader.split(' ');
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

    app.post('/users', async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null });
      }
      const newUser = {
        name: user.name,
        email: user.email,
        image: user.image || '',
        role: user.role || 'Customer',
        phone: user.phone || '',
        address: user.address || '',
        createdAt: new Date()
      };
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send({ role: user?.role || 'Customer' });
    });

    app.get('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const user = await usersCollection.findOne({ email });
      res.send(user);
    });

    app.patch('/users/profile/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const { name, image, phone, address } = req.body;
      const updateDoc = {
        $set: { name, image, phone, address }
      };
      const result = await usersCollection.updateOne({ email }, updateDoc);
      res.send(result);
    });

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch('/users/role/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send(result);
    });

    app.get('/equipment/featured', async (req, res) => {
      const result = await equipmentCollection
        .find({ status: 'Approved' })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get('/equipment', async (req, res) => {
      const { search, category, rentalType, minPrice, maxPrice, availability, sort, page = 1, limit = 9 } = req.query;
      const query = { status: 'Approved' };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }

      if (category && category !== 'All') {
        query.category = category;
      }

      if (rentalType && rentalType !== 'All') {
        query.rentalType = rentalType;
      }

      if (minPrice || maxPrice) {
        query.rentalPrice = {};
        if (minPrice) query.rentalPrice.$gte = parseFloat(minPrice);
        if (maxPrice) query.rentalPrice.$lte = parseFloat(maxPrice);
      }

      if (availability === 'available') {
        query.availableQuantity = { $gt: 0 };
      } else if (availability === 'unavailable') {
        query.availableQuantity = { $lte: 0 };
      }

      let sortOption = { createdAt: -1 };
      if (sort === 'price_asc') {
        sortOption = { rentalPrice: 1 };
      } else if (sort === 'price_desc') {
        sortOption = { rentalPrice: -1 };
      } else if (sort === 'newest') {
        sortOption = { createdAt: -1 };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await equipmentCollection.countDocuments(query);
      const result = await equipmentCollection
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      res.send({
        equipment: result,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page)
      });
    });

    app.get('/equipment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await equipmentCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post('/equipment', verifyToken, verifyOwner, async (req, res) => {
      const item = req.body;
      const newEquipment = {
        ...item,
        rentalPrice: parseFloat(item.rentalPrice),
        availableQuantity: parseInt(item.availableQuantity),
        status: 'Pending',
        createdAt: new Date()
      };
      const result = await equipmentCollection.insertOne(newEquipment);
      res.send(result);
    });

    app.get('/equipment/owner/:email', verifyToken, verifyOwner, async (req, res) => {
      const email = req.params.email;
      const result = await equipmentCollection.find({ ownerEmail: email }).sort({ createdAt: -1 }).toArray();
      res.send(result);
    });

    app.patch('/equipment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedItem = req.body;
      const updateDoc = {
        $set: {
          name: updatedItem.name,
          description: updatedItem.description,
          category: updatedItem.category,
          location: updatedItem.location,
          rentalPrice: parseFloat(updatedItem.rentalPrice),
          rentalType: updatedItem.rentalType,
          availableQuantity: parseInt(updatedItem.availableQuantity),
          condition: updatedItem.condition,
          brand: updatedItem.brand,
          model: updatedItem.model,
          image: updatedItem.image,
          terms: updatedItem.terms
        }
      };
      const result = await equipmentCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
      res.send(result);
    });

    app.delete('/equipment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await equipmentCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get('/admin/equipment', verifyToken, verifyAdmin, async (req, res) => {
      const result = await equipmentCollection.find().sort({ createdAt: -1 }).toArray();
      res.send(result);
    });

    app.patch('/admin/equipment/status/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const result = await equipmentCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result);
    });

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
app.post('/favorites', verifyToken, verifyRenter, async (req, res) => {
      const favorite = req.body;
      const existing = await favoritesCollection.findOne({
        userEmail: favorite.userEmail,
        equipmentId: favorite.equipmentId
      });
      if (existing) {
        return res.send({ message: 'Already in favorites', insertedId: null });
      }
      const result = await favoritesCollection.insertOne({
        ...favorite,
        createdAt: new Date()
      });
      res.send(result);
    });

    app.get('/favorites/:email', verifyToken, verifyRenter, async (req, res) => {
      const email = req.params.email;
      const result = await favoritesCollection.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
      res.send(result);
    });

    app.delete('/favorites/:id', verifyToken, verifyRenter, async (req, res) => {
      const id = req.params.id;
      const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post('/bookings', verifyToken, verifyRenter, async (req, res) => {
      const booking = req.body;
      const equipment = await equipmentCollection.findOne({ _id: new ObjectId(booking.equipmentId) });
      if (!equipment || equipment.availableQuantity < parseInt(booking.quantity)) {
        return res.status(400).send({ message: 'Requested quantity is not available' });
      }
      const newBooking = {
        ...booking,
        quantity: parseInt(booking.quantity),
        totalAmount: parseFloat(booking.totalAmount),
        paymentStatus: 'Unpaid',
        bookingStatus: 'Pending',
        bookingDate: new Date()
      };
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get('/bookings/customer/:email', verifyToken, verifyRenter, async (req, res) => {
      const email = req.params.email;
      const result = await bookingsCollection.find({ customerEmail: email }).sort({ bookingDate: -1 }).toArray();
      res.send(result);
    });

    app.get('/bookings/owner/:email', verifyToken, verifyOwner, async (req, res) => {
      const email = req.params.email;
      const result = await bookingsCollection.find({ ownerEmail: email }).sort({ bookingDate: -1 }).toArray();
      res.send(result);
    });

    app.get('/admin/bookings', verifyToken, verifyAdmin, async (req, res) => {
      const result = await bookingsCollection.find().sort({ bookingDate: -1 }).toArray();
      res.send(result);
    });