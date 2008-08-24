// The license of this source is "Ruby License"

Ruby.Object = Ruby.defineClass("Object", {
  "instanceMethods": {
    
    "initialize": function(receiver) {
    },
    
    "class": function(receiver) {
      return Ruby.getClass(receiver);
    },
    
    "method_missing": function(receiver, args) {
      Ruby.fatal("Undefined method `" + args[0].native + "' for " + Ruby.getClass(receiver).name);
    },
    
    "==" : function(receiver, args) {
      return receiver == args[0];  
    },
    
    "!=": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(receiver, "==", args, block, function(res, ex) {
        if (ex) return callback(null, ex);
        callback(!res);
      });
    }),
    
    "is_a?": function(receiver, args) {
      var classObj = Ruby.getClass(receiver);
      while (classObj) {
        if (classObj == args[0]) return true;
        for (var i = 0; i < classObj.included.length; ++i) {
          if (classObj.included[i] == args[0]) return true;
        }
        classObj = classObj.superClass;
      }
      return false;
    },
    
    "kind_of?": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(receiver, "is_a?", args, block, callback);
    }),
    
    "===": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(receiver, "==", args, block, callback);
    }),
    
    "to_s" : function(receiver) {
      if(typeof(receiver) == "number")
        return receiver.toString();
      else
        return receiver.native.toString();
    },
    
    "inspect": function(receiver) {
      return "#<" + Ruby.getClass(receiver).name + ":????>";
    },
    
    // Global functions
    
    "puts" : function(receiver, args) {
      if(args.length == 0) {
        Ruby.printDebug("");
        return;
      }
      for(var i=0; i<args.length; i++) {
        var obj = args[i];
        if(obj === null) {
          Ruby.printDebug("nil");
          continue;
        }
        if(typeof(obj) == "number") {
          Ruby.printDebug(obj);
          continue;
        }
        if(obj.rubyClass == Ruby.String) {
          Ruby.printDebug(obj.native);
          continue;
        }
        if(obj.rubyClass == Ruby.Array) {
          for(var j=0; j<obj.native.length; j++) {
            Ruby.printDebug(obj.native[j]);
          }
          continue;
        }
        
        Ruby.fatal("Unsupported object");
      }
    },
    
    "p" : asyncFunc(function(receiver, args, block, callback) {
      if (args.length == 1) {
        Ruby.sendAsync(args[0], "inspect", function(res, ex) {
          Ruby.printDebug(res.native);
          callback();
        });
      } else {
        Ruby.fatal("Argument error");
      }
    }),
    
    "sleep" : asyncFunc(function(receiver, args, block, callback) {
      setTimeout(callback, args[0] * 1000);
    }),
    
    "proc": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(Ruby.Proc, "new", args, block, callback);
    }),
    
    "require": function(receiver, args) {
      // Not implemented
    },
    
    "raise": asyncFunc(function(receiver, args, block, callback) {
      callback(null, args[0]);
    }),
    
    // JS only functions
    
    "assert": function(receiver, args) {
      console.log(args[1].native);
      if (!Ruby.toBoolean(args[0])) {
        console.error("Assertion failed: " + args[1].native);
        a.hoge; // shows stack trace in FireBug
      }
    },
    
    "assert_equal": asyncFunc(function(receiver, args, block, callback) {
      console.log(args[2].native);
      Ruby.sendAsync(args[0], "==", [args[1]], function(res, ex) {
        if (ex) return callback(null, ex);
        if (!res) {
          console.error("Assertion failed: " + args[2].native, ": ", args[0], " vs ", args[1]);
          a.hoge; // shows stack trace in FireBug
        }
        callback();
      });
    }),
    
    "jp": function(receiver, args) {
      console.log(args[0]);
    }
    
  },
  "classMethods": {
    
    "new": asyncFunc(function(receiver, args, block, callback) {
      var obj = new RubyObject(receiver);
      Ruby.sendAsync(obj, "initialize", args, block, function(res, ex){
        if (ex) return callback(null, ex);
        callback(obj);
      });
    })
    
  }
});

Ruby.defineClass("Module", {
  "superClass": Ruby.Object,
  "instanceMethods": {
    
    "===": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(args[0], "is_a?", [receiver], callback);
    }),
    
    "include": function(receiver, args) {
      for (var i = 0; i < args.length; ++i) {
        Ruby.vm.includeModule(receiver, args[i]);
      }
    },
    
    "module_function": function(receiver, args) {
      if (args.length == 0) {
        receiver.scope = "module_function";
      } else {
        for (var i = 0; i < args.length; ++i) {
          Ruby.makeModuleFunction(receiver, args[i].native);
        }
      }
    },
    
    "inspect": function(receiver) {
      return receiver.name;
    }
    
  }
});

Ruby.defineClass("Class", {
  "superClass": Ruby.Module
});

Ruby.Object.constants.Object = Ruby.Object;
Ruby.Object.rubyClass = Ruby.Class;
Ruby.Object.singletonClass.rubyClass = Ruby.Class;
Ruby.Object.singletonClass.superClass = Ruby.Class;
Ruby.Module.rubyClass = Ruby.Class;
Ruby.Module.singletonClass.rubyClass = Ruby.Class;
Ruby.Class.rubyClass = Ruby.Class;
Ruby.Class.singletonClass.rubyClass = Ruby.Class;

Ruby.defineClass("NativeEnviornment", {
});
Ruby.defineClass("NativeObject", {
});
Ruby.defineClass("NativeClass", {
});

Ruby.vm = new RubyVM();

Ruby.defineClass("TrueClass", {
  "instanceMethods": {
    "!" : function(receiver) {
      return false;
    },
    
    "&" : function(receiver, args) {
      return args[0] ? true : false;
    },
    
    "|" : function(receiver, args) {
      return true;
    },

    "^" : function(receiver, args) {
      return args[0] ? false : true;
    },

    "inspect" : function(receiver) {
      return "true";
    }
  }
});

Ruby.defineClass("FalseClass", {
  "instanceMethods": {
    "!" : function(receiver) {
      return true;
    },
    
    "&" : function(receiver, args) {
      return false;
    },
    
    "|" : function(receiver, args) {
      return args[0] ? true : false;
    },

    "^" : function(receiver, args) {
      return args[0] ? true : false;
    },

    "inspect" : function(receiver) {
      return "false";
    }
  }
});

Ruby.defineClass("NilClass", {
  "instanceMethods": {
    "inspect" : function(receiver) {
      return "nil";
    }
  },
});

Ruby.defineClass("Proc", {
  "instanceMethods": {
    "initialize" : function(receiver, args, block) {
      receiver.opcode = block.opcode;
      receiver.parentStackFrame = block.parentStackFrame;
    },
    
    "yield" : asyncFunc(function(receiver, args, block, callback) {
      Ruby.vm.runOpcode(
        receiver.opcode, 
        receiver.parentStackFrame.classObj, 
        receiver.parentStackFrame.methodName, 
        receiver.parentStackFrame.self, 
        args, 
        block,
        receiver.parentStackFrame,
        true,
        function(res, ex) {
          if (ex) return callback(null, ex);
          var sf = receiver.parentStackFrame;
          callback(sf.stack[--sf.sp]);
        }
      );
    }),
    
    "call": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(receiver, "yield", args, block, callback);
    })
    
  }
});

Ruby.defineClass("Float", {
  "instanceMethods": {
    "+" : function(receiver, args) {
      return receiver + args[0];
    },

    "-" : function(receiver, args) {
      return receiver - args[0];
    },

    "*" : function(receiver, args) {
      return receiver * args[0];
    },

    "/" : function(receiver, args) {
      return receiver / args[0];
    },
    
    "%" : function(receiver, args) {
      return receiver % args[0];
    },
    
    "<=>" : function(receiver, args) {
      if(receiver > args[0])
        return 1;
      else if(receiver == args[0])
        return 0;
      if(receiver < args[0])
        return -1;
    },
    
    "<" : function(receiver, args) {
      return receiver < args[0];
    },

    ">" : function(receiver, args) {
      return receiver > args[0];
    },
    
    "<=" : function(receiver, args) {
      return receiver <= args[0];
    },

    ">=" : function(receiver, args) {
      return receiver >= args[0];
    },
    
    "==" : function(receiver, args) {
      return receiver == args[0];
    },
    
    "times" : function(receiver, args, block) {
      var i = 0;
      Ruby.loopAsync(
        function() { return i < receiver; },
        function() { ++i; },
        function(bodyCallback) {
          Ruby.sendAsync(block, "yield", [i], bodyCallback);
        },
        callback
      );
    },
    
    "to_s" : function(receiver) {
      return receiver.toString();
    },

    "inspect" : function(receiver) {
      return receiver.toString();
    }
  }
});

Ruby.defineClass("Integer", {
  "instanceMethods": {
    "+" : function(receiver, args) {
      return receiver + args[0];
    },

    "-" : function(receiver, args) {
      return receiver - args[0];
    },

    "*" : function(receiver, args) {
      return receiver * args[0];
    },

    "/" : function(receiver, args) {
      return Math.floor(receiver / args[0]);
    },
    
    "%" : function(receiver, args) {
      return receiver % args[0];
    },
    
    "<=>" : function(receiver, args) {
      if(receiver > args[0])
        return 1;
      else if(receiver == args[0])
        return 0;
      if(receiver < args[0])
        return -1;
    },
    
    "<" : function(receiver, args) {
      return receiver < args[0];
    },

    ">" : function(receiver, args) {
      return receiver > args[0];
    },
    
    "<=" : function(receiver, args) {
      return receiver <= args[0];
    },

    ">=" : function(receiver, args) {
      return receiver >= args[0];
    },
    
    "==" : function(receiver, args) {
      return receiver == args[0];
    },

    "inspect" : function(receiver) {
      return receiver.toString();
    }
  }
});

Ruby.defineClass("String", {
  "instanceMethods": {
    "+" : function(receiver, args) {
      if(typeof(args[0]) == "object")
        return receiver.native + args[0].native;
      else
        return receiver.native + args[0];
    },
    
    "<<": function(receiver, args) {
      receiver.native += args[0].native;
    },
    
    "*" : function(receiver, args) {
      var ary = new Array(args[0]);
      for(var i=0; i<args[0]; i++) {
        ary[i] = receiver.native;
      }
      return ary.join("");
    },
    
    "==" : function(receiver, args) {
      return receiver.native == args[0].native;
    },
    
    "[]" : function(receiver, args) {
      if(args.length == 1 && typeof(args[0]) == "number") {
        var no = args[0];
        if(no < 0) 
          no = receiver.native.length + no;
        if(no < 0 || no >= receiver.native.length)
          return null;
        return receiver.native.charCodeAt(no);
      } else if(args.length == 2 && typeof(args[0]) == "number" && typeof(args[1]) == "number") {
        var start = args[0];
        if(start < 0) 
          start = receiver.native.length + start;
        if(start < 0 || start >= receiver.native.length)
          return null;
        if(args[1] < 0 || start + args[1] > receiver.native.length)
          return null;
        return receiver.native.substr(start, args[1]);
      } else {
        Ruby.fatal("Unsupported String[]");
      }
    },
    
    "length": function(receiver) {
      return receiver.native.length;
    },
    
    "empty?": function(receiver) {
      return receiver.native.length == 0;
    },
    
    "to_s": function(receiver) {
      return receiver;
    },

    "inspect" : function(receiver) {
      return '"' + receiver.native + '"';
    }
  }
});

Ruby.defineClass("Array", {
  "instanceMethods": {
    "length" : function(receiver) {
      return receiver.native.length;
    },
    
    "size" : function(receiver) {
      return receiver.native.length;
    },
    
    "[]" : function(receiver, args) {
      return receiver.native[args[0]];
    },
    
    "[]=" : function(receiver, args) {
      receiver.native[args[0]] = args[1];
    },
    
    "push": function(receiver, args) {
      receiver.native.push.apply(receiver.native, args);
      return receiver;
    },
    
    "join" : function(receiver, args) {
      return receiver.native.join(args[0]);
    },
    
    "to_s" : function(receiver, args) {
      return receiver.native.join(args[0]);
    }
  }
});

Ruby.defineClass("Hash", {
  "instanceMethods": {
    
    "[]" : function(receiver, args) {
      return receiver.native[args[0].native];
    },
    
    "[]=" : function(receiver, args) {
      if(!(args[0].native in receiver.native)) {
        receiver.instanceVars.length++;
      }
      return (receiver.native[args[0].native] = args[1]);
    },
    
    "length" : function(receiver) {
      return receiver.instanceVars.length;
    },
    
    "size" : function(receiver) {
      return receiver.instanceVars.length;
    },
    
    "keys": function(receiver) {
      var keys = [];
      for (var k in receiver.native) {
        keys.push(Ruby.toRubyString(k));
      }
      return Ruby.toRubyArray(keys);
    }
    
  }
});

Ruby.defineClass("Range", {
  "instanceMethods": {
    "each" : asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(receiver, "step", [], block, callback);
    }),
    
    "begin" : function(receiver) {
      return receiver.instanceVars.first;
    },
    
    "first" : function(receiver) {
      return receiver.instanceVars.first;
    },
    
    "end" : function(receiver) {
      return receiver.instanceVars.last;
    },
    
    "last" : function(receiver) {
      return receiver.instanceVars.last;
    },
    
    "exclude_end?" : function(receiver) {
      return receiver.instanceVars.exclude_end;
    },
    
    "length" : function(receiver) {
      with(receiver.instanceVars) {
        return (last - first + (exclude_end ? 0 : 1));
      }
    },
    
    "size" : function(receiver) {
      with(receiver.instanceVars) {
        return (last - first + (exclude_end ? 0 : 1));
      }
    },
    
    "step" : asyncFunc(function(receiver, args, block, callback) {
      var step = args[0] || 1;
      var excludeEnd = receiver.instanceVars.exclude_end;
      var last = receiver.instanceVars.last;
      var i = receiver.instanceVars.first;
      Ruby.loopAsync(
        function() { return excludeEnd ? i < last : i <= last; },
        function() { i += step; },
        function(bodyCallback) {
          Ruby.sendAsync(block, "yield", [i], bodyCallback);
        },
        callback
      );
    })
  }
});

Ruby.defineClass("Thread", {
  "instanceMethods": {
    
    "initialize" : function(receiver, args, block) {
      setTimeout(function() {
        Ruby.sendAsync(block, "yield", args, function(){ });
      }, 1);
    }
    
  }
});
    
Ruby.defineClass("Time", {
  "instanceMethods": {
    
    "initialize" : function(receiver, args) {
      receiver.instanceVars.date = new Date(); 
    },
    
    "to_s" : function(receiver) {
      return receiver.instanceVars.date.toString();
    },
    
    "to_f" : function(receiver) {
      return receiver.instanceVars.date.getTime() / 1000;
    }
    
  }
});

Ruby.defineClass("StandardError", {
  "instanceMethods": {
  }
});

Ruby.defineClass("CGI", {
  "classMethods": {
    
    "escapeHTML": function(receiver, args) {
      return args[0].native.
        replace(/&/, "&amp;").
        replace(/</, "&lt;").
        replace(/>/, "&gt;").
        replace(/"/, "&quot;");
    }
    
  }
});

Ruby.defineClass("JSON", {
  "instanceMethods": {
  },
  "classMethods": {
    
    "parse": function(receiver, args) {
      var obj = eval("(" + args[0].native + ")");
      function convert(obj) {
        if (obj === null || typeof(obj) == "boolean" || typeof(obj) == "number") {
          return obj;
        } else if (typeof(obj) == "string") {
          return Ruby.toRubyString(obj);
        } else if (typeof(obj) == "object" && obj instanceof Array) {
          var ary = new Array(obj.length);
          for (var i = 0; i < obj.length; ++i) {
            ary[i] = convert(obj[i]);
          }
          return Ruby.toRubyArray(ary);
        } else {
          var ary = [];
          for (var k in obj) {
            ary.push(convert(k), convert(obj[k]));
          }
          return Ruby.toRubyHash(ary);
        }
      }
      return convert(obj);
    },
    
    "unparse": function(receiver, args) {
      function convert(obj) {
        if (obj === null) {
          return "null";
        }else if (typeof(obj) == "boolean" || typeof(obj) == "number") {
          return obj.toString();
        } else if (typeof(obj) == "string") {
          return '"' + obj.replace(/([\\"])/g, "\\$1") + '"';
        } else if (obj.rubyClass == Ruby.String) {
          return convert(obj.native);
        } else if (obj.rubyClass == Ruby.Array) {
          var ary = new Array(obj.native.length);
          for (var i = 0; i < obj.native.length; ++i) {
            ary[i] = convert(obj.native[i]);
          }
          return "[" + ary.join(",") + "]";
        } else if (obj.rubyClass == Ruby.Hash) {
          var ary = [];
          for (var k in obj.native) {
            ary.push(convert(k) + ":" + convert(obj.native[k]));
          }
          return "{" + ary.join(",") + "}";
        }
      }
      return convert(args[0]);
    }
    
  }
});

Ruby.defineClass("JS", {
  "instanceMethods": {
  },
  "classMethods": {
    
    "http_request": asyncFunc(function(receiver, args, block, callback) {
      var method = args[0];
      var url = args[1];
      var data = args[2];
      if (Ruby.getClass(data) == Ruby.Hash) {
        var ary = [];
        for (var k in data.native) {
          ary.push(k + "=" + encodeURIComponent(data.native[k].native));
        }
        data = ary.join("&");
      } else {
        data = data && data.native;
      }
      new Ajax.Request(
        url.native,
        {
          method: method.native,
          parameters: data,
          onSuccess: function(response) {
            callback(response.responseText);
          },
          onFailure: function(response) {
            // TODO: use Ruby exception
            Ruby.fatal("http_get failed");
            //callback(null);
          }
        }
      );
    }),
    
    "debug": function(receiver, args) {
      return Ruby.vm.debug;
    },
    
    "debug=": function(receiver, args) {
      Ruby.vm.debug = args[0];
    }
    
  }
});

Ruby.Object.constants["RUBY_PLATFORM"] = Ruby.toRubyString("hotruby");
