GJS-docs
========

Running
-------

Clone repo, then launch docs webserver

```javascript
git clone https://github.com/apla/gjs-docs
cd gjs-docs
gjs-console http-server.js
```

Navigate to http://localhost:50080/hyper.html

`hyper.html` is written with help of [hyperapp](https://github.com/jorgebucaran/hyperapp) and [buble](https://buble.surge.sh/).

First version is available on `index.html`, but it is too slow and written using [vue.js](https://vuejs.org).

WHY?
----

Unfortunately, there is no good documentation on GObject 
Interospection for SpiderMonkey Javascript.

Existing approaches:

 * https://valadoc.org/libnm-glib/NM.html - lacks structs and interfaces
 * https://lazka.github.io/pgi-docs/index.html#NM-1.0/classes/Client.html - looks like best one, but navigation sucks
 * https://www.roojs.com/seed/gir-1.2-gtk-3.0/seed/NMClient.html - outdated
 * http://devdocs.baznga.org/nmclient10~1.0_api/ - unusable
 * https://developer.gnome.org/libnm/stable/index.html - doesn't match JS API

Also there is a [official repo](https://gitlab.gnome.org/GNOME/gobject-introspection/) and [tooling](https://wiki.gnome.org/Projects/GObjectIntrospection/Doctools) for documentation. Definitely, bunch of html files is so good as documentation. For year 2000.

I've decided to write new one, which is fast, complete and hackable. And displaying not some version from future Gnome, but currently installed one.


Actually, this work is largely based on [cgjs-about](https://github.com/cgjs/cgjs-about#readme).

