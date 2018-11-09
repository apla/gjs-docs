Vue.component('class-docs', {
    template: '#class-docs-template',
    props: ['members', 'ns'],
    data: function() {
        return {
        }
    }
});

Vue.component('accordion-section', {
    template: '#section-template',
    props: ['scope', 'data'],
    data: function() {
        return {
        }
    },
    computed: {
        id: function () {
            return this.scope
        },
        name: function () {
            return this.scope
        },
        type: function () {
            if (this.data.abstract) {
                return 'abstract';
            } else if (this.data.interface) {
                return 'interface';
            } else if (this.data.struct) {
                return 'struct'
            } else {
                return 'class'
            }
        }
    }
});


var app = new Vue({
    el: '#docs-container',
    template: '#docs-template',
    data: {
        ns: {
            list: [],
            data: {}
        },
        context: {
            op: 'idle',
            error: true,
            ns: '',
            repository: {},
            members: {},
            classes: {},
            className: '',
            classMembers: {}
        }
    },
    updated: function () {
        // console.info ('UPDATE', this.context.op);
        setTimeout (function () {
            this.context.op = 'idle';
            // Code that will run only after the
            // entire view has been re-rendered
        }.bind (this), 2000);
        // this.$nextTick()
    },
    methods: {
        displayClass: function (className) {

            if (!className) {
                this.context.className = '';
                this.context.classMembers = {};
            }

            this.context.className = className;
            this.context.classMembers = this.context.classes[className];
            console.info (this.context.classMembers);
        },
        loadDocsNS: function (namespace) {
            // console.log (arguments, this);
            this.context.op = 'loading';
            
            this.context.error = false;
            fetchDocsNS (namespace).then (function (classDocs) {

                this.context.ns = namespace;

                this.context.members = classDocs.members;
                this.context.classes = classDocs.classes;

                this.context.op = 'rendering';
                
            }.bind(this)).catch (function (err) {
                
                this.context.error = true;

                console.error (err);

                this.context.op = 'idle';
            });
        }
    }
});


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

window.app = app;

fetch('/api/docs/ns/list.json').then(function(response) {
    return response.json();
}).then(function(namespacesJSON) {
    app.ns.list = namespacesJSON;
    // console.log(JSON.stringify(myJson));
});
// fetch ('/api/docs/ns/all').then