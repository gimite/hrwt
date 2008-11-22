// The license of this source is "Ruby License"

RubyVM.addInitializer(function(ctx) {

  var Object = ctx.defineClass("Object");
  ctx.setConstant(Object, "Object", Object);
  {
    
    ctx.defineMethod(ctx.Object, "initialize",
      function(ctx, self) {
      }
    );
    
    ctx.defineMethod(ctx.Object, "class",
      function(ctx, self) {
        return ctx.classOf(self);
      }
    );
    
    ctx.defineMethod(ctx.Object, "method_missing", {async: true},
      function(ctx, self, args, block, callback) {
        return ctx.raise(ctx.NoMethodError,
          "undefined method `" + args[0].value + "' for " + ctx.classOf(self).name,
          callback);
      }
    );
    
    ctx.defineMethod(ctx.Object, "equal?",
      function(ctx, self, args) {
        return self == args[0];  
      }
    );
    
    ctx.defineMethod(ctx.Object, "==",
      function(ctx, self, args) {
        return self == args[0];  
      }
    );
    
    ctx.defineMethod(ctx.Object, "eql?",
      function(ctx, self, args) {
        return self == args[0];  
      }
    );
    
    ctx.defineMethod(ctx.Object, "!=", {async: true},
      function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, "==", args, block, function(res, ex) {
          if (ex) return callback(null, ex);
          callback(!res);
        });
      }
    );
    
    ctx.defineMethod(ctx.Object, "is_a?",
      function(ctx, self, args) {
        return ctx.kindOf(self, args[0]);
      }
    );
    
    ctx.aliasMethod(ctx.Object, "kind_of?", "is_a?");
    
    ctx.defineMethod(ctx.Object, "===", {async: true},
      function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, "==", args, block, callback);
      }
    );
    
    ctx.defineMethod(ctx.Object, "!",
      function(ctx, self) {
        return false;
      }
    );
    
    ctx.defineMethod(ctx.Object, "respond_to?",
      function(ctx, self, args) {
        var methodName = args[0];
        return ctx.respondTo(self, methodName.value);
      }
    );
    
    ctx.defineMethod(ctx.Object, "object_id",
      function(ctx, self) {
        return 0; // TODO: implement it
      }
    );
    
    ctx.defineMethod(ctx.Object, "__send__", {async: true},
      function(ctx, self, args, block, callback) {
        ctx.sendAsync(self, args[0].value, args.slice(1), block, callback);
      }
    );
    
    ctx.defineMethod(ctx.Object, "to_s",
      function(ctx, self) {
        return "#<" + ctx.classOf(self).name + ":????>";
      }
    );
    
    ctx.defineMethod(ctx.Object, "inspect",
      function(ctx, self) {
        return "#<" + ctx.classOf(self).name + ":????>";
      }
    );
    
    ctx.defineMethod(ctx.Object, "tainted?",
      function(ctx, self) {
        return false; // unimplemented
      }
    );
    
    // JS only functions
    
    ctx.defineMethod(ctx.Object, "assert",
      function(ctx, self, args) {
        console.log(args[1].value);
        if (!ctx.toBoolean(args[0])) {
          console.error("Assertion failed: " + args[1].value);
          a.hoge; // shows stack trace in FireBug
        }
      }
    );
    
    ctx.defineMethod(ctx.Object, "assert_equal", {async: true},
      function(ctx, self, args, block, callback) {
        console.log(args[2].value);
        ctx.sendAsync(args[0], "==", [args[1]], function(res, ex) {
          if (ex) return callback(null, ex);
          if (!res) {
            console.error("Assertion failed: " + args[2].value, ": ", args[0], " vs ", args[1]);
            a.hoge; // shows stack trace in FireBug
          }
          callback();
        });
      }
    );
    
    ctx.defineMethod(ctx.Object, "__write__",
      function(ctx, self, args) {
        // For Kernel.__print_exception__
        ctx.printToConsole(args[0].value);
      }
    );
    
    ctx.defineMethod(ctx.Object, "jp",
      function(ctx, self, args) {
        console.log(args[0]);
      }
    );
    
    // for debug
    ctx.defineMethod(ctx.Object, "__debug__",
      function(ctx, self, args) {
        console.log(ctx.currentFrame());
      }
    );
    
  }

  ctx.defineClass("Module");
  {
    
    ctx.defineMethod(ctx.Module, "===", {async: true},
      function(ctx, self, args, block, callback) {
        ctx.sendAsync(args[0], "is_a?", [self], callback);
      }
    );
    
    ctx.defineMethod(ctx.Module, "include",
      function(ctx, self, args) {
        for (var i = 0; i < args.length; ++i) {
          ctx.includeModule(self, args[i]);
        }
      }
    );
    
    ctx.defineMethod(ctx.Module, "private",
      function(ctx, self, args) {
        // TODO: implement
      }
    );
    
    ctx.defineMethod(ctx.Module, "protected",
      function(ctx, self, args) {
        // TODO: implement
      }
    );
    
    ctx.defineMethod(ctx.Module, "public",
      function(ctx, self, args) {
        // TODO: implement
      }
    );
    
    ctx.defineMethod(ctx.Module, "module_function",
      function(ctx, self, args) {
        if (args.length == 0) {
          self.scope = "module_function";
        } else {
          for (var i = 0; i < args.length; ++i) {
            ctx.makeModuleFunction(self, args[i].value);
          }
        }
      }
    );
    
    ctx.defineMethod(ctx.Module, "alias_method",
      function(ctx, self, args) {
        ctx.aliasMethod(self, args[0].value, args[1].value);
      }
    );
    
    ctx.defineMethod(ctx.Module, "ancestors",
      function(ctx, self) {
        var ary = [];
        ctx.eachAncestor(self, function(c) {
          ary.push(c);
        });
        return ctx.newArray(ary);
      }
    );
    
    ctx.defineMethod(ctx.Module, "attr_reader",
      function(ctx, self, args) {
        // TODO: rewrite it without dynamic function.
        args.each(function(arg) {
          ctx.defineMethod(self, arg.value, function(obj) {
            return ctx.getInstanceVar(obj, "@" + arg.value);
          });
        });
      }
    );
    
    ctx.defineMethod(ctx.Module, "attr_writer",
      function(ctx, self, args) {
        // TODO: rewrite it without dynamic function.
        args.each(function(arg) {
          ctx.defineMethod(self, arg.value + "=", function(obj, writerArgs) {
            return ctx.setInstanceVar(obj, "@" + arg.value, writerArgs[0]);
          });
        });
      }
    );
    
    ctx.defineMethod(ctx.Module, "name",
      function(ctx, self) {
        return self.name;
      }
    );
    
    ctx.defineMethod(ctx.Module, "inspect",
      function(ctx, self) {
        return self.name;
      }
    );
    
    ctx.defineMethod(ctx.Module, "ivar_as_index",
      function(ctx, self) {
        // Dummy for Rubinius specific method.
      }
    );
    
  }

  ctx.defineClass("Class", {"superClass": ctx.Module});
  {
    
    ctx.defineMethod(ctx.Class, "allocate",
      function(ctx, self) {
        return ctx.newObject(self);
      }
    );
    
  }

  // Manually adds missing links between three classes above.
  ctx.Object.rubyClass = ctx.Class;
  ctx.Object.singletonClass.rubyClass = ctx.Class;
  ctx.Object.singletonClass.superClass = ctx.Class;
  ctx.Module.rubyClass = ctx.Class;
  ctx.Module.singletonClass.rubyClass = ctx.Class;
  ctx.Class.rubyClass = ctx.Class;
  ctx.Class.singletonClass.rubyClass = ctx.Class;

  ctx.defineClass("NativeEnvironment");
  ctx.defineClass("NativeObject");
  ctx.defineClass("NativeClass");

  ctx.defineModule("Kernel");
  {
  
    ctx.defineMethod(ctx.Kernel, "__sleep__", {async: true},
      function(ctx, self, args, block, callback) {
        setTimeout(callback, args[0] * 1000);
      }
    );

    ctx.defineMethod(ctx.Kernel, "__proc__", {async: true},
      function(ctx, self, args, block, callback) {
        ctx.sendAsync(ctx.Proc, "new", args, block, callback);
      }
    );

    ctx.defineMethod(ctx.Kernel, "__block_given__", 
      function(ctx, self) {
        return ctx.blockGiven();
      }
    );

    ctx.defineMethod(ctx.Kernel, "__raise__", {async: true},
      function(ctx, self, args, block, callback) {
        callback(null, args[0]);
      }
    );
  
  }
  
  ctx.defineClass("TrueClass");
  {
    ctx.defineMethod(ctx.TrueClass, "!",
      function(ctx, self) {
        return false;
      }
    );
    
    ctx.defineMethod(ctx.TrueClass, "&",
      function(ctx, self, args) {
        return args[0] ? true : false;
      }
    );
    
    ctx.defineMethod(ctx.TrueClass, "|",
      function(ctx, self, args) {
        return true;
      }
    );

    ctx.defineMethod(ctx.TrueClass, "^",
      function(ctx, self, args) {
        return args[0] ? false : true;
      }
    );

    ctx.defineMethod(ctx.TrueClass, "to_s",
      function(ctx, self) {
        return "true";
      }
    );
    
  }

  ctx.defineClass("FalseClass");
  {
    
    ctx.defineMethod(ctx.FalseClass, "!",
      function(ctx, self) {
        return true;
      }
    );
    
    ctx.defineMethod(ctx.FalseClass, "&",
      function(ctx, self, args) {
        return false;
      }
    );
    
    ctx.defineMethod(ctx.FalseClass, "|",
      function(ctx, self, args) {
        return args[0] ? true : false;
      }
    );

    ctx.defineMethod(ctx.FalseClass, "^",
      function(ctx, self, args) {
        return args[0] ? true : false;
      }
    );

    ctx.defineMethod(ctx.FalseClass, "to_s",
      function(ctx, self) {
        return "false";
      }
    );
    
  }

  ctx.defineClass("NilClass");
  {
    
    ctx.defineMethod(ctx.NilClass, "nil?",
      function(ctx, self) {
        return true;
      }
    );
    
    ctx.defineMethod(ctx.NilClass, "!",
      function(ctx, self) {
        return true;
      }
    );
    
    ctx.defineMethod(ctx.NilClass, "inspect",
      function(ctx, self) {
        return "nil";
      }
    );
    
  }

  ctx.defineClass("Proc");
  {
    
    ctx.defineMethod(ctx.Proc, "initialize",
      function(ctx, self, args, block) {
        self.opcode = block.opcode;
        self.parentFrame = block.parentFrame;
      }
    );
    
    ctx.defineMethod(ctx.Proc, "call", {async: true},
      function(ctx, self, args, block, callback) {
        ctx.callProc(self, args, block, callback);
      }
    );
    
    ctx.aliasMethod(ctx.Proc, "yield", "call");
    
    // Rubinius-specific methods
    
    ctx.defineMethod(ctx.Proc, "block",
      function(ctx, self) {
        return self;
      }
    );
    
    ctx.defineMethod(ctx.Proc, "home",
      function(ctx, self) {
        var mc = ctx.newObject(ctx.MethodContext);
        mc.frame = self.parentFrame.localFrame;
        return mc;
      }
    );
    
  }

  ctx.defineClass("Numeric");

  ctx.defineClass("Integer", {"superClass": ctx.Numeric});

  ctx.defineClass("Fixnum", {"superClass": ctx.Integer});
  {
    
    ctx.defineMethod(ctx.Fixnum, "+",
      function(ctx, self, args) {
        return self + args[0];
      }
    );

    ctx.defineMethod(ctx.Fixnum, "-",
      function(ctx, self, args) {
        return self - args[0];
      }
    );

    ctx.defineMethod(ctx.Fixnum, "*",
      function(ctx, self, args) {
        return self * args[0];
      }
    );

    ctx.defineMethod(ctx.Fixnum, "/",
      function(ctx, self, args) {
        return Math.floor(self / args[0]);
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "%",
      function(ctx, self, args) {
        return self % args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "<=>",
      function(ctx, self, args) {
        if (self > args[0])
          return 1;
        else if (self == args[0])
          return 0;
        if (self < args[0])
          return -1;
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "<",
      function(ctx, self, args) {
        return self < args[0];
      }
    );

    ctx.defineMethod(ctx.Fixnum, ">",
      function(ctx, self, args) {
        return self > args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "<=",
      function(ctx, self, args) {
        return self <= args[0];
      }
    );

    ctx.defineMethod(ctx.Fixnum, ">=",
      function(ctx, self, args) {
        return self >= args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "==",
      function(ctx, self, args) {
        return self == args[0];
      }
    );

    ctx.defineMethod(ctx.Fixnum, "<<",
      function(ctx, self, args) {
        return self << args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, ">>",
      function(ctx, self, args) {
        return self >> args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "&",
      function(ctx, self, args) {
        return self & args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "|",
      function(ctx, self, args) {
        return self | args[0];
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "^",
      function(ctx, self, args) {
        return self ^ args[0];
      }
    );
    
    // Overrides Ruby implementation to make it faster.
    ctx.defineMethod(ctx.Fixnum, "succ",
      function(ctx, self) {
        return self + 1;
      }
    );

    ctx.defineMethod(ctx.Fixnum, "hash",
      function(ctx, self) {
        return self; // TODO: better value
      }
    );

    // Overrides Ruby implementation to make it faster.
    ctx.defineMethod(ctx.Fixnum, "times", {async: true},
      function(ctx, self, args, block, callback) {
        var i = 0;
        ctx.loopAsync(
          function() { return i < self; },
          function() { ++i; },
          function(bodyCallback) {
            ctx.sendAsync(block, "yield", [i], bodyCallback);
          },
          callback
        );
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "to_s",
      function(ctx, self) {
        return self.toString();
      }
    );
    
    ctx.defineMethod(ctx.Fixnum, "inspect",
      function(ctx, self) {
        return self.toString();
      }
    );
    
  }

  // Not implemented
  ctx.defineClass("Bignum", {"superClass": ctx.Integer});

  ctx.defineClass("Float", {"superClass": ctx.Numeric});
  {
    
    ctx.defineMethod(ctx.Float, "+",
      function(ctx, self, args) {
        return self + args[0];
      }
    );

    ctx.defineMethod(ctx.Float, "-",
      function(ctx, self, args) {
        return self - args[0];
      }
    );

    ctx.defineMethod(ctx.Float, "*",
      function(ctx, self, args) {
        return self * args[0];
      }
    );

    ctx.defineMethod(ctx.Float, "/",
      function(ctx, self, args) {
        return self / args[0];
      }
    );
    
    ctx.defineMethod(ctx.Float, "%",
      function(ctx, self, args) {
        return self % args[0];
      }
    );
    
    ctx.defineMethod(ctx.Float, "<=>",
      function(ctx, self, args) {
        if (self > args[0])
          return 1;
        else if (self == args[0])
          return 0;
        if (self < args[0])
          return -1;
      }
    );
    
    ctx.defineMethod(ctx.Float, "<",
      function(ctx, self, args) {
        return self < args[0];
      }
    );

    ctx.defineMethod(ctx.Float, ">",
      function(ctx, self, args) {
        return self > args[0];
      }
    );
    
    ctx.defineMethod(ctx.Float, "<=",
      function(ctx, self, args) {
        return self <= args[0];
      }
    );

    ctx.defineMethod(ctx.Float, ">=",
      function(ctx, self, args) {
        return self >= args[0];
      }
    );
    
    ctx.defineMethod(ctx.Float, "==",
      function(ctx, self, args) {
        return self == args[0];
      }
    );
    
    ctx.defineMethod(ctx.Float, "to_s",
      function(ctx, self) {
        return self.toString();
      }
    );

    ctx.defineMethod(ctx.Float, "inspect",
      function(ctx, self) {
        return self.toString();
      }
    );
    
  }

  ctx.defineClass("String");
  {
    
    ctx.defineMethod(ctx.String, "length",
      function(ctx, self) {
        return self.value.length;
      }
    );
    
    ctx.defineMethod(ctx.String, "dup",
      function(ctx, self) {
        return ctx.newString(self.value);
      }
    );
    
    ctx.defineMethod(ctx.String, "hash",
      function(ctx, self) {
        var hash = 0;
        for (var i = 0; i < self.value.length; ++i) {
          hash += self.value.charCodeAt(i);
        }
        return hash;
      }
    );
    
    ctx.defineMethod(ctx.String, "downcase!",
      function(ctx, self) {
        self.value = self.value.toLowerCase();
      }
    );
    
    ctx.defineMethod(ctx.String, "upcase!",
      function(ctx, self) {
        self.value = self.value.toUpperCase();
      }
    );
    
    ctx.defineMethod(ctx.String, "to_i",
      function(ctx, self, args) {
        var base = args[0] == null ? 10 : args[0];
        return parseInt(self.value, base);
      }
    );
    
    ctx.defineMethod(ctx.String, "to_f",
      function(ctx, self) {
        return parseFloat(self.value);
      }
    );
    
    // Methods used internally in lib/core/string.rb
    
    ctx.defineMethod(ctx.String, "__at__",
      function(ctx, self, args) {
        return ctx.newString(self.value[args[0]]);
      }
    );
    
    ctx.defineMethod(ctx.String, "__set__",
      function(ctx, self, args) {
        var pos = args[0];
        var chr = args[1];
        self.value = self.value.substr(0, pos) + chr.value + self.value.substr(pos + 1);
      }
    );
    
    ctx.defineMethod(ctx.String, "__compare__",
      function(ctx, self, args) {
        if (self.value > args[0].value) {
          return 1;
        } else if (self.value < args[0].value) {
          return -1;
        } else {
          return 0;
        }
      }
    );
    
    ctx.defineMethod(ctx.String, "__replace__",
      function(ctx, self, args) {
        var other = args[0];
        var pos = args[1] || 0;
        var len = args[2] == null ? other.value.length : args[2];
        self.value = other.value.substr(pos, len);
      }
    );
    
    ctx.defineMethod(ctx.String, "substring",
      function(ctx, self, args) {
        var pos = args[0];
        var len = args[1];
        return ctx.newString(self.value.substr(pos, len));
      }
    );
    
    ctx.defineMethod(ctx.String, "copy_from",
      function(ctx, self, args) {
        var other = args[0];
        var other_pos = args[1];
        var len = args[2];
        var self_pos = args[3];
        self.value =
          self.value.substr(0, self_pos) +
          other.value.substr(other_pos, len) +
          self.value.substr(self_pos + len);
      }
    );
    
    ctx.defineMethod(ctx.String, "append",
      function(ctx, self, args) {
        self.value += args[0].value;
      }
    );
    
    ctx.defineMethod(ctx.String, "isspace",
      function(ctx, self) {
        return self.value.match(/^\s*$/) != null;
      }
    );
    
    ctx.defineMethod(ctx.String, "islower",
      function(ctx, self) {
        return self.value.match(/^[a-z]*$/) != null;
      }
    );
    
    ctx.defineMethod(ctx.String, "isupper",
      function(ctx, self) {
        return self.value.match(/^[A-Z]*$/) != null;
      }
    );
    
    ctx.defineClassMethod(ctx.String, "template",
      function(ctx, self, args) {
        var len = args[0];
        var str = args[1];
        var res = "";
        for (var i = 0; i < len; i += str.value.length) {
          res += str.value;
        }
        return ctx.newString(res.substr(0, len));
      }
    );
    
  }

  // TODO: implement it
  ctx.defineClass("Symbol");

  ctx.defineClass("Regexp");
  {
    
    // Methods used internally in lib/core/regexp.rb
    
    ctx.defineMethod(ctx.Regexp, "search_region",
      function(ctx, self, args) {
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
          "@full": ctx.newTuple([match.index, match.index + match[0].length]),
          "@captures": ctx.newArray(
            match.slice(1).map(function(s){ return ctx.newString(s); }))
        }
        return res;
      }
    );
    
    ctx.defineClassMethod(ctx.Regexp, "__regexp_new__",
      function(ctx, self, args) {
        return ctx.newRegexp(args[0].value, args[1]);
      }
    );
    
  }

  ctx.defineClass("MatchData");

  // Rubinius-specific class
  ctx.defineClass("Tuple");
  {
    
    ctx.defineMethod(ctx.Tuple, "initialize",
      function(ctx, self, args) {
        self.value = new Array(args[0]);
        for (var i = 0; i < args[0]; ++i) {
          self.value[i] = null;
        }
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "dup",
      function(ctx, self) {
        var res = ctx.newObject(ctx.Tuple);
        res.value = self.value.concat([]);
        return res;
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "fields",
      function(ctx, self) {
        return self.value.length;
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "at",
      function(ctx, self, args) {
        return self.value[args[0]];
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "[]",
      function(ctx, self, args) {
        return self.value[args[0]];
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "put",
      function(ctx, self, args) {
        self.value[args[0]] = args[1];
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "[]=",
      function(ctx, self, args) {
        self.value[args[0]] = args[1];
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "copy_from",
      function(ctx, self, args) {
        var other = args[0];
        var op = args[1];
        var sp = args[2];
        for (; op < other.value.length; ++op) {
          self.value[sp] = other.value[op];
          ++sp;
        }
      }
    );
    
    ctx.defineMethod(ctx.Tuple, "shifted",
      function(ctx, self, args) {
        var res = ctx.newObject(ctx.Tuple);
        res.value = new Array(args[0]).concat(self.value);
        return res;
      }
    );
    
  }

  ctx.defineClass("Thread");
  {
    
    ctx.defineMethod(ctx.Thread, "initialize",
      function(ctx, self, args, block) {
        var subCtx = ctx.newContext();
        setTimeout(function() {
          subCtx.sendAsync(block, "yield", args, function(){ });
        }, 1);
      }
    );
    
  }

  ctx.defineClass("Time");
  {
    
    ctx.defineMethod(ctx.Time, "initialize",
      function(ctx, self, args) {
        self.instanceVars.date = new Date(); 
      }
    );
    
    ctx.defineMethod(ctx.Time, "to_s",
      function(ctx, self) {
        return self.instanceVars.date.toString();
      }
    );
    
    ctx.defineMethod(ctx.Time, "to_f",
      function(ctx, self) {
        return self.instanceVars.date.getTime() / 1000;
      }
    );
    
  }

  ctx.defineClass("IO");
  {
    
    ctx.defineMethod(ctx.IO, "write",
      function(ctx, self, args) {
        // For now, only supports console output.
        ctx.printToConsole(args[0].value);
      }
    );
    
  }

  ctx.defineClass("Exception");
  {
    
    ctx.defineMethod(ctx.Exception, "__backtrace__",
      function(ctx, self) {
        var frame = ctx.getInstanceVar(self, "@context").frame;
        var backtrace = [];
        while (frame) {
          backtrace.push(frame.fileName + ":" + frame.lineNo + ":in `" + frame.methodName + "'");
          frame = frame.senderFrame;
        }
        return ctx.newArray(backtrace);
      }
    );
    
  }

  // Internally used
  ctx.defineClass("BreakException");
  ctx.defineClass("ReturnException");

  // Rubinius-specific class
  // Note that so far it also represents BlockContext.
  ctx.defineClass("MethodContext");
  {
    
    ctx.defineMethod(ctx.MethodContext, "sender",
      function(ctx, self) {
        var senderFrame = self.frame.senderFrame;
        if (senderFrame) {
          var mc = ctx.newObject(ctx.MethodContext);
          mc.frame = senderFrame.dynamicFrame;
          return mc;
        } else {
          return null;
        }
      }
    );
    
    ctx.defineMethod(ctx.MethodContext, "home",
      function(ctx, self) {
        var mc = ctx.newObject(ctx.MethodContext);
        mc.frame = self.frame.dynamicFrame;
        return mc;
      }
    );
    
    ctx.defineMethod(ctx.MethodContext, "[]",
      function(ctx, self, args) {
        if (!self.frame.localFrame.data) return null;
        return self.frame.localFrame.data[args[0].value];
      }
    );
    
    ctx.defineMethod(ctx.MethodContext, "[]=",
      function(ctx, self, args) {
        if (!self.frame.localFrame.data) self.frame.localFrame.data = {};
        self.frame.localFrame.data[args[0].value] = args[1];
      }
    );
    
    ctx.defineMethod(ctx.MethodContext, "inspect",
      function(ctx, self) {
        return "#<MethodContext:" + self.frame.type + " " + self.frame.methodName + ">";
      }
    );
    
    ctx.defineClassMethod(ctx.MethodContext, "current",
      function(ctx, self) {
        var mc = ctx.newObject(ctx.MethodContext);
        mc.frame = ctx.currentFrame().dynamicFrame;
        return mc;
      }
    );
    
  }

  ctx.defineClass("CGI");
  {
    
    ctx.defineClassMethod(ctx.CGI, "escapeHTML",
      function(ctx, self, args) {
        return args[0].value.
          replace(/&/, "&amp;").
          replace(/</, "&lt;").
          replace(/>/, "&gt;").
          replace(/"/, "&quot;");
      }
    );
    
  }

  ctx.defineClass("JSON");
  {
    
    ctx.defineClassMethod(ctx.JSON, "parse",
      function(ctx, self, args) {
        var obj = eval("(" + args[0].value + ")");
        function convert(obj) {
          if (obj == null || typeof(obj) == "boolean" || typeof(obj) == "number") {
            return obj;
          } else if (typeof(obj) == "string") {
            return ctx.newString(obj);
          } else if (typeof(obj) == "object" && obj instanceof Array) {
            var ary = new Array(obj.length);
            for (var i = 0; i < obj.length; ++i) {
              ary[i] = convert(obj[i]);
            }
            return ctx.newArray(ary);
          } else {
            var ary = [];
            for (var k in obj) {
              ary.push(convert(k), convert(obj[k]));
            }
            return ctx.newHash(ary);
          }
        }
        return convert(obj);
      }
    );
    
    ctx.defineClassMethod(ctx.JSON, "unparse",
      function(ctx, self, args) {
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
    );
    
  }

  // Class for HotRuby-specific methods
  ctx.defineClass("JS");
  {
    
    ctx.defineClassMethod(ctx.JS, "http_request", {async: true},
      function(ctx, self, args, block, callback) {
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
      }
    );
    
    ctx.defineClassMethod(ctx.JS, "debug",
      function(ctx, self, args) {
        return ctx.vm().debug;
      }
    );
    
    ctx.defineClassMethod(ctx.JS, "debug=",
      function(ctx, self, args) {
        ctx.vm().debug = args[0];
      }
    );
    
  }

  ctx.setConstant(ctx.Object, "RUBY_PLATFORM", ctx.newString("javascript-hotruby"));

  ctx.vm().onClassesInitialized();

});

RubyVM.addAsyncInitializer(function(ctx, callback) {
  // Defines builtin classes written in Ruby.
  ctx.vm().compileAndRun("builtin", callback);
});
