// The license of this source is "Ruby License"

RubyVM.addInitializer(function(ctx) {

  ctx.vm.Context.prototype.Object = ctx.defineClass("Object", {
    "instanceMethods": {
      
      "initialize": function(ctx, self) {
      },
      
      "class": function(ctx, self) {
        return ctx.getClass(self);
      },
      
      "method_missing": asyncFunc(function(ctx, self, args, block, callback) {
        return ctx.raise(ctx.NoMethodError,
          "undefined method `" + args[0].value + "' for " + ctx.getClass(self).name,
          callback);
      }),
      
      "equal?" : function(ctx, self, args) {
        return self == args[0];  
      },
      
      "==" : function(ctx, self, args) {
        return self == args[0];  
      },
      
      "eql?" : function(ctx, self, args) {
        return self == args[0];  
      },
      
      "!=": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, "==", args, block, function(res, ex) {
          if (ex) return callback(null, ex);
          callback(!res);
        });
      }),
      
      "is_a?": function(ctx, self, args) {
        return ctx.kindOf(self, args[0]);
      },
      
      "kind_of?": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, "is_a?", args, block, callback);
      }),
      
      "===": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, "==", args, block, callback);
      }),
      
      "!": function(ctx, self) {
        return false;
      },
      
      "respond_to?": function(ctx, self, args) {
        var methodName = args[0];
        return ctx.respondTo(self, methodName.value);
      },
      
      "object_id": function(ctx, self) {
        return 0; // TODO: implement it
      },
      
      "__send__": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, args[0].value, args.slice(1), block, callback);
      }),
      
      "to_s" : function(ctx, self) {
        return "#<" + ctx.getClass(self).name + ":????>";
      },
      
      "inspect": function(ctx, self) {
        return "#<" + ctx.getClass(self).name + ":????>";
      },
      
      "tainted?": function(ctx, self) {
        return false; // unimplemented
      },
      
      // JS only functions
      
      "assert": function(ctx, self, args) {
        console.log(args[1].value);
        if (!ctx.toBoolean(args[0])) {
          console.error("Assertion failed: " + args[1].value);
          a.hoge; // shows stack trace in FireBug
        }
      },
      
      "assert_equal": asyncFunc(function(ctx, self, args, block, callback) {
        console.log(args[2].value);
        ctx.sendAsync(args[0], "==", [args[1]], function(res, ex) {
          if (ex) return callback(null, ex);
          if (!res) {
            console.error("Assertion failed: " + args[2].value, ": ", args[0], " vs ", args[1]);
            a.hoge; // shows stack trace in FireBug
          }
          callback();
        });
      }),
      
      "__write__" : function(ctx, self, args) {
        // For Kernel.__print_exception__
        ctx.printDebug(args[0].value);
      },
      
      "jp": function(ctx, self, args) {
        console.log(args[0]);
      },
      
      "__debug__": function(ctx, self, args) {
        console.log(ctx.latestStackFrame);
      },
      
    }
  });

  ctx.defineClass("Module", {
    "superClass": ctx.Object,
    "instanceMethods": {
      
      "===": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(args[0], "is_a?", [self], callback);
      }),
      
      "include": function(ctx, self, args) {
        for (var i = 0; i < args.length; ++i) {
          ctx.includeModule(self, args[i]);
        }
      },
      
      "private": function(ctx, self, args) {
        // TODO: implement
      },
      
      "module_function": function(ctx, self, args) {
        if (args.length == 0) {
          self.scope = "module_function";
        } else {
          for (var i = 0; i < args.length; ++i) {
            ctx.makeModuleFunction(self, args[i].value);
          }
        }
      },
      
      "alias_method": function(ctx, self, args) {
        self.methods[args[0].value] = self.methods[args[1].value];
      },
      
      "ancestors": function(ctx, self) {
        var ary = [];
        ctx.eachAncestor(self, function(c) {
          ary.push(c);
        });
        return ctx.newRubyArray(ary);
      },
      
      "attr_reader": function(ctx, self, args) {
        // TODO: rewrite it without dynamic function.
        args.each(function(arg) {
          ctx.defineMethod(self, arg.value, function(obj) {
            return ctx.getInstanceVar(obj, "@" + arg.value);
          });
        });
      },
      
      "attr_writer": function(ctx, self, args) {
        // TODO: rewrite it without dynamic function.
        args.each(function(arg) {
          ctx.defineMethod(self, arg.value + "=", function(obj, writerArgs) {
            return ctx.setInstanceVar(obj, "@" + arg.value, writerArgs[0]);
          });
        });
      },
      
      "name": function(ctx, self) {
        return self.name;
      },
      
      "inspect": function(ctx, self) {
        return self.name;
      },
      
      "ivar_as_index": function(ctx, self) {
        // Dummy for Rubinius specific method.
      }
      
    }
  });

  ctx.defineClass("Class", {
    "superClass": ctx.Module,
    "instanceMethods": {
      
      "allocate": function(ctx, self) {
        return ctx.newObject(self);
      }
      
    }
  });

  ctx.Object.constants.Object = ctx.Object;
  ctx.Object.rubyClass = ctx.Class;
  ctx.Object.singletonClass.rubyClass = ctx.Class;
  ctx.Object.singletonClass.superClass = ctx.Class;
  ctx.Module.rubyClass = ctx.Class;
  ctx.Module.singletonClass.rubyClass = ctx.Class;
  ctx.Class.rubyClass = ctx.Class;
  ctx.Class.singletonClass.rubyClass = ctx.Class;

  ctx.defineClass("NativeEnvironment", {
  });
  ctx.defineClass("NativeObject", {
  });
  ctx.defineClass("NativeClass", {
  });

  ctx.defineModule("Kernel", {
    "instanceMethods": {
      
      "__sleep__" : asyncFunc(function(ctx, self, args, block, callback) {
        setTimeout(callback, args[0] * 1000);
      }),
      
      "__proc__": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(ctx.Proc, "new", args, block, callback);
      }),
      
      "__block_given__": function(ctx, self) {
        return ctx.blockGiven();
      },
      
      "__raise__": asyncFunc(function(ctx, self, args, block, callback) {
        callback(null, args[0]);
      })
      
    }
  });

  ctx.defineClass("TrueClass", {
    "instanceMethods": {
      "!" : function(ctx, self) {
        return false;
      },
      
      "&" : function(ctx, self, args) {
        return args[0] ? true : false;
      },
      
      "|" : function(ctx, self, args) {
        return true;
      },

      "^" : function(ctx, self, args) {
        return args[0] ? false : true;
      },

      "to_s" : function(ctx, self) {
        return "true";
      }
    }
  });

  ctx.defineClass("FalseClass", {
    "instanceMethods": {
      
      "!" : function(ctx, self) {
        return true;
      },
      
      "&" : function(ctx, self, args) {
        return false;
      },
      
      "|" : function(ctx, self, args) {
        return args[0] ? true : false;
      },

      "^" : function(ctx, self, args) {
        return args[0] ? true : false;
      },

      "to_s" : function(ctx, self) {
        return "false";
      }
      
    }
  });

  ctx.defineClass("NilClass", {
    "instanceMethods": {
      
      "nil?": function(ctx, self) {
        return true;
      },
      
      "!": function(ctx, self) {
        return true;
      },
      
      "inspect" : function(ctx, self) {
        return "nil";
      }
      
    },
  });

  ctx.defineClass("Proc", {
    "instanceMethods": {
      "initialize" : function(ctx, self, args, block) {
        self.opcode = block.opcode;
        self.parentStackFrame = block.parentStackFrame;
      },
      
      "yield" : asyncFunc(function(ctx, self, args, block, callback) {
        ctx.runOpcode(
          self.opcode, 
          self.parentStackFrame.invokeClass, 
          self.parentStackFrame.methodName, 
          self.parentStackFrame.self, 
          args, 
          block,
          self.parentStackFrame,
          null,
          true,
          function(res, ex) {
            if (ex) return callback(null, ex);
            var sf = self.parentStackFrame;
            callback(sf.stack[--sf.sp]);
          }
        );
      }),
      
      "call": asyncFunc(function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, "yield", args, block, callback);
      }),
      
      // Rubinius-specific methods
      
      "block": function(ctx, self) {
        return self;
      },
      
      "home": function(ctx, self) {
        var ctx = ctx.newObject(ctx.MethodContext);
        ctx.stackFrame = ctx.getLocalStackFrame(self.parentStackFrame);
        return ctx;
      }
      
    }
  });

  ctx.defineClass("Float", {
    "instanceMethods": {
      "+" : function(ctx, self, args) {
        return self + args[0];
      },

      "-" : function(ctx, self, args) {
        return self - args[0];
      },

      "*" : function(ctx, self, args) {
        return self * args[0];
      },

      "/" : function(ctx, self, args) {
        return self / args[0];
      },
      
      "%" : function(ctx, self, args) {
        return self % args[0];
      },
      
      "<=>" : function(ctx, self, args) {
        if(self > args[0])
          return 1;
        else if(self == args[0])
          return 0;
        if(self < args[0])
          return -1;
      },
      
      "<" : function(ctx, self, args) {
        return self < args[0];
      },

      ">" : function(ctx, self, args) {
        return self > args[0];
      },
      
      "<=" : function(ctx, self, args) {
        return self <= args[0];
      },

      ">=" : function(ctx, self, args) {
        return self >= args[0];
      },
      
      "==" : function(ctx, self, args) {
        return self == args[0];
      },
      
      "to_s" : function(ctx, self) {
        return self.toString();
      },

      "inspect" : function(ctx, self) {
        return self.toString();
      }
    }
  });

  ctx.defineClass("Numeric", {
  });

  ctx.defineClass("Integer", {
    "superClass": ctx.Numeric
  });

  ctx.defineClass("Fixnum", {
    "superClass": ctx.Integer,
    "instanceMethods": {
      
      "+" : function(ctx, self, args) {
        return self + args[0];
      },

      "-" : function(ctx, self, args) {
        return self - args[0];
      },

      "*" : function(ctx, self, args) {
        return self * args[0];
      },

      "/" : function(ctx, self, args) {
        return Math.floor(self / args[0]);
      },
      
      "%" : function(ctx, self, args) {
        return self % args[0];
      },
      
      "<=>" : function(ctx, self, args) {
        if(self > args[0])
          return 1;
        else if(self == args[0])
          return 0;
        if(self < args[0])
          return -1;
      },
      
      "<" : function(ctx, self, args) {
        return self < args[0];
      },

      ">" : function(ctx, self, args) {
        return self > args[0];
      },
      
      "<=" : function(ctx, self, args) {
        return self <= args[0];
      },

      ">=" : function(ctx, self, args) {
        return self >= args[0];
      },
      
      "==" : function(ctx, self, args) {
        return self == args[0];
      },

      "<<" : function(ctx, self, args) {
        return self << args[0];
      },
      
      ">>" : function(ctx, self, args) {
        return self >> args[0];
      },
      
      "&" : function(ctx, self, args) {
        return self & args[0];
      },
      
      "|" : function(ctx, self, args) {
        return self | args[0];
      },
      
      "^" : function(ctx, self, args) {
        return self ^ args[0];
      },
      
      // Overrides Ruby implementation to make it faster.
      "succ" : function(ctx, self) {
        return self + 1;
      },

      "hash" : function(ctx, self) {
        return self; // TODO: better value
      },

      // Overrides Ruby implementation to make it faster.
      "times" : asyncFunc(function(ctx, self, args, block, callback) {
        var i = 0;
        ctx.loopAsync(
          function() { return i < self; },
          function() { ++i; },
          function(bodyCallback) {
            ctx.sendAsync(block, "yield", [i], bodyCallback);
          },
          callback
        );
      }),
      
      "to_s" : function(ctx, self) {
        return self.toString();
      },
      
      "inspect" : function(ctx, self) {
        return self.toString();
      }
      
    }
  });

  // Not implemented
  ctx.defineClass("Bignum", {
    "superClass": ctx.Integer
  });

  ctx.defineClass("String", {
    "instanceMethods": {
      
      "length": function(ctx, self) {
        return self.value.length;
      },
      
      "dup": function(ctx, self) {
        return ctx.newRubyString(self.value);
      },
      
      "hash": function(ctx, self) {
        var hash = 0;
        for (var i = 0; i < self.value.length; ++i) {
          hash += self.value.charCodeAt(i);
        }
        return hash;
      },
      
      "downcase!": function(ctx, self) {
        self.value = self.value.toLowerCase();
      },
      
      "upcase!": function(ctx, self) {
        self.value = self.value.toUpperCase();
      },
      
      "to_i": function(ctx, self, args) {
        var base = args[0] == null ? 10 : args[0];
        return parseInt(self.value, base);
      },
      
      "to_f": function(ctx, self) {
        return parseFloat(self.value);
      },
      
      // Methods used internally in lib/core/string.rb
      
      "__at__": function(ctx, self, args) {
        return ctx.newRubyString(self.value[args[0]]);
      },
      
      "__set__": function(ctx, self, args) {
        var pos = args[0];
        var chr = args[1];
        self.value = self.value.substr(0, pos) + chr.value + self.value.substr(pos + 1);
      },
      
      "__compare__": function(ctx, self, args) {
        if (self.value > args[0].value) {
          return 1;
        } else if (self.value < args[0].value) {
          return -1;
        } else {
          return 0;
        }
      },
      
      "__replace__": function(ctx, self, args) {
        var other = args[0];
        var pos = args[1] || 0;
        var len = args[2] == null ? other.value.length : args[2];
        self.value = other.value.substr(pos, len);
      },
      
      "substring": function(ctx, self, args) {
        var pos = args[0];
        var len = args[1];
        return ctx.newRubyString(self.value.substr(pos, len));
      },
      
      "copy_from": function(ctx, self, args) {
        var other = args[0];
        var other_pos = args[1];
        var len = args[2];
        var self_pos = args[3];
        self.value =
          self.value.substr(0, self_pos) +
          other.value.substr(other_pos, len) +
          self.value.substr(self_pos + len);
      },
      
      "append": function(ctx, self, args) {
        self.value += args[0].value;
      },
      
      "isspace": function(ctx, self) {
        return self.value.match(/^\s*$/) != null;
      },
      
      "islower": function(ctx, self) {
        return self.value.match(/^[a-z]*$/) != null;
      },
      
      "isupper": function(ctx, self) {
        return self.value.match(/^[A-Z]*$/) != null;
      }
      
    },
    "classMethods": {
      
      // Methods used internally in lib/core/string.rb
      
      "template": function(ctx, self, args) {
        var len = args[0];
        var str = args[1];
        var res = "";
        for (var i = 0; i < len; i += str.value.length) {
          res += str.value;
        }
        return ctx.newRubyString(res.substr(0, len));
      }
      
    }
  });

  // TODO: implement it
  ctx.defineClass("Symbol", {
    "instanceMethods": {
    }
  });

  ctx.defineClass("Regexp", {
    "instanceMethods": {
      
      "search_region": function(ctx, self, args) {
        var str = args[0];
        var start = args[1];
        var finish = args[2]; // ignored
        var forward = args[3]; // ignored
        self.exp.lastIndex = start;
        var match = self.exp.exec(str.value);
        if (!match) return null;
        var res = ctx.newObject(ctx.MatchData);
        res.instanceVars = {
          "@source": str,
          "@regexp": self,
          "@full": ctx.newRubyTuple([match.index, match.index + match[0].length]),
          "@captures": ctx.newRubyArray(
            match.slice(1).map(function(s){ return ctx.newRubyString(s); }))
        }
        return res;
      }
      
    },
    "classMethods": {
      
      "__regexp_new__": function(ctx, self, args) {
        return ctx.newRubyRegexp(args[0].value, args[1]);
      }
      
    }
  });

  ctx.defineClass("MatchData", {
    "instanceMethods": {
    }
  });

  ctx.defineClass("Tuple", {
    "instanceMethods": {
      
      "initialize" : function(ctx, self, args) {
        self.value = new Array(args[0]);
        for (var i = 0; i < args[0]; ++i) {
          self.value[i] = null;
        }
      },
      
      "dup": function(ctx, self) {
        var res = ctx.newObject(ctx.Tuple);
        res.value = self.value.concat([]);
        return res;
      },
      
      "fields" : function(ctx, self) {
        return self.value.length;
      },
      
      "at" : function(ctx, self, args) {
        return self.value[args[0]];
      },
      
      "[]" : function(ctx, self, args) {
        return self.value[args[0]];
      },
      
      "put" : function(ctx, self, args) {
        self.value[args[0]] = args[1];
      },
      
      "[]=" : function(ctx, self, args) {
        self.value[args[0]] = args[1];
      },
      
      "copy_from": function(ctx, self, args) {
        var other = args[0];
        var op = args[1];
        var sp = args[2];
        for (; op < other.value.length; ++op) {
          self.value[sp] = other.value[op];
          ++sp;
        }
      },
      
      "shifted" : function(ctx, self, args) {
        var res = ctx.newObject(ctx.Tuple);
        res.value = new Array(args[0]).concat(self.value);
        return res;
      }
      
    }
  });

  ctx.defineClass("Thread", {
    "instanceMethods": {
      
      "initialize" : function(ctx, self, args, block) {
        var subCtx = ctx.newContext();
        setTimeout(function() {
          subCtx.sendAsync(block, "yield", args, function(){ });
        }, 1);
      }
      
    }
  });

  ctx.defineClass("Time", {
    "instanceMethods": {
      
      "initialize" : function(ctx, self, args) {
        self.instanceVars.date = new Date(); 
      },
      
      "to_s" : function(ctx, self) {
        return self.instanceVars.date.toString();
      },
      
      "to_f" : function(ctx, self) {
        return self.instanceVars.date.getTime() / 1000;
      }
      
    }
  });

  ctx.defineClass("IO", {
    "instanceMethods": {
      
      "write" : function(ctx, self, args) {
        // For now, only supports console output.
        ctx.printDebug(args[0].value);
      }
      
    }
  });

  ctx.defineClass("Exception", {
  });

  // Internally used
  ctx.defineClass("BreakException", {
    "instanceMethods": {
    }
  });

  // Internally used
  ctx.defineClass("ReturnException", {
    "instanceMethods": {
    }
  });

  // Rubinius-specific class
  ctx.defineClass("MethodContext", {
    "instanceMethods": {
      
      "sender": function(ctx, self) {
        var callerSF = self.stackFrame.callerStackFrame;
        if (callerSF) {
          var ctx = ctx.newObject(ctx.MethodContext);
          ctx.stackFrame = ctx.getLocalStackFrame(callerSF);
          return ctx;
        } else {
          return null;
        }
      },
      
      "[]": function(ctx, self, args) {
        if (!self.stackFrame.data) return null;
        return self.stackFrame.data[args[0].value];
      },
      
      "[]=": function(ctx, self, args) {
        if (!self.stackFrame.data) self.stackFrame.data = {};
        self.stackFrame.data[args[0].value] = args[1];
      },
      
      "inspect": function(ctx, self) {
        return "#<MethodContext:" + self.stackFrame.methodName + ">";
      },
      
    },
    "classMethods": {
      
      "current": function(ctx, self) {
        var mc = ctx.newObject(ctx.MethodContext);
        mc.stackFrame = ctx.getLocalStackFrame(ctx.latestStackFrame);
        return mc;
      },
      
    }
  });

  ctx.defineClass("CGI", {
    "classMethods": {
      
      "escapeHTML": function(ctx, self, args) {
        return args[0].value.
          replace(/&/, "&amp;").
          replace(/</, "&lt;").
          replace(/>/, "&gt;").
          replace(/"/, "&quot;");
      }
      
    }
  });

  ctx.defineClass("JSON", {
    "instanceMethods": {
    },
    "classMethods": {
      
      "parse": function(ctx, self, args) {
        var obj = eval("(" + args[0].value + ")");
        function convert(obj) {
          if (obj == null || typeof(obj) == "boolean" || typeof(obj) == "number") {
            return obj;
          } else if (typeof(obj) == "string") {
            return ctx.newRubyString(obj);
          } else if (typeof(obj) == "object" && obj instanceof Array) {
            var ary = new Array(obj.length);
            for (var i = 0; i < obj.length; ++i) {
              ary[i] = convert(obj[i]);
            }
            return ctx.newRubyArray(ary);
          } else {
            var ary = [];
            for (var k in obj) {
              ary.push(convert(k), convert(obj[k]));
            }
            return ctx.newRubyHash(ary);
          }
        }
        return convert(obj);
      },
      
      "unparse": function(ctx, self, args) {
        function convert(obj) {
          if (obj == null) {
            return "null";
          }else if (typeof(obj) == "boolean" || typeof(obj) == "number") {
            return obj.toString();
          } else if (typeof(obj) == "string") {
            return '"' + obj.replace(/([\\"])/g, "\\$1") + '"';
          } else if (obj.rubyClass == ctx.String) {
            return convert(ctx.toNative(obj));
          } else if (obj.rubyClass == ctx.Array) {
            var ary = new Array(ctx.arraySize(obj));
            for (var i = 0; i < ary.length; ++i) {
              ary[i] = convert(ctx.arrayAt(obj, i));
            }
            return "[" + ary.join(",") + "]";
          } else if (obj.rubyClass == ctx.Hash) {
            var keys = ctx.hashKeys(obj);
            var ary = [];
            for (var i = 0; i < keys.length; ++i) {
              ary.push(convert(keys[i]) + ":" + convert(ctx.hashGet(obj, keys[i])));
            }
            return "{" + ary.join(",") + "}";
          }
        }
        return convert(args[0]);
      }
      
    }
  });

  ctx.defineClass("JS", {
    "instanceMethods": {
    },
    "classMethods": {
      
      "http_request": asyncFunc(function(ctx, self, args, block, callback) {
        var method = ctx.toNative(args[0]);
        var url = ctx.toNative(args[1]);
        var data = ctx.toNative(args[2]);
        if (data != null && typeof(data) == "object") { // originally Hash
          var ary = [];
          for (var k in data) {
            ary.push(k + "=" + encodeURIComponent(data[k]));
          }
          data = ary.join("&");
        }
        try {
          new Ajax.Request(
            url,
            {
              method: method,
              parameters: data,
              onSuccess: function(response) {
                callback(response.responseText);
              },
              onFailure: function(response) {
                ctx.raise(ctx.RuntimeError, "http_get failed", callback);
              }
            }
          );
        } catch (ex) {
          ctx.raise(ctx.RuntimeError, "http_get failed", callback);
        }
      }),
      
      "debug": function(ctx, self, args) {
        return ctx.vm.debug;
      },
      
      "debug=": function(ctx, self, args) {
        ctx.vm.debug = args[0];
      }
      
    }
  });

  ctx.Object.constants["RUBY_PLATFORM"] = ctx.newRubyString("javascript-hotruby");

  // VM initializations which requires some RubyModule definitions.
  ctx.setGlobalVar("$native", ctx.newObject(ctx.NativeEnvironment));
  ctx.vm.topObject = ctx.newObject(ctx.Object);
  ctx.vm.checkEnv(ctx);

});

RubyVM.addAsyncInitializer(function(ctx, callback) {
  // Defines builtin classes written in Ruby.
  ctx.vm.compileAndRun("builtin", callback);
});
