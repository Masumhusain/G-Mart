const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
  name: String,
  price: Number,
  image: String,
  owner:  {
    type: Schema.Types.ObjectId,
    ref: "User",
  }
});

// Create and export the model ✅
const Product = mongoose.model('Product', productSchema);
module.exports = Product; // ✅ This line was missing