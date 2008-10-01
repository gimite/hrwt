// The license of this source is "Ruby License"

Ruby.Object = Ruby.defineClass("Object", {
  "instanceMethods": {
    
    "initialize": function(receiver) {
    },
    
    "class": function(receiver) {
      return Ruby.getClass(receiver);
    },
    
    "method_missing": function(receiver, args) {
      Ruby.fatal("Undefined method `" + args[0].value + "' for " + Ruby.getClass(receiver).name);
    },
    
    "equal?" : function(receiver, args) {
      return receiver == args[0];  
    },
    
    "==" : function(receiver, args) {
      return receiver == args[0];  
    },
    
    "eql?" : function(receiver, args) {
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
    
    "respond_to?": function(receiver, args) {
      var methodName = args[0];
      return Ruby.vm.respondTo(receiver, methodName.value);
    },
    
    "object_id": function(receiver) {
      return 0; // TODO: implement it
    },
    
    "__send__": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(receiver, args[0].value, args.slice(1), block, callback);
    }),
    
    "to_s" : function(receiver) {
      if(typeof(receiver) == "number")
        return receiver.toString();
      else
        return receiver.value.toString();
    },
    
    "inspect": function(receiver) {
      return "#<" + Ruby.getClass(receiver).name + ":????>";
    },
    
    // Global functions
    
    /*
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
          Ruby.printDebug(obj.value);
          continue;
        }
        if(obj.rubyClass == Ruby.Array) {
          for(var j=0; j<obj.value.length; j++) {
            Ruby.printDebug(obj.value[j]);
          }
          continue;
        }
        
        Ruby.fatal("Unsupported object");
      }
    },
    
    "p" : asyncFunc(function(receiver, args, block, callback) {
      if (args.length == 1) {
        Ruby.sendAsync(args[0], "inspect", function(res, ex) {
          Ruby.printDebug(res.value);
          callback();
        });
      } else {
        Ruby.fatal("Argument error");
      }
    }),
    
    "require": function(receiver, args) {
      // Not implemented
    },
    */
    
    // JS only functions
    
    "assert": function(receiver, args) {
      console.log(args[1].value);
      if (!Ruby.toBoolean(args[0])) {
        console.error("Assertion failed: " + args[1].value);
        a.hoge; // shows stack trace in FireBug
      }
    },
    
    "assert_equal": asyncFunc(function(receiver, args, block, callback) {
      console.log(args[2].value);
      Ruby.sendAsync(args[0], "==", [args[1]], function(res, ex) {
        if (ex) return callback(null, ex);
        if (!res) {
          console.error("Assertion failed: " + args[2].value, ": ", args[0], " vs ", args[1]);
          a.hoge; // shows stack trace in FireBug
        }
        callback();
      });
    }),
    
    "jp": function(receiver, args) {
      console.log(args[0]);
    }
    
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
    
    "private": function(receiver, args) {
      // TODO: implement
    },
    
    "module_function": function(receiver, args) {
      if (args.length == 0) {
        receiver.scope = "module_function";
      } else {
        for (var i = 0; i < args.length; ++i) {
          Ruby.makeModuleFunction(receiver, args[i].value);
        }
      }
    },
    
    "alias_method": function(receiver, args) {
      receiver.methods[args[0].value] = receiver.methods[args[1].value];
    },
    
    "ancestors": function(receiver) {
      var ary = [];
      Ruby.eachAncestor(receiver, function(c) {
        ary.push(c);
      });
      return Ruby.toRubyArray(ary);
    },
    
    "attr_reader": function(receiver, args) {
      args.each(function(arg) {
        Ruby.defineMethod(receiver, arg.value, function(obj) {
          return Ruby.getInstanceVar(obj, "@" + arg.value);
        });
      });
    },
    
    "inspect": function(receiver) {
      return receiver.name;
    }
    
  }
});

Ruby.defineClass("Class", {
  "superClass": Ruby.Module,
  "instanceMethods": {
    
    "allocate": function(receiver) {
      return new RubyObject(receiver);
    }
    
  }
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

Ruby.defineModule("Kernel", {
  "instanceMethods": {
    
    "__sleep__" : asyncFunc(function(receiver, args, block, callback) {
      setTimeout(callback, args[0] * 1000);
    }),
    
    "__proc__": asyncFunc(function(receiver, args, block, callback) {
      Ruby.sendAsync(Ruby.Proc, "new", args, block, callback);
    }),
    
    "__block_given__": function(receiver) {
      return Ruby.vm.latestStackFrame.block != null;
    },
    
    "__raise__": asyncFunc(function(receiver, args, block, callback) {
      callback(null, args[0]);
    })
    
  }
});

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

    "to_s" : function(receiver) {
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

    "to_s" : function(receiver) {
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
    
    "to_s" : function(receiver) {
      return receiver.toString();
    },

    "inspect" : function(receiver) {
      return receiver.toString();
    }
  }
});

Ruby.defineClass("Numeric", {
});

Ruby.defineClass("Integer", {
  "superClass": Ruby.Numeric,
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

    "<<" : function(receiver, args) {
      return receiver << args[0];
    },
    
    ">>" : function(receiver, args) {
      return receiver >> args[0];
    },
    
    "__and__" : function(receiver, args) {
      return receiver & args[0];
    },
    
    "__or__" : function(receiver, args) {
      return receiver | args[0];
    },
    
    "__xor__" : function(receiver, args) {
      return receiver ^ args[0];
    },
    
    "succ" : function(receiver) {
      return receiver + 1;
    },

    "hash" : function(receiver) {
      return receiver; // TODO: better value
    },

    "times" : asyncFunc(function(receiver, args, block, callback) {
      var i = 0;
      Ruby.loopAsync(
        function() { return i < receiver; },
        function() { ++i; },
        function(bodyCallback) {
          Ruby.sendAsync(block, "yield", [i], bodyCallback);
        },
        callback
      );
    }),
    
    "inspect" : function(receiver) {
      return receiver.toString();
    }
    
  }
});

Ruby.defineClass("String", {
  "instanceMethods": {
    "+" : function(receiver, args) {
      if(typeof(args[0]) == "object")
        return receiver.value + args[0].value;
      else
        return receiver.value + args[0];
    },
    
    "<<": function(receiver, args) {
      receiver.value += args[0].value;
    },
    
    "*" : function(receiver, args) {
      var ary = new Array(args[0]);
      for(var i=0; i<args[0]; i++) {
        ary[i] = receiver.value;
      }
      return ary.join("");
    },
    
    "==" : function(receiver, args) {
      return receiver.value == args[0].value;
    },
    
    "eql?" : function(receiver, args) {
      return receiver.value == args[0].value;
    },
    
    "hash" : function(receiver) {
      var hash = 0;
      for (var i = 0; i < receiver.value.length; ++i) {
        hash += receiver.value.charCodeAt(i);
      }
      return hash;
    },
    
    "[]" : function(receiver, args) {
      if(args.length == 1 && typeof(args[0]) == "number") {
        var no = args[0];
        if(no < 0) 
          no = receiver.value.length + no;
        if(no < 0 || no >= receiver.value.length)
          return null;
        return receiver.value.charCodeAt(no);
      } else if(args.length == 2 && typeof(args[0]) == "number" && typeof(args[1]) == "number") {
        var start = args[0];
        if(start < 0) 
          start = receiver.value.length + start;
        if(start < 0 || start >= receiver.value.length)
          return null;
        if(args[1] < 0 || start + args[1] > receiver.value.length)
          return null;
        return receiver.value.substr(start, args[1]);
      } else {
        Ruby.fatal("Unsupported String[]");
      }
    },
    
    "length": function(receiver) {
      return receiver.value.length;
    },
    
    "empty?": function(receiver) {
      return receiver.value.length == 0;
    },
    
    "dup": function(receiver) {
      return Ruby.toRubyString(receiver.value);
    },
    
    "to_s": function(receiver) {
      return receiver;
    },

    "inspect" : function(receiver) {
      return '"' + receiver.value + '"';
    }
  }
});

Ruby.defineClass("Tuple", {
  "instanceMethods": {
    
    "initialize" : function(receiver, args) {
      receiver.value = new Array(args[0]);
      for (var i = 0; i < args[0]; ++i) {
        receiver.value[i] = null;
      }
    },
    
    "dup": function(receiver) {
      var res = new RubyObject(Ruby.Tuple);
      res.value = receiver.value.concat([]);
      return res;
    },
    
    "fields" : function(receiver) {
      return receiver.value.length;
    },
    
    "at" : function(receiver, args) {
      return receiver.value[args[0]];
    },
    
    "[]" : function(receiver, args) {
      return receiver.value[args[0]];
    },
    
    "put" : function(receiver, args) {
      receiver.value[args[0]] = args[1];
    },
    
    "[]=" : function(receiver, args) {
      receiver.value[args[0]] = args[1];
    },
    
    "copy_from": function(receiver, args) {
      var other = args[0];
      var op = args[1];
      var sp = args[2];
      for (; op < other.value.length; ++op) {
        receiver.value[sp] = other.value[op];
        ++sp;
      }
    }
    
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

Ruby.defineClass("IO", {
  "instanceMethods": {
    
    "write" : function(receiver, args) {
      // For now, only supports console output.
      Ruby.printDebug(args[0].value);
    }
    
  }
});

Ruby.defineClass("Exception", {
  "instanceMethods": {
  }
});

Ruby.defineClass("StandardError", {
  "superClass": Ruby.Exception,
  "instanceMethods": {
  }
});

Ruby.defineClass("BreakException", {
  "instanceMethods": {
  }
});

Ruby.defineClass("ReturnException", {
  "instanceMethods": {
  }
});

Ruby.defineClass("CGI", {
  "classMethods": {
    
    "escapeHTML": function(receiver, args) {
      return args[0].value.
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
      var obj = eval("(" + args[0].value + ")");
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
          return convert(obj.value);
        } else if (obj.rubyClass == Ruby.Array) {
          var ary = new Array(obj.value.length);
          for (var i = 0; i < obj.value.length; ++i) {
            ary[i] = convert(obj.value[i]);
          }
          return "[" + ary.join(",") + "]";
        } else if (obj.rubyClass == Ruby.Hash) {
          var ary = [];
          for (var k in obj.value) {
            ary.push(convert(k) + ":" + convert(obj.value[k]));
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
        for (var k in data.value) {
          ary.push(k + "=" + encodeURIComponent(data.value[k].value));
        }
        data = ary.join("&");
      } else {
        data = data && data.value;
      }
      new Ajax.Request(
        url.value,
        {
          method: method.value,
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
