imports.searchPath.unshift(".");

imports.modules['object-assign-polyfill'];

const GLib  = imports.gi.GLib;

const {Server} = imports.http;

// print (Object.keys (imports.httpServerDocs));

const {
    docsHandler,
    loadedNamespacesJSON,
    namespaceDataJSON
} = imports.httpServerDocs;

let loop = GLib.MainLoop.new(null, false);

const server = new Server ();

server.handleStaticFrom ('www/');

server.handleUrl ('/api/docs/ns/list.json', loadedNamespacesJSON);
server.handleUrl ('/api/docs/ns/', namespaceDataJSON);
server.handleUrl ('/docs/', docsHandler);

server.listen (50080);

print (JSON.stringify (server.addresses ()));

loop.run ();