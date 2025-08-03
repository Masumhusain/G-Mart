if(process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const port = 8080;
const mongoose = require("mongoose");
const  engine = require('ejs-mate');
const path = require("path");
const  cookieParser = require('cookie-parser');
const Product = require("./models/product");   
const methodOverride = require('method-override');
const ExpressError = require("./utils/expressError");
const wrapasync = require("./utils/wrapasync");
const {productSchema} = require("./schema.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const {isLoggedIn} = require("./middleware.js");
const {saveRedirectUrl} = require("./middleware.js");
const http = require('http').createServer(app);
const io = require('socket.io')(http);




app.use(methodOverride('_method')); 
app.engine("ejs", engine);
app.use(cookieParser("secret: mysupersecretcode"));
app.set("view engine", "ejs");



app.set("views", path.join(__dirname , "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended: true}));  
app.use(express.json());




// seting database 
// let MONGO_URL = 'mongodb://127.0.0.1:27017/E-commerce';


main().then((res)=> {
    console.log("dbase is connected")
}).catch((err)=> {
    console.log(err);
})



async function main() {
   await  mongoose.connect(process.env.ATLAS_DB_URL);
}


//validate Products
const validateProducts = (req, res, next)=> {
    const {error} = productSchema.validate(req.body);
    
    if(error) {
        return next( new ExpressError(400 , error.details[0].message));
    }else {
        next();
    }
}
const store = MongoStore.create( {
    mongoUrl: process.env.ATLAS_DB_URL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600
});

store.on("error", ()=>{
    console.log("ERROR in session store", err);
})



// session middleware
const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:  {
        expires: Date.now() + 7 * 24 * 60 *60 * 1000,
        maxAge: 7 * 24 * 60 *60 * 1000,
        httpOnly: true,
    }
}







// app.get("/", (req , res)=> {
//     res.send("hello i am root!");
// })



app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res , next)=> {
    res.locals.success = req.flash("success");
    res.locals.destroy = req.flash("destroy");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

// index products 
app.get("/products", async(req, res)=> {
    let listings = await Product.find({});
    if(!listings) {
        next(new ExpressError(403 , "no product found"));
    }
   
    res.render("listings/index", {listings});
})


// new  
app.get("/products/new",isLoggedIn ,  (req, res)=> {
    res.render("listings/new.ejs");
});


app.get("/products/about", (req ,res)=> {
    res.render("listings/about.ejs");
})

//create products
// app.post("/products",validateProducts,saveRedirectUrl,  wrapasync( async(req, res)=> {
//    let newProduct = new Product(req.body.Product);
//       newProduct.owner  = req.user._id;
//       await newProduct.save();
//      req.flash("success", "new product added");
//     res.redirect("/products");
// }));

app.post("/products", validateProducts, saveRedirectUrl, wrapasync( async(req, res)=> {
    let newProduct = new Product(req.body.Product);
       newProduct.owner  = req.user._id;
       await newProduct.save();

       io.emit("product-added" , newProduct);

      req.flash("success", "new product added!");
     res.redirect("/products");
}))



//cart 
// example route: add to cart
app.post("/cart/add/:id", isLoggedIn, async (req, res) => {
  const product = await Product.findById(req.params.id);

  // Add to user cart logic here...

  io.emit("cart-updated", {
    user: req.user.username,
    productName: product.name
  });

  res.redirect("/cart"); // or wherever you go after adding to cart
});


//edit 
app.get("/products/:id/edit",isLoggedIn, wrapasync( async(req, res)=>{
    let {id} = req.params;
    let product = await Product.findById(id);
    res.render("listings/edit.ejs", {product});
}));



//update
app.put("/products/:id",saveRedirectUrl, wrapasync( async(req, res)=>{
    let {id} = req.params;
    console.log("params id" , req.params.id);
    let product = req.body;
    let updateProduct = await Product.findByIdAndUpdate(id, product);
    req.flash("success", "product updated");
    res.redirect(`/Products/${id}!`)
}));





// app.delete("/products/:id",isLoggedIn ,   wrapasync( async(req , res)=> {
//     let {id} = req.params;
//     let delProducts = await Product.findByIdAndDelete(id);
//     console.log(delProducts);
//     req.flash("destroy", "product deleted");
//     res.redirect("/products");
// }));

app.delete("/products/:id", isLoggedIn, wrapasync(async(req, res)=> {
    let {id} = req.params;
    let delProducts = await Product.findByIdAndDelete(id);

    io.emit("deleted-product", id);
    
    req.flash("destroy", "product deleted");
    res.redirect("/products");
}))


//show  route
app.get("/products/:id", wrapasync(async(req, res, next)=> {
    let id = req.params.id;

    let product = await Product.findById(id).populate("owner");
    if(!product) {
        next(new ExpressError(404 , "product not found"));  
    }
    res.render("listings/show", {product});
    // res.render("listings/show", {product});
}));



//signUp and login route
app.get("/signup", (req , res)=> { 
    res.render("users/signup.ejs")}) ;



    app.post("/signup", wrapasync(async(req , res)=> {
        try {
            let {username , email , password} = req.body;
       const newUser =  new User({email, username});
      const registeredUser =  await User.register(newUser , password);
      console.log(registeredUser);
     req.login(registeredUser, ((err)=> {
        if(err) {
            return next(err);
        }
        else {
             req.flash("success", "welcome to listings");
             res.redirect("/products");
        }
    }))}catch(e) {
            req.flash("destroy", e.message);
            res.redirect("/signup");
        }
        
    }));

    //login route
    app.get("/login", (req , res)=> {
        res.render("users/login.ejs");
    })


    app.post("/login" , saveRedirectUrl,
        passport.authenticate('local', {failureRedirect: "/login", failureFlash: true }),
        async(req , res)=> {
                 req.flash("success" , `Welcom ${req.user.username}`);
                 res.redirect(res.locals.redirectUrl || "/products");
            });


 app.get("/logout", (req , res, next)=> {
                req.logout((err)=> {
                    if(err) {
                        return next(err);
                    }
                    req.flash("destroy", "you are logged out");
                res.redirect("/products");
                })
                
            })
// const handleValidationErr = (err) => {
//    console.dir(err.message);
//    return err;
// }


// app.use((err , req , res , next)=> {
//     console.log(err.name);
//     if(err.name === "ValidationError") {
//         err = handleValidationErr(err);
//     }
//     next(err);
// })



app.all(/./, (req , res , next)=> {
  next(new ExpressError(404, "Page not found!"));
})


//error handling middleware
app.use((err , req , res , next)=> {
    let {status = 500 , message = "something went wrong"}= err;
    res.status(status).render("listings/error.ejs", {message});
})





http.listen(port , (req , res)=> {
    console.log(`server is running on port ${port}`)
})
