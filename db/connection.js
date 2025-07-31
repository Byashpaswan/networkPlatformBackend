const Mongoose = require('mongoose');
//const MongooseAutoIncrement = require('mongoose-auto-increment');
Mongoose.Promise = Promise;

let options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoIndex: false,
  useUnifiedTopology: true,
  useFindAndModify:false,
};

if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV ==='stage' ) {
  options = {
    ...options,
    replSet: {
      rs_name: "rs0",
      // readPreference: "secondaryPreferred"
    }
  };
}

Mongoose.connect(process.env.MONGODB, options);
const connection = Mongoose.connection;
connection.on('error', function (err) {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
 console.error('MongoDB Connection Error:', err.message);
  process.exit(1);
});

connection.once('open',function callback(){
  console.log(Mongoose.connection.readyState);

})
Mongoose.set("debug", (collectionName, method, query, doc) => {
  // console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
});

