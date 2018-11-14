
function fetchNamespacesList () {

	fetch('/api/docs/ns/list.json').then(function(response) {
		return response.json();
	}).then(function(namespacesJSON) {
		console.log (namespacesJSON);
		wiredActions.setNSList (namespacesJSON);
	});

}

function fetchDocsNS (namespace) {
    return fetch('/api/docs/ns/' + namespace + '.json').then(function(response) {
        return response.json();
    }).then(function(namespaceDataJSON) {
        // app.ns.name = namespace;
        var result = {
            members: {},
            classes: {}
        }
        Object.keys (namespaceDataJSON).forEach (function (scope) {
            if (scope === 'classes') {
                result.classes = namespaceDataJSON[scope];
            } else {
                result.members[scope] = namespaceDataJSON[scope];
            }
        });

        return result;

        // console.log (namespaceDataJSON);
        // console.log(JSON.stringify(myJson));
    });
}
