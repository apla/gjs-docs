// unfortunately no https://github.com/anywhichway/jsxdirect/blob/master/examples/hyperapp.html

// check CSP https://glebbahmutov.com/blog/disable-inline-javascript-for-security/

var scripts = document.querySelectorAll("[type='text/jsx']");
scripts.forEach(el => {
    const script = buble.transform(el.innerHTML, {
        jsx: 'hyperapp.h',
        objectAssign: "Object.assign"
    }).code,
        node = document.createElement("script");
    for(const attr of [].slice.call(el.attributes))
        node.setAttribute(attr.name,el.attributes[attr.name]);
    node.type = "text/javascript";
    node.innerHTML = script;
    el.parentElement.replaceChild(node,el);
});
