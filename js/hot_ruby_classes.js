// The license of this source is "Ruby License"

RubyVM.addInitializer(function(ctx) {

  var objectClass = ctx.defineClass("Object");
  ctx.setConstant(objectClass, "Object", objectClass);
  {
    
    ctx.defineMethod(ctx.Object, "initialize",
      function(ctx, self) {
        var ctor = ctx.classOf(self).constructor;
        if (ctor) ctor(ctx, self);
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
        return new RubyObject(ctx, self);
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
    
    ctx.defineMethod(ctx.String, "tolower",
      function(ctx, self) {
        return self.value.toLowerCase();
      }
    );
    
    ctx.defineMethod(ctx.String, "toupper",
      function(ctx, self) {
        return self.value.toUpperCase();
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

  // HotRuby-specific class
  ctx.defineModule("HRWT");
  {
    
    ctx.HRWT.structureToObject = function(ctx, structure) {
      if (!structure) return null;
      if (structure.$rubyObject) return structure.$rubyObject;
      if (structure.$id) {
        var elem = ctx.newObject(ctx.HRWT.Element, $(structure.$id), structure);
      } else {
        var elem = ctx.newObject(ctx.HRWT.RepeatableElement, structure);
      }
      structure.$rubyObject = elem;
      return elem;
    };
    
    ctx.HRWT.createElementMap = function(ctx, structure, result) {
      result = result || {};
      for (var k in structure) {
        if (k == "$id") {
          result[structure.$id] = $(structure.$id);
        } else if (!k.match(/^\$/)) {
          ctx.HRWT.createElementMap(ctx, structure[k], result);
        }
      }
      return result;
    };
    
    ctx.HRWT.cloneStructure = function(ctx, src, idMap) {
      var dest = {};
      for (var k in src) {
        if (k == "$id") {
          dest[k] = idMap[src[k]];
        } else if (k == "$rubyObject") {
          // Doesn't copy it
        } else if (k.match(/^\$/)) {
          dest[k] = src[k];
        } else {
          dest[k] = ctx.HRWT.cloneStructure(ctx, src[k], idMap);
        }
      }
      return dest;
    };
    
    ctx.defineClassMethod(ctx.HRWT, "view",
      function(ctx, self, args) {
        if (!self.view) {
          self.view = ctx.newObject(ctx.HRWT.Element, document.body, window.hrwt_view_structure);
        }
        return self.view;
      }
    );
    
    ctx.defineClassMethod(ctx.HRWT, "title",
      function(ctx, self, args) {
        return document.title;
      }
    );
    
    ctx.defineClassMethod(ctx.HRWT, "title=",
      function(ctx, self, args) {
        var title = args[0].value;
        document.title = title;
      }
    );
    
    ctx.defineClass("Element", {upperClass: ctx.HRWT});
    {
      
      ctx.defineConstructor(ctx.HRWT.Element, function(ctx, self, element, structure) {
        self.element = element;
        self.structure = structure;
        if (structure) {
          Object.keys(structure).each(function(name) {
            if (!name.match(/^\$/)) {
              ctx.defineSingletonMethod(self, name, {async: true},
                function(sctx, sself, sargs, sblock, scallback) {
                  sctx.sendAsync(sself, "get", [sctx.toRuby(name)], sblock, scallback);
                }
              );
            }
          });
        }
      });
      
      ctx.defineMethod(ctx.HRWT.Element, "initialize",
        function(ctx, self, args) {
          var tagName = args[0].value;
          self.element = document.createElement(tagName);
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "append_child",
        function(ctx, self, args) {
          var child = args[0];
          var childElem;
          if (ctx.kindOf(child, ctx.HRWT.Element)) {
            childElem = child.element;
          } else {
            childElem = document.createTextNode(child.value);
          }
          self.element.appendChild(childElem);
          return self;
        }
      );
      
      ctx.aliasMethod(ctx.HRWT.Element, "<<", "append_child");
      
      ctx.defineMethod(ctx.HRWT.Element, "clear_children",
        function(ctx, self) {
          while (self.element.hasChildNodes()) {
            self.element.removeChild(self.element.firstChild);
          }
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "text",
        function(ctx, self) {
          var text = "";
          var children = self.element.childNodes;
          for (var i = 0; i < children.length; ++i) {
            if (children[i].nodeType == Node.TEXT_NODE) {
              text += children[i].nodeValue;
            }
          }
          return text;
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "text=",
        function(ctx, self, args) {
          while (self.element.hasChildNodes()) {
            self.element.removeChild(self.element.firstChild);
          }
          self.element.appendChild(document.createTextNode(args[0].value));
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "focus",
        function(ctx, self, args) {
          self.element.focus();
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "on",
        function(ctx, self, args, block) {
          var eventName = args[0].value;
          Event.observe(self.element, eventName, function(event) {
            var subCtx = ctx.newContext();
            var arg = subCtx.newObject(ctx.HRWT.Event);
            arg.value = event;
            subCtx.callProc(block, [arg], null, function(res, ex) {
              if (ex) console.error("Exception in event handler: ", ex);
            });
          }, true);
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "get",
        function(ctx, self, args) {
          var name = args[0].value;
          return ctx.HRWT.structureToObject(ctx, self.structure[name]);
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "method_missing",
        function(ctx, self, args, block) {
          var methodName = args[0].value;
          if (methodName.match(/^(.*)=$/)) {
            var name = RegExp.$1;
            self.element[name] = args[1].value;
          } else if (methodName.match(/^on_(.*)$/)) {
            ctx.sendSync(self, "on", [ctx.toRuby(RegExp.$1)], block);
          } else {
            return self.element[methodName];
          }
        }
      );
      
      ctx.defineMethod(ctx.HRWT.Element, "inspect",
        function(ctx, self) {
          return "#<" + ctx.classOf(self).name + ">";
        }
      );
      
    }
    
    ctx.defineClass("Event", {upperClass: ctx.HRWT});
    {
      
      ctx.defineMethod(ctx.HRWT.Event, "stop",
        function(ctx, self, args) {
          Event.stop(self.value);
        }
      );
      
    }
    
    var tagNames = [
      "a", "abbr", "acronym", "address", "applet", "area", "b", "base", "basefont", "bdo", 
      "bgsound", "big", "blink", "blockquote", "body", "br", "button", "caption", "center", "cite", 
      "code", "col", "colgroup", "comment", "dd", "del", "dfn", "dir", "div", "dl", "dt", "em", 
      "embed", "fieldset", "font", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", 
      "head", "hr", "html", "i", "iframe", "ilayer", "img", "input", "ins", "isindex", "kbd", 
      "keygen", "label", "layer", "legend", "li", "link", "listing", "map", "marquee", "menu", "meta", 
      "multicol", "nextid", "nobr", "noembed", "noframes", "nolayer", "noscript", "object", "ol", 
      "optgroup", "option", "p", "param", "plaintext", "pre", "q", "rb", "rp", "rt", "ruby", "s", 
      "samp", "script", "select", "server", "small", "spacer", "span", "strike", "strong", "style", 
      "sub", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "title", "tr", "tt", 
      "u", "ul", "var", "wbr", "xmp"
    ];
    
    tagNames.each(function(tagName) {
      var className = tagName.replace(/^(.)(.*)$/, function(s, f, r) { return f.toUpperCase() + r; });
      var klass = ctx.defineClass(className, {superClass: ctx.HRWT.Element, upperClass: ctx.HRWT});
      ctx.defineMethod(klass, "initialize", {async: true},
        function(ctx, self, args, block, callback) {
          ctx.superAsync(self, "initialize", [ctx.toRuby(className)], block, klass, callback);
        }
      );
    });
    
    ctx.defineClass("RepeatableElement", {upperClass: ctx.HRWT});
    {
      
      ctx.defineConstructor(ctx.HRWT.RepeatableElement, function(ctx, self, structure) {
        self.structure = structure;
      });
      
      ctx.defineMethod(ctx.HRWT.RepeatableElement, "[]",
        function(ctx, self, args) {
          var index = args[0];
          return ctx.HRWT.structureToObject(ctx, self.structure[index]);
        }
      );
      
      ctx.defineMethod(ctx.HRWT.RepeatableElement, "size",
        function(ctx, self) {
          return self.structure.repeat;
        }
      );
      
      ctx.defineMethod(ctx.HRWT.RepeatableElement, "clear",
        function(ctx, self) {
          for (var i = 0; i < self.structure.repeat; ++i) {
            var elem = $(self.structure[i].$id);
            elem.parentNode.removeChild(elem);
            self.structure[i] = null;
          }
          self.structure.repeat = 0;
        }
      );
      
      ctx.defineMethod(ctx.HRWT.RepeatableElement, "add",
        function(ctx, self) {
          var repeat = self.structure.repeat;
          var elemMap = ctx.HRWT.createElementMap(ctx, self.structure.template);
          var tplRoot = $(self.structure.template.$id);
          var newRoot = tplRoot.cloneNode(true);
          var lastRoot = $(self.structure[repeat > 0 ? repeat - 1 : "template"].$id);
          if (lastRoot.nextSibling) {
            lastRoot.parentNode.insertBefore(newRoot, lastRoot.nextSibling);
          } else {
            lastRoot.parentNode.appendChild(newRoot);
          }
          var idMap = {};
          for (var id in elemMap) {
            var tplElem = elemMap[id];
            tplElem.id = "";
            var newElem = $(id);
            tplElem.id = id;
            var newId = id.replace(/\.[^\.]+$/, "." + window.hrwt_view_structure.$nextSerial);
            ++window.hrwt_view_structure.$nextSerial;
            newElem.id = newId;
            idMap[id] = newId;
          }
          Element.show(newRoot);
          var newStructure = ctx.HRWT.cloneStructure(ctx, self.structure.template, idMap);
          self.structure[repeat] = newStructure;
          ++self.structure.repeat;
          return ctx.HRWT.structureToObject(ctx, newStructure);
        }
      );
      
      ctx.defineMethod(ctx.HRWT.RepeatableElement, "template",
        function(ctx, self) {
          return ctx.HRWT.structureToObject(ctx, self.structure.template);
        }
      );
      
    }
    
  }
  
  ctx.setConstant(ctx.Object, "RUBY_PLATFORM", ctx.newString("javascript-hotruby"));

  ctx.vm().onClassesInitialized();

});

RubyVM.addAsyncInitializer(function(ctx, callback) {
  // Defines builtin classes written in Ruby.
  ctx.vm().compileAndRun("builtin", callback);
});
