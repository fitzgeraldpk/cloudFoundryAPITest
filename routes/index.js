var express = require('express');
var router = express.Router();
var httpRequest=require('request');
var settings = require('../settings.json');
var debug = require('debug')('cfapp:server');
var async =require('async');



function getToken (req,res,next){
	var access_token;
	var tokenOptions={url:settings.authUrl,method:'POST',
					  form:{username:settings.username,
					  	    password:settings.password,
					  	    grant_type:settings.grantType},
					  headers: {"Authorization":"Basic Y2Y6",
									  "Accept":"application/json;charset=utf-8",
									  "content-type":"application/x-www-form-urlencoded;charset=utf-8"}
					 };
	httpRequest(tokenOptions,function(error, response, body) {
            if (error) {access_token=null;}
            if (response.status=200){
            	var authResult=JSON.parse(response.body);
            	access_token=authResult.access_token;
		    }else{
		    	access_token=null;
		    }
		res.locals.access_token=access_token;
			next();
        });		
		
}

function getSpaces(req,res,next,guid,callback){
	var host =settings.host;
	var guid = req.params.guid;
    var options={url:host+'/organizations/'+guid+'/spaces',method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
  				};

  	httpRequest(options,function(error, response, body) {
            if (error) {res.send(error)};
            	debug( JSON.parse(response.body));
            	res.locals.spaces=JSON.parse(response.body);
            	debug(res.locals.spaces.resources[0]);
            	if (res.locals.spaces.resources[0] && res.locals.spaces.resources[0].metadata){
            		res.locals.spaces.guid=res.locals.spaces.resources[0].metadata.guid;
            	}	
            	callback();
    });

}

function getSpaceApps(req,res,next,guid,callback){
	var host =settings.host;
	if (res.locals.spaces.guid){
    var options={url:host+'/spaces/'+res.locals.spaces.guid+'/apps',method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
  				};

  	httpRequest(options,function(error, response, body) {
            if (error) {res.send(error)};
            	debug( JSON.parse(response.body));
            	res.locals.apps=JSON.parse(response.body);
            		callback();
    });
  }else{
  		callback();
  }
  

}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/orgs', function(req,res,next){if(typeof res.locals.access_token=='undefined'){getToken(req,res,next)}},
					function (req,res,next){
						debug('/orgs token: '+ res.locals.access_token)
						var host =settings.host;
					    var options={url:host+'/organizations',method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
					  				};
					        httpRequest(options,function(error, response, body) {
					            if (error) {debug(error)}
					            //res.send(response);
					            if (typeof response!='undefined'){
					            	var result=JSON.parse(response.body|| {});
					            }
					            console.log(result);
					            
					            res.render('index', { result: result,title:'CF API'});
					        });

    });

router.get('/org/details/:guid',function(req,res,next){if(typeof res.locals.access_token=='undefined'){getToken(req,res,next)}}, function (req,res,next){
	var host =settings.host;
	var guid = req.params.guid;
    var options={url:host+'/organizations/'+guid,method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
  				};
        httpRequest(options,function(error, response, body) {
            if (error) {res.send(error);}
             var result = JSON.parse(response.body);
             debug(result);
           //  res.send(result);
             res.render('org_details', { result: result});
        });

    });



router.get('/org/spaces/:guid',function(req,res,next){if(typeof res.locals.access_token=='undefined'){getToken(req,res,next)}}, function (req,res,next){
	var host =settings.host;
	var guid = req.params.guid;
    var options={url:host+'/organizations/'+guid+'/spaces',method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
  				};
        
        async.series([
        	function(callback){
        		getSpaces(req,res,next,guid,callback)	
        	},
        	function(callback){
        			debug('callback');
        			getSpaceApps(req,res,next,guid,callback);

        	}
            //res.render('index', { total_results: response.total_results,title:'CF API'});
        
        	],function(err){res.render('space_details', { result: result});});

    });

router.get('/app/droplet/:guid',function(req,res,next){if(typeof res.locals.access_token=='undefined'){getToken(req,res,next)}}, function (req,res,next){
	var host =settings.host;
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	var guid = req.params.guid;
    var options={url:host+'/apps/'+guid+'/droplet/download',method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
  				};
        httpRequest(options,function(error, response, body) {
            if (error) {res.send(error);}
            res.locals.droplet=response.body;
            var buffer = new Buffer(res.locals.droplet,'binary');   
				res.type('application/octet-stream');
				res.send(buffer);
            //res.download(response);
            //res.render('index', { total_results: response.total_results,title:'CF API'});
        });

    });

router.get('/spaces/apps/:guid',function(req,res,next){if(typeof res.locals.access_token=='undefined'){getToken(req,res,next)}}, function (req,res,next){
	var host =settings.host;
	var guid = req.params.guid;
    var options={url:host+'/spaces/'+guid+'/apps',method:'GET',headers: {"Authorization":"bearer "+res.locals.access_token}
  				};
        httpRequest(options,function(error, response, body) {
            if (error) {res.send(error);}
            res.send(response);
            //res.render('index', { total_results: response.total_results,title:'CF API'});
        });

    });



module.exports = router;
