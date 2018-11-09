const Soup = imports.gi.Soup;
const Lang = imports.lang;

function handlerNum (num, server, msg, path, query, client) {
	print (num);
}

function handler (server, msg, path, query, client) {
	msg.status_code = 200;
	msg.response_headers.set_content_type('text/html', {});
	msg.response_body.append(
		'<html><body>Greetings, visitor from ' + client.get_host() + '<br>What is your name?<form action="/hello"><input name="myname"></form></body></html>\n'
		);
}
	
function helloHandler (server, msg, path, query, client) {
	if (!query) {
		msg.set_redirect(302, '/');
		return;
	}
	
	msg.status_code = 200;
	msg.response_headers.set_content_type('text/html', { charset: 'UTF-8' });
	msg.response_body.append(
		'<html><body>Hello, ' + query.myname + '! \u263A<br><a href="/">Go back</a></body></html>'
	);
}
		
function defaultHandler (server, msg, path, query, client) {
	msg.status_code = 200;
	msg.response_headers.set_content_type('text/html', {});
	msg.response_body.append(
		'<html><body>Greetings, visitor from ' + client.get_host() + '<br>What is your name?<form action="/hello"><input name="myname"></form></body></html>\n'
	);
	// msg.response_body.complete();
	// msg.set_status(200);
}


// https://github.com/denyadzi/gnome-gjs-samples/blob/e1b407d0b2766b635b620bc2071c9821d2357a37/soup/static_server/main.js
function staticHandlerJunk (docRoot, server, msg, path, query, client) {
	
	const Gio   = imports.gi.Gio;
	const GLib  = imports.gi.GLib;
	
	// TODO: use streams https://stackoverflow.com/questions/33911776/gnome-shell-extensions-how-to-run-a-command-with-pipes

	const BUF_SIZE = 16384;

	let file = Gio.File.new_for_path(docRoot + path);
	
	let stream;
	try {
		stream = new Gio.DataInputStream({ base_stream: file.read(null) });
		stream.set_buffer_size (BUF_SIZE);
	} catch (e) {

		log(e.message);
		return;
	}

	const {ByteArray} = imports.byteArray;
	// let buffer = new Uint8Array (BUF_SIZE);
	let buffer = new ByteArray(BUF_SIZE);

	// I don't think it is possible to achieve
	function fillBuffer () {
		stream.read_all_async(buffer, BUF_SIZE, GLib.PRIORITY_DEFAULT, null, function (_stream, result) {
			stream.read_all_finish (result);
			// var avail = _stream.get_available();
			// const buf = _stream.peek_buffer().toString();
			// let byte;
			// while ((byte = stream.read_byte()) !== null) {
			// 	buf += byte;
			// }
			
			msg.response_body.append(buffer);

			// print ('stream closed', stream.is_closed());

			if (stream.is_closed()) {
				msg.response_body.complete();
			}

			server.unpause_message(msg);
		});
		
	}
	


	msg.response_headers.set_encoding(Soup.Encoding.CHUNKED);
	msg.response_headers.set_content_type('text/html', null);
	msg.status_code = 200;
	
	
	msg.connect('wrote-chunk', function(msg) {
		fillBuffer ();
	});

	msg.connect('finished', function(msg) {
		// log('Finish');
	});
	
	fillBuffer ();
}

const mimeTypes = {
	js: 'application/javascript',
	css: 'text/css',
	html: 'text/html',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	ico: 'image/x-icon'
};

const forceCharset = 'js css html svg'.split (' ');

function staticHandler (docRoot, server, msg, path, query, client) {
	
	const {req, response} = this.buildNodeMessage (msg);

	print ('static', JSON.stringify (req.headers, null, "\t"));

	const Gio   = imports.gi.Gio;
	const GLib  = imports.gi.GLib;
	const ByteArray = imports.byteArray;
	
	// TODO: use streams https://stackoverflow.com/questions/33911776/gnome-shell-extensions-how-to-run-a-command-with-pipes

	let clearedPath = path.replace (/\?.*/, '').replace (/\#.*/, '');

	const fileExt = path.match (/.*\.(\w+)$/)[1];
	// const contentType = mimeTypes [fileExt];
	const contentType = Gio.content_type_guess (clearedPath, null)[0]; // second paramter is uncertain
	const charset = (forceCharset.indexOf (fileExt) >= 0 ? {charset: 'UTF-8'} : {});

	let file = Gio.File.new_for_path(docRoot + clearedPath);
	
	// msg.response_headers.set_encoding(Soup.Encoding.CHUNKED);
	msg.response_headers.set_content_type(contentType, charset);
	msg.status_code = 200;
	
	server.pause_message (msg);

	let clientConnected = true;

	// funcking nightmare
	file.load_contents_async(null, function(f, result) {
		let contents;
		try {
			contents = file.load_contents_finish(result)[1];
		} catch (e) {
			logError(e);
			return;
		}
		
		if (clientConnected) {
			msg.response_body.append(contents);
			
			msg.response_body.complete();

			server.unpause_message(msg);
		}
	});

	msg.connect('finished', function(_msg) {
		clientConnected = false;
	});
}

function sseHandler (eventsUrl, server, res, path, query, client) {

	const Gio   = imports.gi.Gio;
	const GLib  = imports.gi.GLib;
	const ByteArray = imports.byteArray;
	
	if (req.headers.accept !== 'text/event-stream' || path && path !== req.url) {
		return;
	}

	let clearedPath = path.replace (/\?.*/, '').replace (/\#.*/, '');

	const fileExt = path.match (/.*\.(\w+)$/)[1];
	// const contentType = mimeTypes [fileExt];
	const contentType = Gio.content_type_guess (clearedPath, null)[0]; // second paramter is uncertain
	const charset = (forceCharset.indexOf (fileExt) >= 0 ? {charset: 'UTF-8'} : {});

	let file = Gio.File.new_for_path(docRoot + clearedPath);
	
	// res.response_headers.set_encoding(Soup.Encoding.CHUNKED);
	res.response_headers.set_content_type(contentType, charset);
	res.status_code = 200;
	
	server.pause_message (res);

	let clientConnected = true;

	// funcking nightmare
	file.load_contents_async(null, function(f, result) {
		let contents;
		try {
			contents = file.load_contents_finish(result)[1];
		} catch (e) {
			logError(e);
			return;
		}
		
		if (clientConnected) {
			res.response_body.append(contents);
			
			res.response_body.complete();

			server.unpause_message(res);
		}
	});

	res.connect('finished', function(res) {
		clientConnected = false;
	});

}

function Server() {
	
	this.soup = new Soup.Server();
	
	// read cert from file https://developer.gnome.org/libsoup/stable/SoupServer.html#SoupServer-request-started
	// this.soup.set_ssl_cert_file(ssl_cert_file, ssl_key_file)
	// this.soup.set_ssl_certificate()
	
	// this.soup.add_handler('/', handler);
	// this.soup.add_handler('/docs', docsHandler);
	// this.soup.add_handler(null, defaultHandler);

	// return server;
}

Server.prototype = {
	addresses: function addresses () {
		return this.soup.get_uris().map (function (soapUri) {return {
			host: soapUri.get_host(),
			port: soapUri.get_port(),
		}})
		return {
			port: this.soup.port,
			// interface: https://developer.gnome.org/libsoup/stable/SoupAddress.html
		}
	},
	listen: function listen (port, host) {
		this.soup.listen_all (port, Soup.ServerListenOptions.IPV4_ONLY);
		// SOUP_SERVER_LISTEN_HTTPS
		// Listen for https connections rather than plain http.
		
		// SOUP_SERVER_LISTEN_IPV4_ONLY
		// Only listen on IPv4 interfaces.
		
		// SOUP_SERVER_LISTEN_IPV6_ONLY
		
		// listen(), listen_local(), or listen_all()
	},
	buildNodeMessage: function (msg) {
		const request = new ServerRequest (msg);

		const response = {
			headers: {}
		};

		return {
			req: request,
			res: response
		}

	},
	handleStaticFrom: function handleStaticFrom (httpRoot) {
		this.soup.add_handler (null, staticHandler.bind (this, httpRoot));
	},
	handleSSEUrl: function handleSSEUrl (eventsUrl) {
		this.soup.add_early_handler (null, sseHandler.bind (this, eventsUrl));
	},
	handleUrl: function (url, handler) {
		this.soup.add_handler (url, handler);
	}

}

function ServerRequest (msg) {
	this.msg = msg;
	this.method = msg.method;

	this.headers = {};

	// req.httpVersionMajor < 1 || req.httpVersionMinor
	// this.version
	// msg.get_http_version
	//  SOUP_HTTP_1_1, SOUP_HTTP_1_0

	// msg.get_uri() // 

	// msg.is_keepalive ()

	// see HACKING in the gjs, .bind() not works, but Lang.bind works
	msg.request_headers.foreach (Lang.bind(this, function (name, value) {
		this.headers[name] = value;
	}), null);

}

function ServerResponse () {
	this.msg = msg;
}

ServerResponse.prototype = {
	write: function (data, encoding) {
		this.msg.response_body.append(contents);
			
			
	},
	setHeader: function (name, value) {
		if (singleValueHeader[headerName]) {
			this.msg.response_headers.replace (name, value);
		} else {
			this.msg.response_headers.append (name, value);
		}
	},
	writeHead: function (statusCode, statusMessage, headers) {
		if (typeof statusMessage === 'Object' && !headers) {
			headers = statusMessage;
			statusMessage = undefined;
		}
		// msg.response_headers.set_encoding(Soup.Encoding.CHUNKED);
		// this.msg.response_headers.set_content_type(contentType, charset);
		this.msg.status_code = statusCode;

		// set_status_full (code, phrase) ??
		if (statusMessage)
			this.msg.reason_phrase = statusMessage;

		for (let headerName in headers) {
			this.setHeader (headerName, headers[headerName]);
		}
	},
	end: function (contents) {
		if (contents)
			this.msg.response_body.append(contents);
		
		this.msg.response_body.complete();
	}
}
