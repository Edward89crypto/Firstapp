'use strict';
const
express 	= require('express'),
app     	= express(),
http 		= require('http').createServer(app),
io 			= require('socket.io')(http),
Binance 	= require('binance-api-node').default,
bodyParser  = require('body-parser');

global._ = require('lodash');

app.use(express.static(__dirname+'/node_modules'));
app.use(express.static(__dirname+'/app'));
app.use(bodyParser.json({limit: '50mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if('OPTIONS' === req.method){
      res.status(200);
      res.end();
    }else{
      next();
    }
});

global.BClient = Binance({
    apiKey: 'ni4aNXUCVCZ0MimmhvnXoEgtRBjYpzTHX9eWLHSQxVmkcVIQgzCkiphJyOskJosw',
    apiSecret: '87P5iliG0wYm6le1xctMocmzaxmtl6N0Qhnnmde9LP3tId2iq2x75H7okUWDN8ib',
    options: {
        adjustForTimeDifference: true,
        verbose: true,
        recvWindow: 60000,
    },
    enableRateLimit: true
});

let current_price_eth = {
	best_bid: null,
	best_ask: null
}

BClient.ws.ticker('ETHUSDT', ticker => {
  current_price_eth = {
  	beskt_ask: ticker.bestAsk,
  	best_bid: ticker.bestBid
  }
  console.log(current_price_eth);
});

// (async () => {
// 	var history = await BClient.tradesHistory({symbol: 'TRXUSDT'});
// 	console.log(history);
// })();

// Get order book
global.get_order_book = (options, callback)=>{
	(async () => {
	   var output = await BClient.book(options);
	   output.asks.reverse();
	   output.bids.reverse();
	   callback(output);
	})();
}

global.order = (options, callback)=>{
	(async () => {
	   callback(await BClient.order(options));
	})();
}

global.get_quantity = (asset, callback)=>{
	(async () => {
	   	var output = await BClient.accountInfo({recvWindow: 60000});
	   	var quantity = output.balances.filter(function(i){
	   		return i.asset == asset;
	   	});

	   	callback(quantity[0]);
	})();
}

io.on('connection', (socket)=>{
	console.log(socket.id);

	socket.on('connect', (data)=>{
		console.log("Socket connected !");
	});

	socket.on("listen::something", (data)=>{
		console.log(data);
		socket.emit("something::back", "hey there");
	});

});


	var sells = [];

	app.post('/trade-tester', (req,res)=>{
	/*
		{
			symbol: "",
			side: "",
			quantity: 0
		}
	*/
		console.log("Notification: ", req.body, " at ", new Date(), "\r");

	 	// SELL
		if(req.body.side == "SELL"){
			get_order_book({symbol: req.body.symbol}, function(books){
				var price = books.asks[books.asks.length-1].price;

				var ord = {
				  symbol: req.body.symbol,
				  side: req.body.side,
				  quantity: parseInt(req.body.quantity),
				  price: price,
				};

				console.log("Order: ", ord, "\r");

				order(ord, function(resp){
					if(typeof resp == "object"){
						sells.push({
							symbol: ord.symbol,
							quantity: ord.quantity
						});
					}
					console.log("Order response: ", resp, "\r", "Temporar history list: ", sells, "\r");
					res.end();
				});

			});
		}
	 	
	 	// BUY
		if(req.body.side === "BUY"){

			// var can_buy = _.find(sells, (i)=>{ return i.symbol ==  req.body.symbol});

			// if(can_buy){
				// if(req.body.quantity == "ALL"){
					// req.body.quantity = can_buy.quantity;
				// }
				// sells.splice(sells.indexOf(can_buy), 1);
				// buy();
			// }else{
				// console.log("Nu poate cumpara pentru ca nu a vandut.");
				// res.end();
			// }

			function buy(){
				get_order_book({symbol: req.body.symbol}, function(book){
					// var price = book.bids[book.bids.length-1].price;
					var price = current_price_trx.best_bid;

					var ord = {
					  symbol: req.body.symbol,
					  side: req.body.side,
					  quantity: parseInt(req.body.quantity),
					  price: price,
					}

					console.log("Order: ", ord, "\r");
					
					order(ord, function(resp){
						console.log("Order response: ", resp, "\r", "Temporar history list: ", sells);
						res.end();
					});

				});
			}
			buy();
		}
	});


// Default Route
app.get('/*', (req,res)=>{
	res.send("API Gateway. Access Restricted! asddddd");
});

// Open HTTP protocol on specific port
var server = app.listen(3555,()=>{
	console.log('Server is running at port: ',3555);
});

io.attach(server);