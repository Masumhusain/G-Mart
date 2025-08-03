module.exports.isLoggedIn = (req, res, next) => {
     if(!req.isAuthenticated()){

        req.session.redirectUrl = req.originalUrl;
        req.flash("destroy", "you must have login first");
        return res.redirect("/products")
    }
    next();

}

module.exports.saveRedirectUrl = (req, res , next) => {
    if(req.session.redirectUrl) {
       res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}