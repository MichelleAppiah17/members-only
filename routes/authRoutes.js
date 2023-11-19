const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('error') }); 
});

router.get('/logout', (req,res) => {
    res.send('logging out');
});

router.get('/sign-up', (req,res) => {
   res.render('sign-up', { messages: req.flash() });
});


module.exports = router;