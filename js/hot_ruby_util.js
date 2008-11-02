// The license of this source is "Ruby License"

function asyncFunc(func) {
  func.async = true;
  return func;
}

var Ruby = {
  
  sendAsync: function(receiver, name, args, block, callback) {
    if (typeof(callback) == "undefined") {
      if (typeof(block) == "undefined") {
        callback = args;
        args = [];
      } else {
        callback = block;
        block = null;
      }
    }
    //console.log(receiver, name, args, block, callback);
    Ruby.vm.invokeMethod(receiver, name, args, block, 0, false, null, callback);
  },
  
  sendSync: function(receiver, name, args, block) {
    var done = false;
    var result;
    Ruby.vm.invokeMethod(receiver, name, args, block, 0, false, null, function(res, ex) {
      if (ex) {
        // TODO: throw instead
        console.error("Exception in sendSync: ", ex);
        Ruby.fatal("Exception in sendSync");
      } else {
        done = true;
        result = res;
      }
    });
    if (!done) Ruby.fatal("Async call inside sendSync");
    return result;
  },
  
  /**
   * Returns class name from object.
   * @param obj
   * @return {String}
   */
  getClass : function(obj) {
    if (obj == null)
      return Ruby.NilClass;
    switch (typeof(obj)) {
      case "object" :
        return obj.rubyClass;
      case "number" :
        // TODO: Cannot distinguish 1 and 1.0. Fix it later.
        return Math.floor(obj) == obj ? Ruby.Fixnum : Ruby.Float;
      case "boolean" :
        return obj ? Ruby.TrueClass : Ruby.FalseClass;
      default :
        Ruby.fatal("[getClass] unknown type : " + typeof(obj));
    }
  },
  
  getSingletonClass: function(obj) {
    if (obj != null && obj.rubyClass) {
      if (!obj.singletonClass) {
        obj.singletonClass = new RubyModule(null, {
          superClass: obj.rubyClass,
          type: "singleton"
        });
      }
      return obj.singletonClass;
    } else {
      Ruby.fatal("Cannot define singleton method for: " + obj.toString());
    }
  },
  
  eachAncestor: function(classObj, block) {
    var res;
    while (classObj) {
      if (typeof(res = block(classObj)) != "undefined") return res;
      var included = classObj.included;
      for (var i = included.length - 1; i >= 0; --i) {
        if (typeof(res = block(included[i])) != "undefined") return res;
      }
      classObj = classObj.superClass;
    }
  },
  
  defineClass: function(className, params) {
    params.type = "class";
    return new RubyModule(className, params);
  },
  
  defineModule: function(className, params) {
    params.type = "module";
    return new RubyModule(className, params);
  },
  
  defineMethod: function(classObj, name, func) {
    classObj.methods[name] = func;
  },
  
  makeModuleFunction: function(classObj, name) {
    // TODO: make it private
    Ruby.getSingletonClass(classObj).methods[name] = classObj.methods[name];
  },
  
  getInstanceVar: function(receiver, name) {
    return receiver.instanceVars[name];
  },
  
  setInstanceVar: function(receiver, name, value) {
    receiver.instanceVars[name] = value;
  },
  
  /**
   * Convert ruby object to native value
   * @param v ruby object
   */
  toNative: function(v) {
    if (v == null || typeof(v) != "object") {
      return v;
    } else if (v.rubyClass == Ruby.Proc) {
      var func = function() {
        var proc = arguments.callee.proc;
        var result;
        Ruby.vm.runOpcode(
          proc.opcode, 
          proc.parentStackFrame.invokeClass, 
          proc.parentStackFrame.methodName, 
          proc.parentStackFrame.self, 
          Ruby.arrayNativeToRuby(arguments),
          null,
          proc.parentStackFrame,
          true,
          function(res, ex) {
            if (ex) throw ex;
            result = res;
          }
        );
        return result;
      };
      func.proc = v;
      return func;
    } else if (v.rubyClass == Ruby.Array) {
      return v.instanceVars["@tuple"].value.map(function(e) {
        return Ruby.toNative(e);
      });
    } else if (v.rubyClass == Ruby.Hash) {
      var keys = Ruby.sendSync(v, "keys", []);
      var numKeys = Ruby.arraySize(keys);
      var hash = {};
      for (var i = 0; i < numKeys; ++i) {
        var key = Ruby.arrayAt(keys, i);
        if (Ruby.getClass(key) != Ruby.String) Ruby.fatal("Key must be String");
        hash[Ruby.toNative(key)] = Ruby.toNative(Ruby.sendSync(v, "get_key_cv", [key]));
      }
      return hash;
    } else {
      return v.value;
    }
  },
  
  /**
   * Convert array of ruby object to array of native object
   * @param {Array} ary Array of ruby object
   */
  arrayRubyToNative: function(ary) {
    var convAry = new Array(ary.length);
    for(var i=0; i<ary.length; i++) {
      convAry[i] = Ruby.toNative(ary[i]);
    }
    return convAry;
  },
  
  /**
   * Convert native object to ruby object
   * @param v native object
   */
  toRuby: function(v) {
    if (typeof(v) == "undefined") {
      return null;
    }
    if (v == null || typeof(v) == "boolean" || typeof(v) == "number") {
      return v;  
    }
    if (typeof(v) == "object" && v.rubyClass) {
      return v;
    }
    if (typeof(v) == "string") {
      return Ruby.newRubyString(v);
    }
    if (typeof(v) == "object" && v instanceof Array) {
      var ary = new Array(v.length);
      for (var i = 0; i < v.length; ++i) {
        ary[i] = Ruby.toRuby(v[i]);
      }
      return Ruby.newRubyArray(ary);
    }
    var obj = new RubyObject(Ruby.NativeObject);
    obj.value = v;
    return obj;
  },
  
  /**
   * Convert array of native object to array of ruby object
   * @param {Array} ary Array of native object
   */
  arrayNativeToRuby: function(ary) {
    var convAry = new Array(ary.length);
    for(var i=0; i<ary.length; i++) {
      convAry[i] = Ruby.toRuby(ary[i]);
    }
    return convAry;
  },
  
  /**
   * JavaScript String -> Ruby String
   * @param {String} str
   * @return {String}
   */
  newRubyString : function(str) {
    var obj = new RubyObject(Ruby.String);
    obj.value = str;
    return obj;
  },
  
  newRubyRegexp : function(source, options) {
    var exp = new RubyObject(Ruby.Regexp);
    exp.source = source;
    exp.opts = options;
    // Javascript "m" option allows "a\nb" matches /^b/, which is default in Ruby.
    var flags = "mg";
    if (exp.opts & Ruby.Regexp.constants.IGNORECASE) flags += "i";
    exp.exp = new RegExp(source, flags);
    return exp;
  },
  
  /**
   * opcode -> Ruby Proc
   * @param {Array} opcode
   * @param {RubyVM.StackFrame} sf
   * @return {Object} Proc
   */
  newRubyProc : function(opcode, sf) {
    var obj = new RubyObject(Ruby.Proc);
    obj.opcode = opcode;
    obj.parentStackFrame = sf;
    return obj;
  },
  
  newRubyTuple : function(ary) {
    ary = ary || [];
    var tuple = new RubyObject(Ruby.Tuple);
    tuple.value = ary;
    return tuple;
  },
  
  /**
   * JavaScript Array -> Ruby Array
   * @param {Array} ary
   * @return {RubyObject}
   */
  newRubyArray : function(ary) {
    ary = ary || [];
    var tuple = new RubyObject(Ruby.Tuple);
    tuple.value = ary;
    var obj = new RubyObject(Ruby.Array);
    obj.instanceVars = {
      "@start": 0,
      "@total": ary.length,
      "@tuple": tuple
    };
    return obj;
  },
  
  /**
   * JavaScript Array -> Ruby Hash
   * @param {Array} ary
   * @return {Object}
   */
  newRubyHash : function(ary) {
    var hash = new RubyObject(Ruby.Hash);
    Ruby.sendSync(hash, "initialize", []);
    for (var i = 0;i < ary.length; i += 2) {
      Ruby.sendSync(hash, "set_key_cv", [ary[i], ary[i + 1]]);
    }
    return hash;
  },
  
  /**
   * Creates Ruby Range
   * @param {Number} last
   * @param {Number} first
   * @param {boolean} exclude_end
   */
  newRubyRange : function(first, last, exclude_end) {
    var obj = new RubyObject(Ruby.Range);
    obj.instanceVars = {
      "@begin": first,
      "@end": last,
      "@excl": exclude_end
    };
    return obj;
  },
  
  intern: function(str) {
    // TODO: should be Symbol instead of String
    return Ruby.newRubyString(str);
  },
  
  toBoolean: function(val) {
    return val !== false && val != null;
  },
  
  arrayAt: function(rary, index) {
    return rary.instanceVars["@tuple"].value[index];
  },
  
  arraySize: function(rary) {
    return rary.instanceVars["@total"];
  },
  
  hashGet: function(rhash, key) {
    return Ruby.sendSync(rhash, "get_key_cv", [key]);
  },
  
  hashKeys: function(rhash) {
    var rkeys = Ruby.sendSync(rhash, "keys", []);
    var keys = new Array(Ruby.arraySize(rkeys));
    for (var i = 0; i < keys.length; ++i) {
      keys[i] = Ruby.arrayAt(rkeys, i);
    }
    return keys;
  },
  
  getGlobalVar: function(name) {
    return Ruby.vm.globalVars[name];
  },
  
  setGlobalVar: function(name, value) {
    Ruby.vm.globalVars[name] = value;
  },
  
  raise: function(classObj, message, callback) {
    var ex = new RubyObject(classObj || Ruby.Exception);
    Ruby.setInstanceVar(ex, "@message", Ruby.toRuby(message));
    Ruby.setInstanceVar(ex, "@backtrace", Ruby.newRubyArray());
    callback(null, ex);
  },
  
  blockGiven: function() {
    return Ruby.vm.getLocalStackFrame(Ruby.vm.latestStackFrame).block != null;
  },
  
  // Async version of for (; cond(); increment()) { body(); }
  loopAsync: function(cond, increment, body, callback) {
    var deferred = false;
    for(; !deferred && cond(); increment()) {
      (function() {
        var inBody = true;
        var callbackCalled = false;
        body(function(res, ex) {
          if (ex) return callback(null, ex);
          if (inBody) {
            callbackCalled = true;
          } else {
            increment();
            Ruby.loopAsync(cond, increment, body, callback);
          }
        });
        inBody = false;
        if (!callbackCalled) deferred = true;
      })();
      if (deferred) return;
    }
    callback();
  },

  /**
   * Print to debug dom.
   * @param {String} str
   */
  printDebug : function(str) {
    switch(Ruby.vm.env) {
      case "browser":
        var out = Ruby.vm.debugDom;
        str = str.replace(/ /g, "\u00a0"); // " " -> "&nbsp;"
        str.split(/(\n)/).each(function(piece) {
          var node = piece == "\n" ? document.createElement("br") : document.createTextNode(piece);
          out.appendChild(node);
        });
        break;
      case "flash":
        RubyVM.debugTextField.text += str;
        break;
      case "console":
        print(str);
        break;
      default:
        Ruby.fatal("Unknown env");
        break;
    }
  },

  fatal: function(message) {
    console.error(message);
    this.printDebug(message + "\n");
    Aborted.aborted;
  }

};
