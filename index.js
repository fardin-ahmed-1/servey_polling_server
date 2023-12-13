const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.STRIPE_SECRUTE_KEY);


// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://survey-polling.netlify.app'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}
const url = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Passworod}@cluster0.sdbmurj.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const usersCollection = client.db('Assignment12DB').collection('users')
    const surveryCollection = client.db('Assignment12DB').collection('survery')
    const UserFeedbackCollection = client.db('Assignment12DB').collection('userFeedback')
    const surveryPollingCollection = client.db('Assignment12DB').collection('surveryPolling')
    const pricingCollection = client.db('Assignment12DB').collection('PricingData')
    const paymentsCollection = client.db('Assignment12DB').collection('payments')

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log('I need a new jwt', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
        .send({ success: true })
    })

    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // Save or modify user email, status in DB
    app.put('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await usersCollection.findOne(query)
      if (isExist) return res.send(isExist)
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, creationTime: Date.now() },
        },
        options
      )
      res.send(result)
    })


    // get user role
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      res.send(result)
    })
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })


    // Survery collection
    app.post('/survery',  async (request, response) => {
      const surveryData = request.body;
      const result = await surveryCollection.insertOne(surveryData)
      response.send(result)
    })

    app.get('/surverys', async (req, res) => {
      const result = await surveryCollection.find().toArray()
      res.send(result)
    })

    app.get('/surverys/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await surveryCollection.findOne(query)
      res.send(result)
    })

    // Pricing getdata API
    app.get('/pricingplan', async (req, res) => {
      const result = await pricingCollection.find().toArray()
      res.send(result)
    })

    app.get('/pricing/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await pricingCollection.findOne(query)
      res.send(result)
    })



    // All survery Post Request
    app.get('/allPostRequest', async (req, res) => {
      const result = await surveryCollection.find().toArray()
      res.send(result)
    })

    // My Survery
    app.get('/mysurvery/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await surveryCollection.find(query).toArray()
      res.send(result)
    })

    // Update My servery
    app.put("/updateservery/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedservery = {
        $set: {
          title: data.title,
          endDate: data.endDate,
          description: data.description,
          selectedCategory: data.category
        }
      };
      const result = await surveryCollection.updateOne(
        filter,
        updatedservery,
        options
      );
      res.send(result);
    });

    // Update servery Status for Published
    app.put("/surveryStatusPublished/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedservery = {
        $set: {
          status: 'Published',
          message: data.message
        }
      };
      const result = await surveryCollection.updateOne(
        filter,
        updatedservery,
        options
      );
      res.send(result);
    });

    // Update servery Status for UnPublished
    app.put("/surveryStatusUnPublished/:id", verifyToken,  async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedservery = {
        $set: {
          status: 'Unpublished',
          message: data.message
        }
      };
      const result = await surveryCollection.updateOne(
        filter,
        updatedservery,
        options
      );
      res.send(result);
    });


    // change user role API
    app.put("/changeRole/:id",verifyToken,  async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedservery = {
        $set: {
          role: data.changeUserRole,
        }
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedservery,
        options
      );
      res.send(result);
    });

    // change user role API
    app.put("/makeproUser/:id",verifyToken,  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedservery = {
        $set: {
          role:"proUser",
        }
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedservery,
        options
      );
      res.send(result);
    });

    // Post user Comment
    app.post('/userFeedback', verifyToken,  async (request, response) => {
      const surveryData = request.body;
      const result = await UserFeedbackCollection.insertOne(surveryData)
      response.send(result)
    })

    // get User comment
    app.get('/getAllComment', async (req, res) => {
      const result = await UserFeedbackCollection.find().toArray()
      res.send(result)
    })


    // get Update data
    app.get('/updateservery/:id', verifyToken,  async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await surveryCollection.findOne(query)
      res.send(result)
    })

    // Servery delete API
    app.delete("/survery/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await surveryCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    })

    // Survery and Polling post Api
    app.post('/surverypolling', verifyToken,  async (request, response) => {
      const pulling = request.body;
      const result = await surveryPollingCollection.insertOne(pulling)
      response.send(result)
    })
    // Survery's polling and vote
    app.put("/surveryvote/:id", verifyToken,  async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const postVoted = {
        $set: {
          voted: data.vote
        }
      };
      const result = await surveryCollection.updateOne(
        filter,
        postVoted,
        options
      );
      res.send(result);
    })

    // Survery like and desLike
    app.put("/getLike/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log(data.like);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const postLike = {
        $set: {
          like: data.like
        }
      };
      const result = await surveryCollection.updateOne(
        filter,
        postLike,
        options
      );
      res.send(result);
    });

    // Survery like and desLike
    app.put("/getdislike/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log(data.like);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const psotDislike = {
        $set: {
          dislike: data.dislike
        }
      };
      const result = await surveryCollection.updateOne(
        filter,
        psotDislike,
        options
      );
      res.send(result);
    });

    // Create Payment intent
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const  {price} = req.body;
      const amount = parseInt(price * 100)
      if (!price || amount < 1) {
        return
      }
      const {client_secret} = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      res.send({ clientSecret: client_secret });

    })
      // save payment data in database
    app.post('/paymentInfo', verifyToken, async(req, res)=>{
      const payment=req.body;
      const result = await paymentsCollection.insertOne(payment)
      res.send(result)
    })
    // GetPayment infor 
    app.get('/paymentInfo', verifyToken, async(req, res)=>{
      const result = await paymentsCollection.find().toArray()
      res.send(result)
    })
    


    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Survery monkey Server..')
})

app.listen(port, () => {
  console.log(`Survery monkey is running on port ${port}`)
})
