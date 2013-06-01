var OAuth = require('oauth').OAuth;
var oauth;

// Github oAuth controller
exports.github = function(req, res) {
  var host = req.headers.host
    , url = "https://github.com/login/oauth/authorize/?client_id=3932296283f3a71ed5be&scope=gist";

  res.redirect(url);

  /*
  oauth = new OAuth(
    "https://github.com/login/oauth/authorize",
    "https://github.com/login/oauth/access_token",
    "3932296283f3a71ed5be",
    "1709ded56fa2224ac4950f9b32f11040d13be81c",
    "1.0a",
    "http://" + host + "/auth/github/callback",
    "HMAC-SHA1"
  );

  oauth.getOAuthRequestToken({"scope": "gist"}, function(error, oauth_token, oauth_token_secret, results) {
    if (error) {
      console.log(error);
      res.send("Authentication Failed!");
    }
    else {
      req.session.oauth = {
        token: oauth_token,
        token_secret: oauth_token_secret
      };
      console.log(req.session.oauth);
      res.redirect('https://github.com/login/oauth/authenticate?oauth_token='+oauth_token)
    }
  });

*/
};

exports.gitCallback = function(req, res, next) {
  var code = req.query.code
    , data = {
        "client_id": "3932296283f3a71ed5be",
        "client_secret": "1709ded56fa2224ac4950f9b32f11040d13be81c",
      };

    var qs = require('querystring');
    req.session.oauth = {};

  // Get the access token with the code
  var request = require('request');
  request.post(
    "https://github.com/login/oauth/access_token?client_id=" + data.client_id + "&client_secret="+data.client_secret+"&code="+code ,
    function(e, r, body) {
      if (e) {
        console.log(error);
        res.send("Authentication Failure!");
      }
      else{
        var body = qs.parse(body);

        req.session.oauth.access_token = body.access_token;
        var url = "https://api.github.com/user?access_token=" + req.session.oauth.access_token;
        // console.log(url);

        // Get user data
        // res.redirect(url);
        request({
          method: 'GET', 
          uri: url,
          headers: {
            'user-agent': "Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729)"
          }
        },
          function (error, response, body) {
            // console.log(body);
            // Let's save the data
          }
        );
        // res.redirect('/');
      }
    }
  );
};

// Twitter oAuth controller
exports.twitter = function(req, res) {
  var host = req.headers.host;
  oauth = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    "3H9mJB3pfIgrnu4v6WKWg",
    "CkGwsgEkZSYxkhGSPue1augSGlArxl97fa5D7LxcYTU",
    "1.0a",
    "http://" + host + "/auth/twitter/callback",
    "HMAC-SHA1"
  );

  oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if (error) {
      // console.log(error, config.twitter_consumer_secret);
      res.send("Authentication Failed!");
    }
    else {
      req.session.oauth = {
        token: oauth_token,
        token_secret: oauth_token_secret
      };
      // console.log(req.session.oauth);
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
    }
  });
}

exports.twitCallback = function(req, res, next) {
  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth_data = req.session.oauth;

    oauth.getOAuthAccessToken(
      oauth_data.token,
      oauth_data.token_secret,
      oauth_data.verifier,
      function(error, oauth_access_token, oauth_access_token_secret, results) {

        if (error) {
          console.log(error);
          res.send("Authentication Failure!");
        }
        else {
          req.session.oauth.access_token = oauth_access_token;
          req.session.oauth.access_token_secret = oauth_access_token_secret;
          req.session.username = results.screen_name;
          // console.log(results, req.session.oauth);

          // Save in DB
          db = createConnection();

          db.execute("SELECT id FROM users WHERE username = ?", [req.session.username]).on('end', function(r) {
            var exists = (r.result.rows.length == 0) ? false : true;

            oauth.get( 
              "https://api.twitter.com/1.1/users/show.json?screen_name=" + req.session.username,
              req.session.oauth.access_token, 
              req.session.oauth.access_token_secret,
              function(error, data) {

                data = JSON.parse(data);
                req.session.profile_image = data.profile_image_url.replace("_normal", "");
                req.session.fullname = data.name;

                // If the user already exists in the DB
                if(exists) {
                  db = createConnection();

                  // Update full name and profile image
                  db.execute("UPDATE users SET fullname = ?, profile_image = ? WHERE username = ?", 
                    [req.session.fullname, req.session.profile_image, req.session.username]
                  ).on('end', function(r) {
                    // And get the user data from DB
                    db.execute("SELECT profile_image, fullname FROM users WHERE username = ?", 
                      [req.session.username]
                    ).on('end', function(r) {
                      req.session.profile_image = r.result.rows[0][0];
                      req.session.fullname = r.result.rows[0][1];

                      res.redirect('/');
                    });
                  });
                }

                // Else create a new user and redirect to home page
                else {
                  db = createConnection();
                  db.execute("INSERT INTO users (username, created_at, is_pro, fullname, profile_image) VALUES (?, ?, ?, ?, ?)", 
                    [req.session.username, new Date().toMysqlFormat(), "no", req.session.fullname, req.session.profile_image]
                  ).on('end', function(r) {
                    res.redirect('/');
                  });
                }
              }
            );
          });
        }

        return;
      }
    );
  }
  else {
    res.redirect('/'); // Redirect to login page
  }


}