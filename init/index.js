const mongoose = require('mongoose');
const Product = require('../models/product'); // ✅ correct path to Product model
const initData = require('./data.js'); // your products data

main().then((res)=> {
    console.log("dbase is connected")
}).catch((err)=> {
    console.log(err);
})
async function main() {
   await  mongoose.connect('mongodb://127.0.0.1:27017/E-commerce');
}

 

const initDB = async ()=> {
  await Product.deleteMany({});
  initData.data = initData.map((obj) => ({...obj, owner: "688d903db8d360009534ec8f"}));
  console.log(initData);
  await Product.insertMany(initData.data);
  console.log("data was initialized");

}


initDB().then((res)=>  {
  console.log("init Db is called");
}).catch((err)=> {
  console.log("error in init db", err.message);
})