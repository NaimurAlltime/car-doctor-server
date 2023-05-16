const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;

// middleware 
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ynccjdb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// jwt function 
const verifyJWT = (req, res, next) => {
  console.log('hitting verify jwt');
  console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if(!authorization){
     return res.status(401).send({error: true, message: 'unauthorized access'})
  }
  const token = authorization.split(' ')[1];
  console.log('token inside verify jwt', token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");

    // jwt api 
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log('token', token);
      res.send({token});
    })

    // get api services
    app.get('/services', async(req, res) => {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })

    // get api with specific id 
    app.get('/services/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};

      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, img: 1, description: 1, price: 1, service_id: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })


    // booking get api with sum data and jwt verify
    app.get('/bookings', verifyJWT, async(req, res) => {
      // console.log(req.headers.authorization);
      const decoded = req.decoded;
      console.log('come bake after verify', decoded);
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: 'forbidden access'});
      }
      let query = {};
      if(req.query?.email){
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    //booking post api 
    app.post('/bookings', async(req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })



      //booking patch api (update)
      app.patch('/bookings/:id', async(req, res) => {
        const id = req.params.id;
        const booking = req.body;
        console.log(id, booking);
        const filter = {_id: new ObjectId(id)};
        const updatedBooking = {
          $set: {
            status: booking.status
          }
        }
        const result = await bookingCollection.updateOne(filter, updatedBooking);
        res.send(result);
      })

     // booking delete api 
     app.delete('/bookings/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Car doctor server is running!")
})

app.listen(port, () => {
    console.log(`Car doctor server running on port: ${port}`);
})