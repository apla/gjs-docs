// 
var state = {
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
};

var actionsBase = {
    setNSList: function (list) {
        return function (state) {
            var newNS = Object.assign ({}, state.ns, {list: list});
            console.log (state.ns, newNS);
            return {ns: newNS}
        }
    },
    updateDocsNS: function (pkgDocs) {
        return function (state) {
            return {context: {
                ...state.context,
                ...pkgDocs
            }}
        }
    },
    loadDocsNS: function (namespace) {
        return function (state, actions) {

            // this.context.op = 'loading';
            
            // this.context.error = false;
            fetchDocsNS (namespace).then (function (pkgDocs) {

                actions.updateDocsNS ({
                    ns: namespace,
                    ...pkgDocs
                });

                // this.context.op = 'rendering';
                
            }.bind(this)).catch (function (err) {
                
                // this.context.error = true;

                console.error (err);

                // this.context.op = 'idle';
            });

            // return {...state}
        }
    },
    displayClass: function (className) {
        return function (state) {

            if (!className) {
                return {context: Object.assign ({}, state.context, {
                    className: '',
                    classMembers: {}
                })};
            }

            return {context: Object.assign ({}, state.context, {
                className: className,
                classMembers: state.context.classes[className]
            })};
        }
    }
};

var wiredActions = hyperapp.app(
    state,
    actionsBase,
    DocsView,
    document.querySelector("#docs-container")
);

fetch('/api/docs/ns/list.json').then(function(response) {
    return response.json();
}).then(function(namespacesJSON) {
    console.log (namespacesJSON);
    wiredActions.setNSList (namespacesJSON);
});
