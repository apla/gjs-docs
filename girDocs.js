const gi = imports.gi;
const GIRepository = imports.gi.GIRepository;
const InfoType = GIRepository.InfoType;
const rep = GIRepository.Repository.get_default();

const NO_ARGUMENTS = false;

function loadedNamespaces () {
  return rep.get_loaded_namespaces();
}

function initScope (nsName) {
  
  const namespacesDefault = loadedNamespaces();

  const path = (nsName || '').replace(/^gi\./, '').split('.');
  if (path && path[0]) {
    const pkg = imports.gi[path[0]];
  }
  const namespaces = loadedNamespaces();

  return {
    namespaces: namespaces,
    namespacesDefault: namespacesDefault,
    walk: function () {
      let env = {};
      namespaces.forEach(name => {
        namespaceWalker(env, name);
      });

      return env;
    },
    walkNS: function (ns) {
      let env = {};
      namespaceWalker(env, ns, pkg);
      return env[ns];
    }
  }
}

function singular(name) {
  switch (name) {
    case 'abstracts': return 'abstract class';
    case 'namespace': return name;
    case 'classes': return 'class';
    case 'properties': return 'property';
    default: return name.slice(0, -1);
  }
}

function walkThrough(nmsp, info, pkg) {
  const name = info.get_name();
  switch(info.get_type()) {
    case InfoType.FUNCTION:
      if (GIRepository.callable_info_is_method(info)) {
        (nmsp.methods || (nmsp.methods = {}))[name] = functionWalker(info);
      } else {
        (nmsp.functions || (nmsp.functions = {}))[name] = functionWalker(info);
      }
      break;
    case InfoType.CALLBACK:
      (nmsp.callbacks || (nmsp.callbacks = {}))[name] = functionWalker(info);
      break;
    case InfoType.STRUCT:
      const isGTypeStruct = GIRepository.struct_info_is_gtype_struct (info);
      if (isGTypeStruct)
        break;
      const structDesc = structWalker(info);
      structDesc.struct = true;
      // (nmsp.structs || (nmsp.structs = {}))[name] = structWalker(info);
      (nmsp.classes || (nmsp.classes = {}))[name] = structDesc;
      break;
    case InfoType.ENUM:
      (nmsp.enums || (nmsp.enums = {}))[name] = enumWalker(info);
      break;
    case InfoType.FLAGS:
      (nmsp.flags || (nmsp.flags = {}))[name] = pkg[name];
      break;
    case InfoType.OBJECT:
      const classDesc = objectWalker(info);
      // const key = details.abstract ? 'abstracts' : 'classes';
      const key = 'classes';
      (nmsp[key] || (nmsp[key] = {}))[name] = classDesc;
      break;
    case InfoType.INTERFACE:
      const ifaceDesc = interfaceWalker(info);
      ifaceDesc.interface = true;
      (nmsp.classes || (nmsp.classes = {}))[name] = ifaceDesc;
      break;
    case InfoType.CONSTANT:
      (nmsp.constants || (nmsp.constants = [])).push(name);
      break;
    case InfoType.VALUE:
      nmsp[name.toUpperCase()] = GIRepository.value_info_get_value(info);
      break;
    case InfoType.SIGNAL:
      (nmsp.signals || (nmsp.signals = [])).push(name);
      break;
    case InfoType.PROPERTY:
      (nmsp.properties || (nmsp.properties = [])).push(name);
      break;
    case InfoType.FIELD:
      (nmsp.fields || (nmsp.fields = {}))[name] = fieldWalker(info);
      break;
  }
}

function getTypeInfo (typeInfo) {

  const type = typeInfo.get_type();
  // const gtype = GIRepository.registered_type_info_get_type_name (typeInfo);
  if (type === 18) { // TYPE_TYPE
    const tag = GIRepository.type_info_get_tag(typeInfo);
    let typeTag;
    switch (tag) {
      case 0:
        typeTag = 'any';
        break;
      case 1:
        typeTag = 'boolean';
        break;
      case ((tag > 0 && tag < 12) ? tag : -1):
        typeTag = 'number';
        break;
      // case 12: // gtype
      case 13: // utf8
      case 14: // filename
      case 21: // unichar
        typeTag = 'string';
        break;
      
      case 15: // array
        typeTag = 'array';
        GIRepository.type_info_get_array_type (typeInfo);
        break;
      case 16: // interface
        const typeInterface = GIRepository.type_info_get_interface (typeInfo);
        return {
          name: typeInterface.get_name(),
          ns: typeInterface.get_namespace(),
          // isPointer: GIRepository.type_info_is_pointer(typeInfo),
          type: typeInterface.get_type(),
          isInterface: true
        }
      case 17:
      case 18:
      case 19:
        const paramType = GIRepository.type_info_get_param_type(typeInfo, 0);
        
        return {
          type: 'list',
          items: [getTypeInfo (paramType)]
        }
      
      default:
        typeTag = GIRepository.type_tag_to_string(tag)
    }
    return {
      type: typeTag,
      isPointer: GIRepository.type_info_is_pointer(typeInfo),
    }
  }
  if (type === 0) // TYPE_TYPE or INVALID
    return undefined;
  return {
    name: typeInfo.get_name(),
    ns:   typeInfo.get_namespace(),
    type: type,
    // gtype: gtype
  }
}

function functionWalker(info) {
  const length = GIRepository.callable_info_get_n_args(info);
  if (NO_ARGUMENTS) return length;
  const out = {
    returns: !GIRepository.callable_info_may_return_null(info),
    may_return_null: GIRepository.callable_info_may_return_null(info),
    throws: GIRepository.callable_info_can_throw_gerror(info),
    // TODO: get type name (using type attrs? https://www.roojs.com/seed/gir-1.2-gtk-3.0/seed/GIRepository.BaseInfo.html#expand)
    type: getTypeInfo (GIRepository.callable_info_get_return_type(info)),
    params: []
  };
  // callable_info_iterate_return_attributes
  for (let i = 0; i < length; i++) {
    const arg = GIRepository.callable_info_get_arg(info, i);
    out.params.push({
      name: arg.get_name(),
      null: GIRepository.arg_info_may_be_null(arg),
      optional: GIRepository.arg_info_is_optional(arg),
      // TODO: get type name
      type: getTypeInfo (GIRepository.arg_info_get_type(arg))
      // direction arg_info_get_direction
    });
  }
  return out;
}

function structWalker(info) {
  const out = {};
  let length = GIRepository.struct_info_get_n_methods(info);
  for (let i = 0; i < length; i++) {
    walkThrough(out, GIRepository.struct_info_get_method(info, i));
  }
  length = GIRepository.struct_info_get_n_fields(info);
  for (let i = 0; i < length; i++) {
    walkThrough(out, GIRepository.struct_info_get_field(info, i));
  }

  out.is_foreign = GIRepository.struct_info_is_foreign (info);
  out.is_gtype_struct = GIRepository.struct_info_is_gtype_struct (info);

  return out;
}

function enumWalker(info) {
  const out = {};
  let length = GIRepository.enum_info_get_n_methods(info);
  for (let i = 0; i < length; i++) {
    walkThrough(out, GIRepository.enum_info_get_method(info, i));
  }
  length = GIRepository.enum_info_get_n_values(info);
  for (let i = 0; i < length; i++) {
    walkThrough(out, GIRepository.enum_info_get_value(info, i));
  }
  return out;
}

function genericWalker (info, type, n_memberTypesExpand, n_memberTypes, memberTypesExpand, memberTypes, flags) {
  const out = {};

  flags.forEach (function (flag) {
    out[flag] = GIRepository[type + '_info_' + flag] (info);
  })
//  out.is_foreign = GIRepository.struct_info_is_foreign (info);
//  out.is_gtype_struct = GIRepository.struct_info_is_gtype_struct (info);

  n_memberTypesExpand.forEach (function (n_memberType) {
    let length = GIRepository[type + '_info_get_n_' + n_memberType](info);
    for (let i = 0; i < length; i++) {
      walkThrough(out, GIRepository[type + '_info_get_' + singular(n_memberType)](info, i));
    }
  });
  
  n_memberTypes.forEach (function (n_memberType) {
    let length = GIRepository[type + '_info_get_n_' + n_memberType](info);
    for (let i = 0; i < length; i++) {
      const member = GIRepository[type + '_info_get_' + singular(n_memberType)](info, i);
      (out[n_memberType] || (out[n_memberType] = [])).push (member.get_name());
      // walkThrough(out, GIRepository[type + '_info_get_' + singular(n_memberType)](info, i));
    }
  });

  memberTypes.forEach (function (memberType) {
    out[memberType] = GIRepository[type + '_info_get_' + memberType] (info);
  })

  return out;
}

function walkNMembers (info, type, expanded, n_memberTypes) {
  const out = {};

  n_memberTypes.forEach (function (n_memberType) {
    let length = GIRepository[type + '_info_get_n_' + n_memberType](info);
    for (let i = 0; i < length; i++) {
      if (expanded) {
        walkThrough(out, GIRepository[type + '_info_get_' + singular(n_memberType)](info, i));
      } else {
        const member = GIRepository[type + '_info_get_' + singular(n_memberType)](info, i);
        (out[n_memberType] || (out[n_memberType] = [])).push (member.get_name());
      }
    }
  });
  
  return out;
}

function walkMembers (info, type, expanded, memberTypes) {
  const out = {};

  memberTypes.forEach (function (memberType) {
    if (expanded) {
      walkThrough(out, GIRepository[type + '_info_get_' + memberType](info));
    } else {
      const member = GIRepository[type + '_info_get_' + memberType](info);
      if (member)
        out[memberType] = member.get_name();
    }
    // out[memberType] = GIRepository[type + '_info_get_' + memberType] (info);
  })
  
  return out;
}


function interfaceWalker(info) {
  const out = {};
  return Object.assign ({},
    walkNMembers (
      info, 'interface', true /* walkThrough for every element */,
      'constants methods prerequisites properties signals vfuncs'.split (' ')
    )
    //walkMembers (
    //  info, 'object', false /* walkThrough for every element */,
    //  'class_struct'.split (' ')
    //)
  );
}

function objectWalker(info) {
  return Object.assign ({},
    walkNMembers (
      info, 'object', true /* walkThrough for every element */,
      'constants fields methods properties signals vfuncs'.split (' ')
    ),
    walkNMembers (
      info, 'object', false /* walkThrough for every element */,
      'interfaces'.split (' ')
    ),
    walkMembers (
      info, 'object', false /* walkThrough for every element */,
      'parent'.split (' ')
    )
  );
}

function fieldWalker(info) {
  return GIRepository.field_info_get_flags(info);
}

function namespaceWalker(env, Namespace, pkg) {
  const nmsp = (env[Namespace] = {});
  env[Namespace].deps = rep.get_dependencies(Namespace);
  env[Namespace].immediate_deps = rep.get_immediate_dependencies(Namespace);
  env[Namespace].versions = rep.enumerate_versions(Namespace);
  env[Namespace].version = rep.get_version(Namespace);
  
  const length = rep.get_n_infos(Namespace);
  for (let i = 0; i < length; i++) {
    walkThrough(nmsp, rep.get_info(Namespace, i), pkg);
  }
}



function bold(str) {
  return ("\u001b[1m" + str + "\u001b[0m");
}

function dim(str) {
  return ("\u001b[2m" + str + "\u001b[0m");
}

function prettyPrint(json) {
  for (var key in json) {
    var loop = function ( sub ) {
      var out = [];
      var info = json[key][sub];
      switch (key) {
        case 'struct':
          out.push(((dim(key)) + " " + (bold(sub)) + " {"));
          for (var k in (info.methods || {})) {
            out.push(("\n  " + k));
            out.push(inlineArguments(info.methods[k]));
            out.push(' {}');
          }
          if (info.fields) {
            out.push('\n\n  ' + dim('// fields'));
            out.push(showList(Object.keys(info.fields)), dim('; '));
          }
          out.push("\n}");
          break;
        case 'namespace':
          out.push(showNamespace(info, key, sub));
          break;
        case 'enum':
          out.push(((dim(key)) + " " + (bold(sub)) + " {"));
          Object.keys(info).forEach(function (key) {
            out.push(("\n  " + key + ": " + (dim(info[key]))));
          });
          out.push("\n}");
          break;
        case 'abstract class':
        case 'interface':
        case 'class':
          out.push(((dim(key)) + " " + (bold(sub)) + " {"));
          if (info.signals) {
            out.push(("\n  " + (dim('#signals')) + " = [" + (info.signals.join(', ')) + "];"));
            out.push('\n');
          }
          (info.constants || []).forEach(function (c) {
            out.push(("\n  " + (dim('static')) + " " + c + ";"));
          });
          for (var k$1 in (info.functions || {})) {
            out.push(("\n  " + (dim('static')) + " " + k$1));
            out.push(inlineArguments(info.functions[k$1]));
            out.push(' {}');
          }
          if (info.functions) {
            if (info.functions.new) {
              out.push("\n\n  constructor(options:Object) {}");
            }
            out.push('\n\n  ' + dim('// methods'));
          }
          for (var k$2 in (info.methods || {})) {
            out.push(("\n  " + k$2));
            out.push(inlineArguments(info.methods[k$2]));
            out.push(' {}');
          }
          if (info.properties) {
            out.push('\n\n  ' + dim('// properties'));
            out.push(showList(info.properties), dim('; '));
          }
          out.push("\n}");
          break;
        case 'method':
        case 'function':
          if (key === 'function') {
            out.push(((dim(key)) + " " + (bold(sub))));
          } else {
            out.push(((sub.slice(0, sub.lastIndexOf('.'))) + ".prototype." + (bold(sub.slice(sub.lastIndexOf('.') + 1)))));
          }
          out.push(parseArguments(info));
          break;
      }
      print('');
      print(out.join(''));
      print('');
    };

    for (var sub in json[key]) loop( sub );
  }
}

function inlineArguments(info) {
  return parseArguments(info).replace(/\n\s*/g, '').replace(/,(\S)/g, ', $1');
}

function parseArguments(info) {
  var out = ['('];
  if (typeof info === 'number') {
    if (info) { out.push((info + " parameter" + (info === 1 ? '' : 's'))); }
  } else {
    info.params.forEach(function (arg, i) {
      if (i) { out.push(','); }
      if (arg.optional) {
        out.push('\n  ', dim(arg.name));
        if (arg.null) { out.push(dim('|null')); }
        out.push(dim('?'));
      } else {
        out.push('\n  ', arg.name);
        if (arg.null) { out.push(dim('|null')); }
      }
    });
    if (info.params.length) { out.push('\n'); }
  }
  out.push((")" + (dim(':any' + (info.returns ? '' : '|null')))));
  return out.join('');
}

function showList(list, sep, nl, perLine) {
  if ( sep === void 0 ) sep = ', ';
  if ( nl === void 0 ) nl = '\n  ';
  if ( perLine === void 0 ) perLine = 5;

  var out = [];
  var length = list.length;
  for (var i = 0; i < length; i++) {
    if (!(i % perLine)) { out.push(nl); }
    out.push(list[i], dim(sep));
  }
  out.pop();
  return out.join('');
}

function showNamespace(info, key, sub) {
  var out = [];
  var args = ARGUMENTS.slice(1);
  var keys = Object.keys(info);
  if (args.some((arg) => { return keys.indexOf(arg) >= 0; })) {
    keys = keys.filter(function (key) { return args.indexOf(key) >= 0; });
  } else if (args.length) { return ((dim(key)) + " " + (bold(sub)) + " has no " + (args.join(', '))); }
  out.push(((dim(key)) + " " + (bold(sub))));
  keys.forEach(function (key) {
    var list;
    switch (key) {
      case 'methods':
      case 'functions':
        list = Object.keys(info[key]);
        out.push(("\n\n  " + (dim(key)) + " " + (list.length) + (showList(list, '', '\n  ', 1))));
        break;
      case 'abstracts':
      case 'interfaces':
      case 'classes':
      case 'enums':
      case 'callbacks':
        list = Object.keys(info[key]);
        out.push(("\n\n  " + (dim(key)) + " " + (list.length) + (showList(list))));
        break;
      case 'structs':
        var structs = Object.keys(info[key]);
        list = structs.filter(function (name) { return !/Private/.test(name); });
        out.push(("\n\n  " + (dim(key)) + " " + (structs.length) + " " + (dim(("(" + (structs.length - list.length) + " privates)"))) + (showList(list))));
        break;
      case 'flags':
        list = info[key];
        out.push(("\n\n  " + (dim(key)) + " " + (list.length) + (showList(list))));
        break;
    }
  });
  return out.join('');
}
