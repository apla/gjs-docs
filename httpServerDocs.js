imports.searchPath.unshift(".");

function loadedNamespacesJSON (server, msg, path, query, client) {
	const {loadedNamespaces} = imports.girDocs;
	msg.status_code = 200;
	msg.response_headers.set_content_type('text/json', {});
	msg.response_body.append(
		JSON.stringify (loadedNamespaces(), null, "\t")
	);
}

function namespaceDataJSON (server, msg, path, query, client) {
	const {initScope} = imports.girDocs;

	const queryFile = msg.get_uri().get_path().replace ('/api/docs/ns/', '');

	const [queryNS, fileExt] = queryFile.split ('.');

	const girData = initScope (queryNS);

	const nsData = girData.walkNS(queryNS);

	msg.status_code = 200;
	msg.response_headers.set_content_type('text/json', {});
	msg.response_body.append(
		JSON.stringify (nsData, null, "\t")
	);
}


function docsHandler (server, msg, path, query, client) {
	const {initScope} = imports.girDocs;
	
	const girData = initScope ((query && query.ns) ? query.ns : undefined);

	msg.status_code = 200;
	msg.response_headers.set_content_type('text/html', {});
	msg.response_body.append(
		'<html><body><h1>'+JSON.stringify(query) +'</h1>'
	);
	msg.response_body.append(
		'<p>' + JSON.stringify(girData.namespaces)+'</p>'
	);
	if (query && query.ns) {
		const nsData = girData.walkNS(query.ns);
		for (let part in nsData) {
			msg.response_body.append(
				'<h2>' + part +'</h2>' +
				'<p>' + JSON.stringify (nsData[part]) +'</p>'
			);
		}
	}
	msg.response_body.append(
		'</body></html>\n'
	);
	
}
