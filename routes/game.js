var express = require('express');
var router = express.Router();
var config = require('../config');
/* GET home page. */
router.get('/', function(req, res, next) {
  let displayName = 'anonymous';
  if (req.user) {
     displayName = escape(req.user.displayName);
     console.log("displayNameは" + displayName);
  }
  res.render('game', { title: 'ata', displayName: displayName, ipAddress: config.ipAddress });
});

module.exports = router;