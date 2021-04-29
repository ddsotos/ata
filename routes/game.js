var express = require('express');
var router = express.Router();
var config = require('../config');
/* GET home page. */
router.get('/', function(req, res, next) {
  let displayName = 'anonymous';
  let thumbUrl = 'anonymous';
  console.log(req);
  if (req.user) {
     displayName = escape(req.user.displayName);
  }
  res.render('game', { title: '潜水艦ゲーム', displayName: displayName, thumbUrl: thumbUrl, ipAddress: config.ipAddress });
});

module.exports = router;