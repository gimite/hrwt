// The license of this source is "Ruby License"

Ruby.Object = Ruby.defineClass("Object", {
  "instanceMethods": {
    
    "initialize": function(self) {
    },
    
    "class": function(self) {
      return Ruby.getClass(self);
    },
    
    "method_missing": function(self, args) {
      Ruby.fatal("Undefined method `" + args[0].value + "' for " + Ruby.getClass(self).name);
    },
    
    "equal?" : function(self, args) {
      return self == args[0];  
    },
    
    "==" : function(self, args) {
      return self == args[0];  
    },
    
    "eql?" : function(self, args) {
      return self == args[0];  
    },
    
    "!=": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(self, "==", args, block, function(res, ex) {
        if (ex) return callback(null, ex);
        callback(!res);
      });
    }),
    
    "is_a?": function(self, args) {
      var classObj = Ruby.getClass(self);
      while (classObj) {
        if (classObj == args[0]) return true;
        for (var i = 0; i < classObj.included.length; ++i) {
          if (classObj.included[i] == args[0]) return true;
        }
        classObj = classObj.superClass;
      }
      return false;
    },
    
    "kind_of?": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(self, "is_a?", args, block, callback);
    }),
    
    "===": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(self, "==", args, block, callback);
    }),
    
    "respond_to?": function(self, args) {
      var methodName = args[0];
      return Ruby.vm.respondTo(self, methodName.value);
    },
    
    "object_id": function(self) {
      return 0; // TODO: implement it
    },
    
    "__send__": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(self, args[0].value, args.slice(1), block, callback);
    }),
    
    "to_s" : function(self) {
      if(typeof(self) == "number")
        return self.toString();
      else
        return self.value.toString();
    },
    
    "inspect": function(self) {
      return "#<" + Ruby.getClass(self).name + ":????>";
    },
    
    // Global functions
    
    /*
    "puts" : function(self, args) {
      if(args.length == 0) {
        Ruby.printDebug("");
        return;
      }
      for(var i=0; i<args.length; i++) {
        var obj = args[i];
        if(obj == null) {
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
    
    "p" : asyncFunc(function(self, args, block, callback) {
      if (args.length == 1) {
        Ruby.sendAsync(args[0], "inspect", function(res, ex) {
          Ruby.printDebug(res.value);
          callback();
        });
      } else {
        Ruby.fatal("Argument error");
      }
    }),
    
    "require": function(self, args) {
      // Not implemented
    },
    */
    
    // JS only functions
    
    "assert": function(self, args) {
      console.log(args[1].value);
      if (!Ruby.toBoolean(args[0])) {
        console.error("Assertion failed: " + args[1].value);
        a.hoge; // shows stack trace in FireBug
      }
    },
    
    "assert_equal": asyncFunc(function(self, args, block, callback) {
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
    
    "__write__" : function(self, args) {
      // For Kernel.__print_exception__
      Ruby.printDebug(args[0].value);
    },
    
    "jp": function(self, args) {
      console.log(args[0]);
    }
    
  }
});

Ruby.defineClass("Module", {
  "superClass": Ruby.Object,
  "instanceMethods": {
    
    "===": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(args[0], "is_a?", [self], callback);
    }),
    
    "include": function(self, args) {
      for (var i = 0; i < args.length; ++i) {
        Ruby.vm.includeModule(self, args[i]);
      }
    },
    
    "private": function(self, args) {
      // TODO: implement
    },
    
    "module_function": function(self, args) {
      if (args.length == 0) {
        self.scope = "module_function";
      } else {
        for (var i = 0; i < args.length; ++i) {
          Ruby.makeModuleFunction(self, args[i].value);
        }
      }
    },
    
    "alias_method": function(self, args) {
      self.methods[args[0].value] = self.methods[args[1].value];
    },
    
    "ancestors": function(self) {
      var ary = [];
      Ruby.eachAncestor(self, function(c) {
        ary.push(c);
      });
      return Ruby.newRubyArray(ary);
    },
    
    "attr_reader": function(self, args) {
      // TODO: rewrite it without dynamic function.
      args.each(function(arg) {
        Ruby.defineMethod(self, arg.value, function(obj) {
          return Ruby.getInstanceVar(obj, "@" + arg.value);
        });
      });
    },
    
    "attr_writer": function(self, args) {
      // TODO: rewrite it without dynamic function.
      args.each(function(arg) {
        Ruby.defineMethod(self, arg.value + "=", function(obj, writerArgs) {
          return Ruby.setInstanceVar(obj, "@" + arg.value, writerArgs[0]);
        });
      });
    },
    
    "name": function(self) {
      return self.name;
    },
    
    "inspect": function(self) {
      return self.name;
    },
    
    "ivar_as_index": function(self) {
      // Dummy for Rubinius specific method.
    }
    
  }
});

Ruby.defineClass("Class", {
  "superClass": Ruby.Module,
  "instanceMethods": {
    
    "allocate": function(self) {
      return new RubyObject(self);
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
    
    "__sleep__" : asyncFunc(function(self, args, block, callback) {
      setTimeout(callback, args[0] * 1000);
    }),
    
    "__proc__": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(Ruby.Proc, "new", args, block, callback);
    }),
    
    "__block_given__": function(self) {
      return Ruby.vm.latestStackFrame.block != null;
    },
    
    "__raise__": asyncFunc(function(self, args, block, callback) {
      callback(null, args[0]);
    })
    
  }
});

Ruby.defineClass("TrueClass", {
  "instanceMethods": {
    "!" : function(self) {
      return false;
    },
    
    "&" : function(self, args) {
      return args[0] ? true : false;
    },
    
    "|" : function(self, args) {
      return true;
    },

    "^" : function(self, args) {
      return args[0] ? false : true;
    },

    "to_s" : function(self) {
      return "true";
    }
  }
});

Ruby.defineClass("FalseClass", {
  "instanceMethods": {
    "!" : function(self) {
      return true;
    },
    
    "&" : function(self, args) {
      return false;
    },
    
    "|" : function(self, args) {
      return args[0] ? true : false;
    },

    "^" : function(self, args) {
      return args[0] ? true : false;
    },

    "to_s" : function(self) {
      return "false";
    }
  }
});

Ruby.defineClass("NilClass", {
  "instanceMethods": {
    "inspect" : function(self) {
      return "nil";
    }
  },
});

Ruby.defineClass("Proc", {
  "instanceMethods": {
    "initialize" : function(self, args, block) {
      self.opcode = block.opcode;
      self.parentStackFrame = block.parentStackFrame;
    },
    
    "yield" : asyncFunc(function(self, args, block, callback) {
      Ruby.vm.runOpcode(
        self.opcode, 
        self.parentStackFrame.classObj, 
        self.parentStackFrame.methodName, 
        self.parentStackFrame.self, 
        args, 
        block,
        self.parentStackFrame,
        true,
        function(res, ex) {
          if (ex) return callback(null, ex);
          var sf = self.parentStackFrame;
          callback(sf.stack[--sf.sp]);
        }
      );
    }),
    
    "call": asyncFunc(function(self, args, block, callback) {
      Ruby.sendAsync(self, "yield", args, block, callback);
    })
    
  }
});

Ruby.defineClass("Float", {
  "instanceMethods": {
    "+" : function(self, args) {
      return self + args[0];
    },

    "-" : function(self, args) {
      return self - args[0];
    },

    "*" : function(self, args) {
      return self * args[0];
    },

    "/" : function(self, args) {
      return self / args[0];
    },
    
    "%" : function(self, args) {
      return self % args[0];
    },
    
    "<=>" : function(self, args) {
      if(self > args[0])
        return 1;
      else if(self == args[0])
        return 0;
      if(self < args[0])
        return -1;
    },
    
    "<" : function(self, args) {
      return self < args[0];
    },

    ">" : function(self, args) {
      return self > args[0];
    },
    
    "<=" : function(self, args) {
      return self <= args[0];
    },

    ">=" : function(self, args) {
      return self >= args[0];
    },
    
    "==" : function(self, args) {
      return self == args[0];
    },
    
    "to_s" : function(self) {
      return self.toString();
    },

    "inspect" : function(self) {
      return self.toString();
    }
  }
});

Ruby.defineClass("Numeric", {
});

Ruby.defineClass("Integer", {
  "superClass": Ruby.Numeric
});

Ruby.defineClass("Fixnum", {
  "superClass": Ruby.Integer,
  "instanceMethods": {
    
    "+" : function(self, args) {
      return self + args[0];
    },

    "-" : function(self, args) {
      return self - args[0];
    },

    "*" : function(self, args) {
      return self * args[0];
    },

    "/" : function(self, args) {
      return Math.floor(self / args[0]);
    },
    
    "%" : function(self, args) {
      return self % args[0];
    },
    
    "<=>" : function(self, args) {
      if(self > args[0])
        return 1;
      else if(self == args[0])
        return 0;
      if(self < args[0])
        return -1;
    },
    
    "<" : function(self, args) {
      return self < args[0];
    },

    ">" : function(self, args) {
      return self > args[0];
    },
    
    "<=" : function(self, args) {
      return self <= args[0];
    },

    ">=" : function(self, args) {
      return self >= args[0];
    },
    
    "==" : function(self, args) {
      return self == args[0];
    },

    "<<" : function(self, args) {
      return self << args[0];
    },
    
    ">>" : function(self, args) {
      return self >> args[0];
    },
    
    "&" : function(self, args) {
      return self & args[0];
    },
    
    "|" : function(self, args) {
      return self | args[0];
    },
    
    "^" : function(self, args) {
      return self ^ args[0];
    },
    
    // Overrides Ruby implementation to make it faster.
    "succ" : function(self) {
      return self + 1;
    },

    "hash" : function(self) {
      return self; // TODO: better value
    },

    // Overrides Ruby implementation to make it faster.
    "times" : asyncFunc(function(self, args, block, callback) {
      var i = 0;
      Ruby.loopAsync(
        function() { return i < self; },
        function() { ++i; },
        function(bodyCallback) {
          Ruby.sendAsync(block, "yield", [i], bodyCallback);
        },
        callback
      );
    }),
    
    "inspect" : function(self) {
      return self.toString();
    }
    
  }
});

Ruby.defineClass("String", {
  "instanceMethods": {
    "+" : function(self, args) {
      if(typeof(args[0]) == "object")
        return self.value + args[0].value;
      else
        return self.value + args[0];
    },
    
    "<<": function(self, args) {
      self.value += args[0].value;
    },
    
    "*" : function(self, args) {
      var ary = new Array(args[0]);
      for(var i=0; i<args[0]; i++) {
        ary[i] = self.value;
      }
      return ary.join("");
    },
    
    "==" : function(self, args) {
      return self.value == args[0].value;
    },
    
    "eql?" : function(self, args) {
      return self.value == args[0].value;
    },
    
    "hash" : function(self) {
      var hash = 0;
      for (var i = 0; i < self.value.length; ++i) {
        hash += self.value.charCodeAt(i);
      }
      return hash;
    },
    
    "[]" : function(self, args) {
      if(args.length == 1 && typeof(args[0]) == "number") {
        var no = args[0];
        if(no < 0) 
          no = self.value.length + no;
        if(no < 0 || no >= self.value.length)
          return null;
        return self.value.charCodeAt(no);
      } else if(args.length == 2 && typeof(args[0]) == "number" && typeof(args[1]) == "number") {
        var start = args[0];
        if(start < 0) 
          start = self.value.length + start;
        if(start < 0 || start >= self.value.length)
          return null;
        if(args[1] < 0 || start + args[1] > self.value.length)
          return null;
        return self.value.substr(start, args[1]);
      } else {
        Ruby.fatal("Unsupported String[]");
      }
    },
    
    "length": function(self) {
      return self.value.length;
    },
    
    "empty?": function(self) {
      return self.value.length == 0;
    },
    
    "dup": function(self) {
      return Ruby.newRubyString(self.value);
    },
    
    "to_s": function(self) {
      return self;
    },

    "inspect" : function(self) {
      return '"' + self.value + '"';
    }
  }
});

Ruby.defineClass("Tuple", {
  "instanceMethods": {
    
    "initialize" : function(self, args) {
      self.value = new Array(args[0]);
      for (var i = 0; i < args[0]; ++i) {
        self.value[i] = null;
      }
    },
    
    "dup": function(self) {
      var res = new RubyObject(Ruby.Tuple);
      res.value = self.value.concat([]);
      return res;
    },
    
    "fields" : function(self) {
      return self.value.length;
    },
    
    "at" : function(self, args) {
      return self.value[args[0]];
    },
    
    "[]" : function(self, args) {
      return self.value[args[0]];
    },
    
    "put" : function(self, args) {
      self.value[args[0]] = args[1];
    },
    
    "[]=" : function(self, args) {
      self.value[args[0]] = args[1];
    },
    
    "copy_from": function(self, args) {
      var other = args[0];
      var op = args[1];
      var sp = args[2];
      for (; op < other.value.length; ++op) {
        self.value[sp] = other.value[op];
        ++sp;
      }
    },
    
    "shifted" : function(self, args) {
      var res = new RubyObject(Ruby.Tuple);
      res.value = new Array(args[0]).concat(self.value);
      return res;
    }
    
  }
});

Ruby.defineClass("Thread", {
  "instanceMethods": {
    
    "initialize" : function(self, args, block) {
      setTimeout(function() {
        Ruby.sendAsync(block, "yield", args, function(){ });
      }, 1);
    }
    
  }
});

Ruby.defineClass("Time", {
  "instanceMethods": {
    
    "initialize" : function(self, args) {
      self.instanceVars.date = new Date(); 
    },
    
    "to_s" : function(self) {
      return self.instanceVars.date.toString();
    },
    
    "to_f" : function(self) {
      return self.instanceVars.date.getTime() / 1000;
    }
    
  }
});

Ruby.defineClass("IO", {
  "instanceMethods": {
    
    "write" : function(self, args) {
      // For now, only supports console output.
      Ruby.printDebug(args[0].value);
    }
    
  }
});

Ruby.defineClass("Exception", {
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
    
    "escapeHTML": function(self, args) {
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
    
    "parse": function(self, args) {
      var obj = eval("(" + args[0].value + ")");
      function convert(obj) {
        if (obj == null || typeof(obj) == "boolean" || typeof(obj) == "number") {
          return obj;
        } else if (typeof(obj) == "string") {
          return Ruby.newRubyString(obj);
        } else if (typeof(obj) == "object" && obj instanceof Array) {
          var ary = new Array(obj.length);
          for (var i = 0; i < obj.length; ++i) {
            ary[i] = convert(obj[i]);
          }
          return Ruby.newRubyArray(ary);
        } else {
          var ary = [];
          for (var k in obj) {
            ary.push(convert(k), convert(obj[k]));
          }
          return Ruby.newRubyHash(ary);
        }
      }
      return convert(obj);
    },
    
    "unparse": function(self, args) {
      function convert(obj) {
        if (obj == null) {
          return "null";
        }else if (typeof(obj) == "boolean" || typeof(obj) == "number") {
          return obj.toString();
        } else if (typeof(obj) == "string") {
          return '"' + obj.replace(/([\\"])/g, "\\$1") + '"';
        } else if (obj.rubyClass == Ruby.String) {
          return convert(Ruby.toNative(obj));
        } else if (obj.rubyClass == Ruby.Array) {
          var ary = new Array(Ruby.arraySize(obj));
          for (var i = 0; i < ary.length; ++i) {
            ary[i] = convert(Ruby.arrayAt(obj, i));
          }
          return "[" + ary.join(",") + "]";
        } else if (obj.rubyClass == Ruby.Hash) {
          var keys = Ruby.hashKeys(obj);
          var ary = [];
          for (var i = 0; i < keys.length; ++i) {
            ary.push(convert(keys[i]) + ":" + convert(Ruby.hashGet(obj, keys[i])));
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
    
    "http_request": asyncFunc(function(self, args, block, callback) {
      var method = Ruby.toNative(args[0]);
      var url = Ruby.toNative(args[1]);
      var data = Ruby.toNative(args[2]);
      if (data != null && typeof(data) == "object") { // originally Hash
        var ary = [];
        for (var k in data) {
          ary.push(k + "=" + encodeURIComponent(data[k]));
        }
        data = ary.join("&");
      }
      new Ajax.Request(
        url,
        {
          method: method,
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
    
    "debug": function(self, args) {
      return Ruby.vm.debug;
    },
    
    "debug=": function(self, args) {
      Ruby.vm.debug = args[0];
    }
    
  }
});

Ruby.Object.constants["RUBY_PLATFORM"] = Ruby.newRubyString("javascript-hotruby");

// Defines builtin classes written in Ruby.
Ruby.vm.compileAndRun("builtin", function(res, ex) {
  if (ex) return;
  Ruby.vm.loaded = true;
  Ruby.vm.onLoaded.each(function(handler) {
    handler();
  });
});
