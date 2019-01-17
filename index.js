/*
 Your solution should go here.
*/
var express = require('express');
var app = express();
//Socket IO
var http = require('http').Server(app);
var io = require('socket.io')(http);

var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer(); 
var session = require('express-session');
var cookieParser = require('cookie-parser');
var path = require("path");
var fs = require("fs");
const timestamp = require("unix-timestamp");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(upload.array());
app.use(cookieParser());
app.use(session({secret: "Hello There I am the Secret"}));


var Users = fs.readFileSync("users.json");
var jsonUsers = JSON.parse(Users);



var Customers = fs.readFileSync("customers.json");
var jsonCustomers = JSON.parse(Customers);

var Products = fs.readFileSync("products.json");
var jsonProducts = JSON.parse(Products);




// app.get('/test', function(req, res){
// 	res.sendFile(__dirname + '/test.html');
//  });

app.get('/login.html', function(req, res){
   res.sendFile(path.join(__dirname+'/static/login.html'));
});

app.get('/', function(req, res){
   res.sendFile(path.join(__dirname+'/static/index.html'));
});

app.get('/index.html', function(req, res){
   res.sendFile(path.join(__dirname+'/static/index.html'));
});


app.get('/home.html', checkSignIn, function(req, res){
   res.sendFile(path.join(__dirname+'/static/home.html'));
});

app.get('/live.html', checkSignIn, function(req, res){
   res.sendFile(path.join(__dirname+'/static/live.html'));
});

app.get('/show.html', checkSignIn, function(req, res){
   res.sendFile(path.join(__dirname+'/static/show.html'));
});

app.get('/show', checkSignIn, function(req, res){

	res.json(getAllOrders());

});

app.get('/search.html', checkSignIn, function(req, res){
   res.sendFile(path.join(__dirname+'/static/search.html'));
});

app.get('/upload.html', checkSignIn, function(req, res){
   res.sendFile(path.join(__dirname+'/static/upload.html'));
});

app.post('/upload', checkSignIn, function(req,res){
	console.log("upload-----");
	console.log(req.body);
	var addedOrders = fs.readFileSync("addedOrders.json");
	var jsonAddedOrders = JSON.parse(addedOrders);
	if(req.body.Submit){
		if(typeof(req.body.item) == 'string'){
			req.body.items = [{item:req.body.item, quantity:req.body.quantity}];
		}else{
			let items = [];
			for(let i = 0; i < req.body.item.length; i ++){
				items.push({item:req.body.item[i], quantity:req.body.quantity[i]});
			}
			req.body.items = items;

		}
	}
	jsonAddedOrders.push(req.body);
	fs.writeFile(__dirname+"/addedOrders.json", JSON.stringify(jsonAddedOrders), function(err) {
		if(err) {
			 return console.log(err);
		}
		console.log("The file was saved!");
  });
  res.redirect('/upload.html');

});

app.get('/search/', function(req,res){
	// res.send("productId: "+ req.query.productId);
	let filtered;
	if(req.query.productId){
		filtered = getAllOrders().filter( x => {
			return x.productId == req.query.productId
		})
		return res.send(JSON.stringify(filtered));
	}else if(req.query.buyer){
		filtered = getAllOrders().filter( x => {
			return x.buyer == req.query.buyer
		})
		return res.send(JSON.stringify(filtered));
	}else if(req.query.shippingTarget){
		filtered = getAllOrders().filter( x => {
			return x.shippingTarget >= req.query.shippingTarget
		})
		return res.send(JSON.stringify(filtered));

	}else{
		return res.send([]);
	}
})


app.post('/auth', function(req, res){
	console.log(req.body.username);
   if(!req.body.username || !req.body.password){
   		res.redirect('/login');
   } else {
   		for(var i = 0; i < jsonUsers.length; i++) {
   			if(jsonUsers[i].username === req.body.username && jsonUsers[i].password === req.body.password){
            	req.session.user = jsonUsers[i];
            	res.redirect('/home.html');
         	}
   	}
      res.redirect('/login.html');
   }
});



function checkSignIn(req, res,next) {
   if(req.session.user){
      next();     
   } else {
		res.redirect('/login.html');
   }
}

function processOrder(order) {

	var buyer = order.buyer;
	var shippingAddress = lookupAddress(order.buyer);
	let shippingDateTime =  order.shippingDate.replace(/\//g,"-") + "T" + order.shippingTime;
	let shippingTarget = timestamp.fromDate(shippingDateTime) * 1000;
	var arr  = new Array();

	for( var i = 0; i < order.items.length; i ++ ){
		var item = {
		    buyer: buyer,
		    shippingAddress : shippingAddress,
		    shippingTarget : shippingTarget,
		    quantity : order.items[i].quantity,
		    productId : lookupProductId(order.items[i].item)
		};
		arr.push(item);
	}
	return arr;
}


function lookupAddress (buyer) {
	for(var i = 0; i < jsonCustomers.length; i++) {
		if(jsonCustomers[i].name === buyer){
			return jsonCustomers[i].address;
		}
	}
	return "none";
}

function lookupProductId(name) {
	for(var i = 0; i < jsonProducts.length; i++) {
		if(jsonProducts[i].name === name){
			return jsonProducts[i].productId; 
		}
	}
	return "none";
}

const getAllOrders = () => {
	var addedOrders = fs.readFileSync("addedOrders.json");
	var Orders = fs.readFileSync("orders.json");
	var jsonOrders = JSON.parse(Orders);
	var jsonAddedOrders = JSON.parse(addedOrders);
	var combinedOrders = jsonOrders.concat(jsonAddedOrders);
	var allOrders = new Array();
	for( var i = 0; i < combinedOrders.length; i ++ ){
		var converted = processOrder(combinedOrders[i]);
		allOrders = allOrders.concat(converted);

	}
	return allOrders;
}

// Socket IO
io.on('connection', function(socket){
	console.log("connected");
	socket.on('subscribe', function(msg){	
	 let idLst = JSON.stringify(msg);
	 console.log(idLst);
	 for(let el of getAllOrders()){
		 if(idLst.includes(el.productId)){
			console.log(el.productId);
			io.emit('order', JSON.stringify(el));
		 }
	 }

	  
	});
 });

http.listen(8080, function(){
	console.log('listening on *:' + 8080);
 });