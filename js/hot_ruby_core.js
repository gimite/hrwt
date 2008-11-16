// The license of this source is "Ruby License"

if (!this.console) {
  if (typeof(window) != "undefined") {
    this.console = {
      log: function(){ },
      error: function(){ }
    };
  } else {
    this.console = {
      log: print,
      error: print
    };
  }
}

var RubyObject = function(ctx, klass) {
  if (!klass) ctx.fatal("klass is missing");
  this.vm = ctx.vm;
  this.rubyClass = klass;
  this.instanceVars = {};
};

RubyObject.prototype = {
  toString: function() {
    return "RubyObject:" + this.rubyClass.name;
  }
};

var RubyClass = function(ctx, className, params) {
  this.vm = ctx.vm;
  this.type = params.type;
  this.rubyClass = this.type == "module" ? ctx.Module : ctx.Class;
  this.superClass = this.type == "module" ? null : (params.superClass || ctx.Object || null);
  this.methods = params.instanceMethods || {};
  this.constants = params.constants || {};
  this.classVars = params.classVars || {};
  this.instanceVars = params.instanceVars || {};
  this.included = params.included || [];
  if (this.type != "singleton") {
    this.singletonClass = new RubyClass(ctx, null, {
      superClass: this.superClass ? this.superClass.singletonClass : this.rubyClass,
      type: "singleton",
      instanceMethods: params.classMethods || {}
    });
  }
  if (this.type != "singleton" && className && ctx.Object) {
    this.upperClass = params.upperClass || ctx.Object;
    this.upperClass.constants[className] = this;
    if (this.upperClass == ctx.Object) {
      this.name = className;
      // Adds it to prototype of context object so that we can access Ruby class Hoge by
      // ctx.Hoge for convenience.
      this.vm.Context.prototype[className] = this;
    } else {
      this.name = this.upperClass.name ? this.upperClass.name + "::" + className : null;
    }
  } else {
    this.name = className;
  }
};

RubyClass.prototype = {
  toString: function() {
    return "RubyClass:" + this.name;
  }
};

/**
 * RubyVM
 * @class
 * @construtor
 */
var RubyVM = function(params) {
  var me = this;
  params = params || {};
  me.compilerUrl = params.compilerUrl || "compile";
  me.consoleElement = params.consoleElement;
  /** 
   * Global Variables
   * @type Object 
   */
  me.globalVars = {};
  /** 
   * END blocks
   * @type Array 
   */
  me.endBlocks = [];
  /**
   * Running Enviornment
   * @type String
   */
  me.env = "browser";
  me.topObject = null;
  me.topFrame = null;
  
  me.loaded = false;
  me.onLoaded = [];
  
  me.Context = function() {
    this.vm = me;
  };
  me.Context.prototype = new RubyContext();
  
  var ctx = new me.Context();
  RubyVM.debugContext = ctx; // for debug
  var i = 0;
  ctx.loopAsync(
    function(){ return i < RubyVM.initializers.length; },
    function(){ ++i; },
    function(callback) {
      RubyVM.initializers[i](ctx, callback);
    },
    function(res, ex) {
      if (ex) return;
      me.loaded = true;
      me.onLoaded.each(function(handler) {
        handler();
      });
    }
  );
  
};

RubyVM.initializers = [];

RubyVM.addInitializer = function(func) {
  RubyVM.initializers.push(function(ctx, callback) {
    func(ctx);
    callback();
  });
};

RubyVM.addAsyncInitializer = function(func) {
  RubyVM.initializers.push(func);
};

RubyVM.prototype = {
  
  /**
   * Send the source to server and run.
   * @param {String} url Ruby compiler url
   * @param {src} Ruby source
   */
  compileAndRun : function(source, callback) {
    var me = this;
    var ctx = new me.Context();
    var url;
    var params = {};
    if (source == "builtin") {
      url = "iseq/builtin";
    } else if (source.url) {
      url = source.url;
    } else if (source.script) {
      url = me.compilerUrl;
      params["src"] = source.script;
    } else {
      throw "Unknown source";
    }
    
    var paramAry = [];
    for (var k in params) {
      paramAry.push(k + "=" + encodeURIComponent(params[k]));
    }
    new Ajax.Request(
      url,
      {
        method: "post",
        parameters: paramAry.join("&"),
        onSuccess: function(response) {
          try {
            if (response.responseText.length == 0) {
              ctx.printToConsole("Compiling error\n");
              console.error("Compiling error");
              callback();
            } else {
              var opcodes = eval("(" + response.responseText + ")");
              if (!me.loaded && source != "builtin") {
                // Waits until builtin classes are loaded.
                me.onLoaded.push(function() {
                  ctx.runOpcodes(opcodes, callback);
                });
              } else {
                ctx.runOpcodes(opcodes, callback);
              }
            }
          } catch (ex) {
            console.error(ex);
          }
        },
        onFailure: function(response) {
          var message = "Failed to access " + url;
          ctx.printToConsole(message + "\n");
          console.error(message);
          callback();
        }
      }
    );
  },
  
  runOpcodes: function(opcodes, callback) {
    var me = this;
    var ctx = new me.Context();
    ctx.runOpcodes(opcodes, callback);
  },
  
  /**
   * Check whether the environment is Flash, Browser or Console (SpiderMonkey or Rhino).
   */
  checkEnv : function(ctx) {
    var me = this;
    if (typeof(_root) != "undefined") {
      me.env = "flash";
      // Create debug text field
      RubyVM.debugTextField = new TextField();
      RubyVM.debugTextField.autoSize = TextFieldAutoSize.LEFT;
      _root.addChild(RubyVM.debugTextField);
      // Define alert
      alert = function(str) {
        RubyVM.debugTextField.text += str + "\n";
      }
      me.nativeClassObjCache = {};
      me.asPackages = [""];
      // Create _root NativeObject
      var obj = ctx.newObject(ctx.NativeObject);
      obj.value = _root;
      me.globalVars.$native.instanceVars._root = obj;
    } else if (typeof(window) != "undefined") {
      me.env = "browser";
    } else if (typeof(print) != "undefined") {
      me.env = "console";
      // Define alert
      alert = function(str) {
        print(str);
      }
    } else {
      ctx.fatal("Unknown environment");
    }
  },
  
  toString: function() {
    return "RubyVM";
  }
  
};

RubyContext = function() {};

RubyContext.prototype = {
  
  newContext: function() {
    var me = this;
    return new me.vm.Context();
  },
  
  runOpcodes: function(opcodes, callback) {
    var me = this;
    var i = 0;
    me.loopAsync(
      function() { return i < opcodes.length; },
      function() { ++i; },
      function(bodyCallback) {
        me.runOpcode({
          opcode: opcodes[i],
          invokeClass: me.Object,
          methodName: "<main>",
          self: me.vm.topObject
        }, function(res, ex) {
          if (ex) {
            console.error("Error: ", ex);
            me.sendSync(me.Kernel, "__print_exception__", [ex]);
            if (callback) callback(null, ex);
          } else {
            bodyCallback();
          }
        });
      },
      function() {
        console.log("Done");
        if (callback) callback();
      }
    );
  },
  
  /**
   * Run the opcode.
   * @param {Array} params.opcode
   * @param {RubyObject} params.invokeClass
   * @param {String} params.methodName
   * @param {RubyObject} params.self
   * @param {Array} params.args
   * @param {RubyObject} params.block
   * @param {RubyVM.Frame} params.parentFrame
   * @param {boolean} params.isProc
   * @param {function} callback
   * @private
   */
  runOpcode : function(params, callback) {
    var me = this;
    //if (me.vm.debug) console.log("runOpcode", params);
    
    // Create Stack Frame
    var opcode = params.opcode;
    var frame = new RubyVM.Frame();
    frame.type = params.type || "method";
    frame.fileName = opcode[6];
    frame.invokeClass = params.invokeClass;
    frame.self = params.self;
    frame.methodName = params.methodName;
    frame.block = params.block;
    frame.parentFrame = params.parentFrame;
    frame.senderFrame = me.currentFrame;
    if (frame.type == "catch") {
      frame.dynamicFrame = params.parentFrame.dynamicFrame;
      frame.localVars = params.parentFrame.localVars;
    } else {
      frame.dynamicFrame = frame;
      frame.localVars = new Array(opcode[4].local_size + 1);
    }
    if (frame.type == "block" || frame.type == "catch") {
      frame.localFrame = params.parentFrame.localFrame;
      frame.cbase = params.parentFrame.cbase;
    } else {
      frame.localFrame = frame;
      frame.cbase = opcode.cbase || me.Object;
    }
    frame.stack = new Array(opcode[4].stack_max);
    frame.catchTable = opcode[10];
    
    var args = params.args ? params.args.concat([]) : [];
    var minArgc, labels, restIndex, blockIndex;
    if (typeof(opcode[9]) == "number") {
      minArgc = opcode[9];
      labels = [null];
      restIndex = blockIndex = -1;
    } else {
      minArgc = opcode[9][0];
      labels = opcode[9][1];
      if (labels.length == 0) labels.push(null);
      restIndex = opcode[9][4];
      blockIndex = opcode[9][5];
    }
    var maxArgc = minArgc + labels.length - 1;
    if (frame.type == "block" && args.length == 1 && me.kindOf(args[0], me.Array) && minArgc > 1) {
      // Splat array args
      var ary = args.pop();
      var size = me.arraySize(ary);
      for (var i = 0; i < size; ++i) {
        args.push(me.arrayAt(ary, i));
      }
    }
    if (frame.type == "method" &&
        (args.length < minArgc || (args.length > maxArgc && restIndex == -1))) {
      return me.raise(me.ArgumentError,
        "wrong number of arguments (" + args.length + " for " + minArgc + ")",
        callback);
    }
    // Copy args to localVars. Fill from last.
    var normalArgc = Math.min(args.length, maxArgc);
    for (var i = 0; i < normalArgc; i++) {
      frame.localVars[frame.localVars.length - 1 - i] = args[i];
    }
    if (restIndex != -1) {
      frame.localVars[frame.localVars.length - 1 - restIndex] =
        me.newArray(args.slice(normalArgc));
    }
    if (blockIndex != -1) {
      frame.localVars[frame.localVars.length - 1 - blockIndex] = params.block;
    }
    var startLabel = labels[normalArgc - minArgc];
    
    var prevFrame = me.currentFrame;
    me.currentFrame = frame;
    if (me.vm.topFrame == null) me.vm.topFrame = frame;
    
    // Run the mainLoop
    me.mainLoop(opcode[11], startLabel, function(res, ex) {
      
      me.currentFrame = prevFrame;
      
      if (ex) return callback(null, ex);
      
      // Copy the stack to the parent stack frame
      if (params.parentFrame != null) {
        for (var i = 0;i < frame.sp; i++) {
          params.parentFrame.stack[params.parentFrame.sp++] = frame.stack[i];
        }
      }
      if (frame == me.vm.topFrame && me.vm.endBlocks.length > 0) {
        // Runs END blocks.
        // TODO: Make it Proc so that end block can access local variables of
        //       the method it was specified.
        me.runOpcode({
          opcode: me.vm.endBlocks.pop(),
          invokeClass: me.Object,
          methodName: "<end block>",
          self: me.vm.topObject
        }, callback);
        return;
      }
      if (callback) callback(frame.sp > 0 ? frame.stack[0] : null);
      
    });
  },
  
  /**
   * Main loop for opcodes.
   * @param {Array} opcode
   * @param {RubyVM.Frame} frame
   * @private
   */
  mainLoop : function(opcode, startLabel, callback) {
    var me = this;

    // Create label to ip
    if (!("label2ip" in opcode)) {
      opcode.label2ip = {};
      for (var ip = 0;ip < opcode.length; ip++) {
        // If "cmd is a String then it is a jump label
        var cmd = opcode[ip];
        if (typeof(cmd) == "string") {
          opcode.label2ip[cmd] = ip;
          opcode[ip] = null;
        }
      }
    }
    
    var frame = me.currentFrame;
    var ip = startLabel ? opcode.label2ip[startLabel] : 0;
    
    me.loopAsync(
      
      function() { return ip < opcode.length; },
      function() { ++ip; },
      
      // Body of the loop
      function(bodyCallback) {
        if (frame.sp < 0) me.fatal("sp is negative");
        // Get the next command
        var cmd = opcode[ip];
        
        // if (me.vm.debug) console.log(["ip", ip].concat(cmd));
        // If "cmd" is a Number then it is the line number.
        if (typeof(cmd) == "number") frame.lineNo = cmd;
        
        // "cmd" must be an Array
        if (cmd != null && typeof(cmd) != "number" && cmd instanceof Array) {
          
          switch (cmd[0]) {
            case "jump" :
              ip = opcode.label2ip[cmd[1]];
              break;
            case "branchif" :
              var val = frame.stack[--frame.sp];
              if (me.toBoolean(val)) {
                ip = opcode.label2ip[cmd[1]];
              }
              break;
            case "branchunless" :
              var val = frame.stack[--frame.sp];
              if (!me.toBoolean(val)) {
                ip = opcode.label2ip[cmd[1]];
              }
              break;
            case "opt_case_dispatch":
              var v = frame.stack[--frame.sp];
              if (typeof(v) != "number") v = v.value;
              for(var i=0; i<cmd[1].length; i+=2) {
                if (v === cmd[1][i]) {
                  ip = opcode.label2ip[cmd[1][i+1]];
                  break;
                }
              }
              if (i == cmd[1].length) {
                ip = opcode.label2ip[cmd[2]];
              }
              break;
            case "leave" :
              ip = opcode.length;
              break;
            case "putnil" :
              frame.stack[frame.sp++] = null;
              break;
            case "putself" :
              frame.stack[frame.sp++] = frame.self;
              break;
            case "putobject" :
              var node = cmd[1];
              frame.stack[frame.sp++] = me.deserializeObject(node);
              break;
            case "putstring" :
              frame.stack[frame.sp++] = me.newString(cmd[1]);
              break;
            case "tostring" :
              if (me.classOf(frame.stack[frame.sp - 1]) != me.String) {
                me.sendAsync(frame.stack[frame.sp - 1], "to_s", [], null, function(res, ex) {
                  if (ex) return bodyCallback(null, ex);
                  frame.stack[frame.sp - 1] = res;
                  bodyCallback();
                });
                return;
              }
              break;
            case "concatstrings" :
              var str = "";
              for (var i = frame.sp - cmd[1]; i < frame.sp; ++i) {
                str += frame.stack[i].value;
              }
              frame.sp -= cmd[1];
              frame.stack[frame.sp++] = me.newString(str);
              break;
            case "newarray" :
              var value = me.newArray(frame.stack.slice(frame.sp - cmd[1], frame.sp));
              frame.sp -= cmd[1];
              frame.stack[frame.sp++] = value;
              break;
            case "duparray" :
              frame.stack[frame.sp++] = me.newArray(cmd[1]);
              break;
            case "expandarray" :
              var obj = frame.stack[--frame.sp];
              if (typeof(obj) == "object" && obj.rubyClass == me.Array) {
                for(var i = cmd[1] - 1; i >= 0; i--) {
                  frame.stack[frame.sp++] = me.arrayAt(obj, i);
                }
                if (cmd[2] && 1) {
                  // TODO
                }
                if (cmd[2] && 2) {
                  // TODO
                }
                if (cmd[2] && 4) {
                  // TODO
                }
              } else {
                frame.stack[frame.sp++] = obj;
                for (var i = 0;i < cmd[1] - 1; i++) {
                  frame.stack[frame.sp++] = null;
                }
              }
              break;
            case "splatarray" :
              var obj = frame.stack[--frame.sp];
              me.invokeMethodAndPush({
                receiver: me.InstructionHelper,
                methodName: "splat_array",
                args: [obj]
              }, bodyCallback);
              return;
            case "newhash" :
              var hash = me.newHash(frame.stack.slice(frame.sp - cmd[1], frame.sp));
              frame.sp -= cmd[1];
              frame.stack[frame.sp++] = hash;
              break;
            case "newrange" :
              var last = frame.stack[--frame.sp];
              var first = frame.stack[--frame.sp];
              var value = me.newRange(first, last, cmd[1]);
              frame.stack[frame.sp++] = value;
              break;
            case "setlocal" :
              frame.localFrame.localVars[cmd[1]] = frame.stack[--frame.sp];
              break;
            case "getlocal" :
              frame.stack[frame.sp++] = frame.localFrame.localVars[cmd[1]];
              break;
            case "setglobal" :
              me.vm.globalVars[cmd[1]] = frame.stack[--frame.sp];
              break;
            case "getglobal" :
              var val;
              if (cmd[1] == "$~") {
                val = frame.localFrame.data && frame.localFrame.data.last_match;
              } else if (cmd[1] == "$_") {
                val = frame.localFrame.data && frame.localFrame.data.last_read_line;
              } else {
                val = me.vm.globalVars[cmd[1]];
              }
              frame.stack[frame.sp++] = val;
              break;
            case "setconstant" :
              me.setConstant(frame.stack[--frame.sp], cmd[1], frame.stack[--frame.sp], frame);
              break;
            case "getconstant" :
              var value = me.getConstant(frame.stack[--frame.sp], cmd[1], frame);
              if (typeof(value) == "undefined") {
                return me.raise(me.NameError, "uninitialized constant " + cmd[1], bodyCallback);
              }
              frame.stack[frame.sp++] = value;
              break;
            case "setinstancevariable" :
              frame.self.instanceVars[cmd[1]] = frame.stack[--frame.sp];
              break;
            case "getinstancevariable" :
              frame.stack[frame.sp++] = frame.self.instanceVars[cmd[1]];
              break;
            case "setclassvariable" :
              // TODO: consider inheritance
              frame.cbase.classVars[cmd[1]] = frame.stack[--frame.sp];
              break;
            case "getclassvariable" :
              var searchClass = frame.cbase;
              while (true) {
                if (cmd[1] in searchClass.classVars) {
                  frame.stack[frame.sp++] = searchClass.classVars[cmd[1]];
                  break;
                }
                searchClass = searchClass.superClass;
                if (searchClass == null) {
                  return me.raise(me.NameError,
                    "uninitialized class variable " + cmd[1] + " in " + frame.cbase.name,
                    bodyCallback);
                }
              }
              break;
            case "getdynamic" :
              var lookupFrame = frame;
              for (var i = 0;i < cmd[2]; i++) {
                lookupFrame = lookupFrame.parentFrame;
              }
              frame.stack[frame.sp++] = lookupFrame.localVars[cmd[1]];
              break;
            case "setdynamic" :
              var lookupFrame = frame;
              for (var i = 0;i < cmd[2]; i++) {
                lookupFrame = lookupFrame.parentFrame;
              }
              lookupFrame.localVars[cmd[1]] = frame.stack[--frame.sp];
              break;
            case "getspecial" :
              var idx = cmd[1];
              var type = cmd[2];
              if (idx == 1 && (type == 77|| (type >= 2 && type <= 18 && type % 2 == 0))) {
                  // $&, $1, ...
                var lastMatch = frame.localFrame.data && frame.localFrame.data.last_match;
                var val;
                if (lastMatch) {
                  var n = (type == 77) ? 0 : type / 2;
                  val = me.sendSync(lastMatch, "[]", [n]);
                } else {
                  val = null;
                }
                frame.stack[frame.sp++] = val;
              } else {
                return me.raise(me.NotImplementedError,
                  "getspecial " + idx + "," + type + " not implemented", bodyCallback);
              }
              break;
            case "setspecial" :
              return me.raise(me.NotImplementedError,
                "setspecial not implemented", bodyCallback);
            case "pop" :
              frame.sp--;
              break;
            case "dup" :
              frame.stack[frame.sp] = frame.stack[frame.sp - 1];
              frame.sp++;
              break;
            case "dupn" :
              for (var i = 0;i < cmd[1]; i++) {
                frame.stack[frame.sp + i] = frame.stack[frame.sp + i - cmd[1]];
              }
              frame.sp += cmd[1];
              break;
            case "swap" :
              var tmp = frame.stack[frame.sp - 1];
              frame.stack[frame.sp - 1] = frame.stack[frame.sp - 2];
              frame.stack[frame.sp - 2] = tmp;
              break;
            case "topn" :
              frame.stack[frame.sp] = frame.stack[frame.sp - cmd[1] - 1];
              frame.sp++;
              break;
            case "setn" :
              frame.stack[frame.sp - cmd[1] - 1] = frame.stack[frame.sp - 1];
              break;
            case "emptstack" :
              frame.sp = 0;
              break;
            case "send" :
              var block = (cmd[4] & RubyVM.VM_CALL_ARGS_BLOCKARG_BIT) ?
                frame.stack[--frame.sp] : cmd[3];
              var args = frame.stack.slice(frame.sp - cmd[2], frame.sp);
              frame.sp -= cmd[2];
              var receiver = frame.stack[--frame.sp];
              if (cmd[4] & RubyVM.VM_CALL_FCALL_BIT) {
                receiver = frame.self;
              }
              if (block instanceof Array)
                block = me.newProc(block, frame);
              me.invokeMethodAndPush({
                receiver: receiver,
                methodName: cmd[1],
                args: args,
                block: block,
                type: cmd[4]
              }, bodyCallback);
              return;
            case "invokesuper" :
              var block = (cmd[3] & RubyVM.VM_CALL_ARGS_BLOCKARG_BIT) ?
                frame.stack[--frame.sp] : cmd[2];
              var args = frame.stack.slice(frame.sp - cmd[1], frame.sp);
              frame.sp -= cmd[1];
              // TODO When to use this autoPassAllArgs?
              var autoPassAllArgs = frame.stack[--frame.sp];
              if (block instanceof Array)
                block = me.newProc(block, frame);
              me.invokeMethodAndPush({
                receiver: frame.self,
                methodName: frame.methodName,
                args: args,
                block: block,
                type: cmd[3],
                super: true,
                klass: frame.invokeClass
              }, bodyCallback);
              return;
            case "invokeblock" :
              var args = frame.stack.slice(frame.sp - cmd[1], frame.sp);
              frame.sp -= cmd[1];
              if (!frame.localFrame.block) {
                return me.raise(me.LocalJumpError, "no block given (yield)", bodyCallback);
              }
              me.invokeMethodAndPush({
                receiver: frame.localFrame.block,
                methodName: "yield",
                args: args,
                type: cmd[2]
              }, bodyCallback);
              return;
            case "definemethod" :
              var obj = frame.stack[--frame.sp];
              var klass;
              if (obj == null) {
                klass = frame.cbase;
              } else {
                klass = me.getSingletonClass(obj);
              }
              klass.methods[cmd[1]] = cmd[2];
              cmd[2].cbase = frame.cbase;
              if (klass.scope == "module_function") {
                me.makeModuleFunction(klass, cmd[1]);
              }
              opcode[ip] = null;
              opcode[ip - 1] = null;
              break;
            case "defineclass" :
              var superClass = frame.stack[--frame.sp];
              var isRedefine = superClass === false;
              if (superClass == null)
                superClass = me.Object;
              var cbaseObj = frame.stack[--frame.sp];
              if (cmd[3] == 0 || cmd[3] == 2) {
                // Search predefined class
                var newClass = me.getConstant(frame.cbase, cmd[1]);
                if (typeof(newClass) == "undefined" || isRedefine) {
                  // Create class object
                  var newClass = new RubyClass(me, cmd[1], {
                    superClass: superClass,
                    upperClass: frame.cbase,
                    type: cmd[3] == 0 ? "class" : "module"
                  });
                }
                cmd[2].cbase = newClass;
                // Run the class definition
                me.runOpcode({
                  opcode: cmd[2],
                  invokeClass: newClass,
                  methodName: "<class:" + newClass.name + ">",
                  self: newClass,
                  parentFrame: frame
                }, bodyCallback);
                return;
              } else if (cmd[3] == 1) {
                // Object-Specific Classes
                if (cbaseObj == null || typeof(cbaseObj) != "object")
                  me.fatal("Not supported Object-Specific Classes on Primitive Object");
                var singletonClass = me.getSingletonClass(cbaseObj);
                cmd[2].cbase = singletonClass;
                // Run the class definition
                me.runOpcode({
                  opcode: cmd[2],
                  invokeClass: singletonClass,
                  methodName: "<singleton class>",
                  self: singletonClass,
                  parentFrame: frame
                }, bodyCallback);
                return;
              }
              break;
            case "postexe" :
              me.vm.endBlocks.push(cmd[1]);
              break;
            case "throw" :
              // See: vm_insnhelper.c: vm_throw()
              var val = frame.stack[--frame.sp];
              var throwObj;
              var state = cmd[1] & 0xff;
              var flag = cmd[1] & 0x8000;
              var level = cmd[1] >> 16;
              switch (state) {
                case 0:
                  throwObj = val;
                  break;
                case 1:
                  throwObj = me.newObject(me.ReturnException);
                  throwObj.value = val;
                  throwObj.targetFrame = frame.localFrame;
                  break;
                case 2:
                  if (frame.dynamicFrame.type != "block") me.fatal("unexpected break");
                  throwObj = me.newObject(me.BreakException);
                  throwObj.value = val;
                  throwObj.targetFrame = frame.dynamicFrame.parentFrame;
                  break;
                default:
                  me.fatal("Unknown throw state: " + cmd[1]);
                  break;
              }
              bodyCallback(null, throwObj);
              return;
            case "nop" :
              break;
            case "reput" :
              break;
            case "putcbase":
              // TODO: Not sure what it is. Pushes null for the meantime.
              frame.stack[frame.sp++] = null;
              break;
            default :
              me.fatal("[mainLoop] Unknown opcode : " + cmd[0]);
          }
        }
        bodyCallback();
      },
      
      // After the loop finished
      function(res, ex) {
        if (ex) {
          me.handleException(opcode, frame, ip, ex, 0, callback);
        } else {
          callback(res, ex);
        }
      }
      
    );
  },
  
  deserializeObject: function(node) {
    var me = this;
    if (typeof(node) == "object") {
      if (node.type == "symbol") {
        return me.intern(node.value);
      } else if (node.type == "regexp") {
        return me.newRegexp(node.source, node.options);
      } else if (node.type == "range") {
        return me.newRange(
          me.deserializeObject(node.begin), me.deserializeObject(node.end), node.exclude_end);
      } else if (node.type == "constant") {
        return me.getConstant(me.Object, node.name);
      } else {
        me.fatal("Unknown type for putobject: " + node.type);
      }
    } else if (typeof(node) == "string") {
      return me.newString(node);
    } else {
      return node;
    }
  },
  
  handleException: function(opcode, frame, ip, ex, catchIndex, callback) {
    //console.log(["handleException", ex, catchIndex]);
    var me = this;
    var deferred = false;
    frame.localVars[1] = ex; // $!
      // TODO: Looks like it is not always 1.
    for (var i = catchIndex; !deferred && i < frame.catchTable.length; ++i) {
      (function() {
        var catchType = frame.catchTable[i][0];
        var catchOpcode = frame.catchTable[i][1];
        var start = opcode.label2ip[frame.catchTable[i][2]];
        var end = opcode.label2ip[frame.catchTable[i][3]];
        var contLabel = frame.catchTable[i][4];
        var nextIndex = i + 1;
        if (catchType == "rescue" && ip >= start && ip < end) {
          if (me.vm.debug) console.log(["catch table -> ", nextIndex - 1, ex]);
          me.runOpcode({
            opcode: catchOpcode,
            invokeClass: frame.invokeClass,
            methodName: frame.methodName,
            self: frame.self,
            parentFrame: frame,
            type: "catch"
          }, function(res, ex) {
            if (me.vm.debug) console.log(["catch table <- ", nextIndex - 1, ex]);
            if (ex) {
              me.handleException(opcode, frame, ip, ex, nextIndex, callback);
            } else {
              me.mainLoop(opcode, contLabel, callback);
            }
          });
          deferred = true;
        } else {
          // TODO: not implemented
        }
      })();
    }
    if (deferred) return;
    if (me.classOf(ex) == me.ReturnException && ex.targetFrame == frame) {
      frame.stack[frame.sp++] = ex.value;
      callback();
    } else {
      callback(null, ex);
    }
  },
  
  invokeMethodAndPush: function(params, callback) {
    var me = this;
    var frame = me.currentFrame;
    me.invokeMethod(params, function(res, ex) {
      if (ex) {
        if (me.classOf(ex) == me.BreakException && ex.targetFrame == frame) {
          res = ex.value;
        } else {
          return callback(null, ex);
        }
      }
      frame.stack[frame.sp++] = res;
      callback(res);
    });
  },
  
  /**
   * Invoke the method
   * @param {RubyObject} params.receiver
   * @param {String} params.methodName
   * @param {Array} params.args
   * @param {RubyObject} params.block
   * @param {Number} params.type VM_CALL_ARGS_SPLAT_BIT, ...
   * @param {boolean} params.super
   * @param {boolean} params.klass Base point class used for super
   * @param {function} callback
   */
  invokeMethod : function(params, callback) {
    var me = this;
    var receiverClass = me.classOf(params.receiver);
    
    if (me.vm.debug) {
      console.log("invokeMethod ->",
        params.receiver, params.methodName, params.args, params.block, params.super);
      var origCallback = callback;
      callback = function(res, ex) {
        if (ex) {
          console.log("invokeMethod <- exception", ex);
          return origCallback(null, ex);
        }
        console.log("invokeMethod <-", res);
        origCallback(res);
      }
    }

    var args = params.args.concat([]);
    if (params.type & RubyVM.VM_CALL_ARGS_SPLAT_BIT) {
      // Splat array args
      var last = args.pop();
      var size = me.arraySize(last);
      for (var i = 0; i < size; ++i) {
        args.push(me.arrayAt(last, i));
      }
    }
    
    // Invokes host method if appropriate
    var res = me.invokeNative(params.receiver, params.methodName, args, receiverClass);
    if (res) return callback(res.result);
    
    if (!receiverClass) {
      return me.raise(me.ArgumentError, "self is not a Ruby object", callback);
    }
    
    // Searches for invokeClass and func
    var singletonClass = params.receiver != null ? params.receiver.singletonClass : null;
    var searchClass = singletonClass || receiverClass;
    var invokeClass;
    var func = null;
    var skip = params.super;
    me.eachAncestor(searchClass, function(c) {
      if (!skip) {
        invokeClass = c;
        func = c.methods[params.methodName];
        if (func) return func;
      }
      if (params.super && c == params.klass) skip = false;
    });
    if (func == null) {
      if (params.methodName != "method_missing") {
        var newArgs = [me.intern(params.methodName)].concat(args);
        me.invokeMethod({
          receiver: params.receiver,
          methodName: "method_missing",
          args: newArgs,
          block: params.block
        }, callback);
        return;
      } else {
        me.fatal("This must not happen");
      }
    }
    
    // Invokes method
    switch (typeof(func)) {
      case "function" :
        if (func.async) {
          func.call(me, me, params.receiver, args, params.block, function(res, ex) {
            if (ex) return callback(null, ex);
            callback(me.toRuby(res));
          });
          return;
        } else {
          var res = func.call(me, me, params.receiver, args, params.block);
          callback(me.toRuby(res));
        }
        break;
      case "object" :
        me.runOpcode({
          opcode: func,
          invokeClass: invokeClass,
          methodName: params.methodName,
          self: params.receiver,
          args: args,
          block: params.block
        }, callback);
        return;
      default :
        me.fatal("[invokeMethod] Unknown function type : " + typeof(func));
    }
    
  },
  
  respondTo: function(receiver, methodName) {
    var me = this;
    var singletonClass = receiver != null ? receiver.singletonClass : null;
    var searchClass = singletonClass || me.classOf(receiver);
    var func = null;
    me.eachAncestor(searchClass, function(c) {
      func = c.methods[methodName];
      if (func) return true;
    });
    return func != null;
  },
  
  /**
   * Invoke native routine
   */
  invokeNative: function(receiver, methodName, args, receiverClass) {
    var me = this;
    var res;
    switch(receiverClass) {
      case me.NativeEnvironment:
        res = me.getNativeEnvVar(receiver, methodName, args);
        break;
      case me.NativeObject:
        res = me.invokeNativeMethod(receiver, methodName, args);
        break;
      case me.NativeClass:
        if (methodName == "new") {
          res = me.invokeNativeNew(receiver, methodName, args);
        } else {
          res = me.invokeNativeMethod(receiver, methodName, args);
        }
        break;
      default:
        return null;
    }
    return {result: res};
  },
  
  /**
   * Get variable from NativeEnvironment
   */
  getNativeEnvVar: function(receiver, varName, args) {
    var me = this;
    //trace(varName);
    if (me.vm.env == "flash" && varName == "import") {
      var imp = args[0].value;
      if (imp.charAt(imp.length - 1) != "*")
        me.fatal("[getNativeEnvVar] Param must ends with * : " + imp);
      me.vm.asPackages.push(imp.substr(0, imp.length - 1));
      return null;
    }
    
    if (varName in receiver.instanceVars) {
      return receiver.instanceVars[varName];
    }
    
    if (me.vm.env == "browser" || me.vm.env == "console") {
      // Get native global variable
      var v = eval("(" + varName + ")");
      if (typeof(v) != "undefined") {
        if (args.length > 0) {
          var convArgs = me.arrayRubyToNative(args);
          var ret = v.apply(null, convArgs);
          return me.toRuby(ret);
        } else {
          var obj = me.newObject(me.NativeObject);
          obj.value = v;
          return obj;
        }
      }
    } else if (me.vm.env == "flash") {
      // Get NativeClass Object
      var klass;
      if (varName in me.vm.nativeClassObjCache) {
        klass = me.vm.nativeClassObjCache[varName];
      } else {
        for(var i=0; i<me.vm.asPackages.length; i++) {
          try {
            klass = getDefinitionByName(me.vm.asPackages[i] + varName);
            break;
          } catch(e) {
          }
        }
        if (klass == null) {
          me.fatal("[getNativeEnvVar] Cannot find class: " + varName);
        }
        me.vm.nativeClassObjCache[varName] = klass;
      }
      return {
        className : "NativeClass",
        value : klass
      }
    }
    
    me.fatal("[getNativeEnvVar] Cannot get the value variable: " + varName);
  },
  
  /**
   * Invoke value method or get value instance variable
   */
  invokeNativeMethod: function(receiver, methodName, args) {
    var me = this;
    // Split methodName and operator
    var op = me.getOperator(methodName);
    if (op != null) {
      methodName = methodName.substr(0, methodName.length - op.length);
    }
    
    var ret;
    if (typeof(receiver.value[methodName]) == "function") {
      // Invoke native method
      if (op != null)
        me.fatal("[invokeNativeMethod] Unsupported operator: " + op);
      var convArgs = me.arrayRubyToNative(args);
      ret = receiver.value[methodName].apply(receiver.value, convArgs);
    } else {
      // Get native instance variable
      if (op == null) {
        ret = receiver.value[methodName];
      } else {
        switch(op) {
          case "=": 
            ret = receiver.value[methodName] = me.toNative(args[0]);
            break;
          default:
            me.fatal("[invokeNativeMethod] Unsupported operator: " + op);
        }
      }
    }
    return me.toRuby(ret);
  },
  
  /**
   * Invoke native "new", and create value instance.
   */
  invokeNativeNew: function(receiver, methodName, args) {
    var me = this;
    var obj;
    var args = me.arrayRubyToNative(args);
    switch(args.length) {
      case 0: obj = new receiver.value(); break; 
      case 1: obj = new receiver.value(args[0]); break; 
      case 2: obj = new receiver.value(args[0], args[1]); break; 
      case 3: obj = new receiver.value(args[0], args[1], args[2]); break; 
      case 4: obj = new receiver.value(args[0], args[1], args[2], args[3]); break; 
      case 5: obj = new receiver.value(args[0], args[1], args[2], args[3], args[4]); break; 
      case 6: obj = new receiver.value(args[0], args[1], args[2], args[3], args[4], args[5]); break;
      case 7: obj = new receiver.value(args[0], args[1], args[2], args[3], args[4], args[5], args[6]); break;
      case 8: obj = new receiver.value(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]); break;
      case 9: obj = new receiver.value(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]); break;
      default: me.fatal("[invokeNativeNew] Too much arguments: " + args.length);
    }
    var result = me.newObject(me.NativeObject);
    result.value = obj;
    return result;
  },
  
  /**
   * Set the Constant
   * @param {Object} klass
   * @param {String} constName
   * @param constValue
   * @param {RubyVM.Frame} frame
   * @private
   */
  setConstant : function(klass, constName, constValue, frame) {
    var me = this;
    if (klass == null) {
      klass = frame.cbase;
    } else if (klass === false) {
      // TODO
      me.fatal("[setConstant] Not implemented");
    }
    klass.constants[constName] = constValue;
  },
  
  /**
   * Get the constant
   * @param {Object} klass
   * @param {String} constName
   * @param {RubyVM.Frame} frame
   * @private
   */
  getConstant : function(klass, constName, frame) {
    var me = this;
    if (klass == null) {
      var isFound = false;
      // Search cbase and its parents
      for (klass = frame.cbase; klass; ) {
        if (constName in klass.constants) {
          isFound = true;
          break;
        }
        klass = klass.upperClass;
      }
      // Search super classes
      if (!isFound) {
        for (klass = frame.invokeClass; klass && klass != me.Object; ) {
          if (constName in klass.constants) {
            isFound = true;
            break;
          }
          klass = klass.superClass;
        }
      }
    }
    if (klass && constName in klass.constants) {
      var res = klass.constants[constName];
      return res == null ? null : res; // Converts undefined to null
    } else {
      return; // Returns undefined
    }
  },
  
  // imported from rb_include_module()
  includeModule: function(klass, module) {
    var me = this;
    var modules = module.included.concat([module]);
    var pos = klass.included.length;
    for (var i = modules.length - 1; i >= 0; --i) {
      superClassSeen = false;
      // TODO: cyclic check
      skip = false;
      for (var p = klass; p && !skip; p = p.superClass) {
        for (var j = 0; j < p.included.length; ++j) {
          if (p.included[j] == modules[i]) {
            if (p == klass) pos = j;
            skip = true;
            break;
          }
        }
      }
      if (skip) continue;
      klass.included =
        klass.included.slice(0, pos).concat([modules[i]], klass.included.slice(pos));
    }
  },
  
  /**
   * Search <script type="text/ruby"></script> and run.
   * @param {String} url Ruby compiler url
   */
  runFromScriptTag : function(url) {
    var me = this;
    var ary = document.getElementsByTagName("script");
    for (var i=0; i < ary.length; i++) {
      var hoge = ary[i].type;
      if (ary[i].type == "text/ruby") {
        me.compileAndRun({script: ary[i].text});
        break;
      }
    }
  },
  
  getOperator: function(str) {
    var me = this;
    var result = str.match(/[^\+\-\*\/%=]+([\+\-\*\/%]?=)/);
    if (result == null || result == false) {
      return null;
    }
    if (result instanceof Array) {
      return result[1];
    } else {
      RegExp.$1;
    }
  },
  
  sendAsync: function(receiver, methodName, args, block, callback) {
    var me = this;
    if (typeof(callback) == "undefined") {
      if (typeof(block) == "undefined") {
        callback = args;
        args = [];
      } else {
        callback = block;
        block = null;
      }
    }
    me.invokeMethod({
      receiver: receiver,
      methodName: methodName,
      args: args,
      block: block
    }, callback);
  },
  
  sendSync: function(receiver, methodName, args, block) {
    var me = this;
    var done = false;
    var result;
    me.invokeMethod({
      receiver: receiver,
      methodName: methodName,
      args: args,
      block: block
    }, function(res, ex) {
      if (ex) {
        // TODO: throw instead
        console.error("Exception in sendSync: ", ex);
        me.fatal("Exception in sendSync");
      } else {
        done = true;
        result = res;
      }
    });
    if (!done) me.fatal("Async call inside sendSync");
    return result;
  },
  
  /**
   * Returns class of the object.
   * @param obj
   * @return {RubyClass}
   */
  classOf : function(obj) {
    var me = this;
    if (obj == null)
      return me.NilClass;
    switch (typeof(obj)) {
      case "object" :
        return obj.rubyClass;
      case "number" :
        // TODO: Cannot distinguish 1 and 1.0. Fix it later.
        return Math.floor(obj) == obj ? me.Fixnum : me.Float;
      case "boolean" :
        return obj ? me.TrueClass : me.FalseClass;
      default :
        me.fatal("[classOf] unknown type : " + typeof(obj));
    }
  },
  
  getSingletonClass: function(obj) {
    var me = this;
    if (obj != null && obj.rubyClass) {
      if (!obj.singletonClass) {
        obj.singletonClass = new RubyClass(me, null, {
          superClass: obj.rubyClass,
          type: "singleton"
        });
      }
      return obj.singletonClass;
    } else {
      me.fatal("Cannot define singleton method for: " + obj.toString());
    }
  },
  
  eachAncestor: function(klass, block) {
    var me = this;
    var res;
    while (klass) {
      if (typeof(res = block(klass)) != "undefined") return res;
      var included = klass.included;
      for (var i = included.length - 1; i >= 0; --i) {
        if (typeof(res = block(included[i])) != "undefined") return res;
      }
      klass = klass.superClass;
    }
  },
  
  kindOf: function(obj, klass) {
    var me = this;
    var res = me.eachAncestor(me.classOf(obj), function(c) {
      if (c == klass) return true;
    });
    return res || false;
  },
  
  defineClass: function(className, params) {
    var me = this;
    params = params || {};
    params.type = "class";
    return new RubyClass(me, className, params);
  },
  
  defineModule: function(className, params) {
    var me = this;
    params = params || {};
    params.type = "module";
    return new RubyClass(me, className, params);
  },
  
  defineMethod: function(klass, name, options, func) {
    var me = this;
    if (!func) {
      func = options;
      options = {};
    }
    func.async = options.async;
    klass.methods[name] = func;
  },
  
  defineSingletonMethod: function(obj, name, options, func) {
    var me = this;
    me.defineMethod(me.getSingletonClass(obj), name, options, func);
  },
  
  defineClassMethod: function(klass, name, options, func) {
    var me = this;
    me.defineSingletonMethod(klass, name, options, func);
  },
  
  aliasMethod: function(klass, newName, originalName) {
    var me = this;
    klass.methods[newName] = klass.methods[originalName];
  },
  
  makeModuleFunction: function(klass, name) {
    var me = this;
    // TODO: make it private
    me.getSingletonClass(klass).methods[name] = klass.methods[name];
  },
  
  getInstanceVar: function(receiver, name) {
    var me = this;
    return receiver.instanceVars[name];
  },
  
  setInstanceVar: function(receiver, name, value) {
    var me = this;
    receiver.instanceVars[name] = value;
  },
  
  /**
   * Convert ruby object to native value
   * @param v ruby object
   */
  toNative: function(v) {
    var me = this;
    if (v == null || typeof(v) != "object") {
      return v;
    } else if (v.rubyClass == me.Proc) {
      var func = function() {
        var proc = arguments.callee.proc;
        var result;
        me.runOpcode({
          opcode: proc.opcode,
          invokeClass: proc.parentFrame.invokeClass,
          methodName: proc.parentFrame.methodName,
          self: proc.parentFrame.self,
          args: me.arrayNativeToRuby(arguments),
          parentFrame: proc.parentFrame,
          type: "block"
        }, function(res, ex) {
          if (ex) throw ex;
          result = res;
        });
        return result;
      };
      func.proc = v;
      return func;
    } else if (v.rubyClass == me.Array) {
      return v.instanceVars["@tuple"].value.map(function(e) {
        return me.toNative(e);
      });
    } else if (v.rubyClass == me.Hash) {
      var keys = me.sendSync(v, "keys", []);
      var numKeys = me.arraySize(keys);
      var hash = {};
      for (var i = 0; i < numKeys; ++i) {
        var key = me.arrayAt(keys, i);
        if (me.classOf(key) != me.String) me.fatal("Key must be String");
        hash[me.toNative(key)] = me.toNative(me.sendSync(v, "get_key_cv", [key]));
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
    var me = this;
    var convAry = new Array(ary.length);
    for(var i=0; i<ary.length; i++) {
      convAry[i] = me.toNative(ary[i]);
    }
    return convAry;
  },
  
  /**
   * Convert native object to ruby object
   * @param v native object
   */
  toRuby: function(v) {
    var me = this;
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
      return me.newString(v);
    }
    if (typeof(v) == "object" && v instanceof Array) {
      var ary = new Array(v.length);
      for (var i = 0; i < v.length; ++i) {
        ary[i] = me.toRuby(v[i]);
      }
      return me.newArray(ary);
    }
    var obj = me.newObject(me.NativeObject);
    obj.value = v;
    return obj;
  },
  
  /**
   * Convert array of native object to array of ruby object
   * @param {Array} ary Array of native object
   */
  arrayNativeToRuby: function(ary) {
    var me = this;
    var convAry = new Array(ary.length);
    for(var i=0; i<ary.length; i++) {
      convAry[i] = me.toRuby(ary[i]);
    }
    return convAry;
  },
  
  newObject: function(klass) {
    var me = this;
    return new RubyObject(me, klass);
  },
  
  /**
   * JavaScript String -> Ruby String
   * @param {String} str
   * @return {String}
   */
  newString : function(str) {
    var me = this;
    var obj = me.newObject(me.String);
    obj.value = str;
    return obj;
  },
  
  newRegexp : function(source, options) {
    var me = this;
    var exp = me.newObject(me.Regexp);
    exp.source = source;
    exp.opts = options;
    // Javascript "m" option allows "a\nb" matches /^b/, which is default in Ruby.
    var flags = "mg";
    if (exp.opts & me.Regexp.constants.IGNORECASE) flags += "i";
    exp.exp = new RegExp(source, flags);
    return exp;
  },
  
  /**
   * opcode -> Ruby Proc
   * @param {Array} opcode
   * @param {RubyVM.Frame} frame
   * @return {Object} Proc
   */
  newProc : function(opcode, frame) {
    var me = this;
    var obj = me.newObject(me.Proc);
    obj.opcode = opcode;
    obj.parentFrame = frame;
    return obj;
  },
  
  newTuple : function(ary) {
    var me = this;
    ary = ary || [];
    var tuple = me.newObject(me.Tuple);
    tuple.value = ary;
    return tuple;
  },
  
  /**
   * JavaScript Array -> Ruby Array
   * @param {Array} ary
   * @return {RubyObject}
   */
  newArray : function(ary) {
    var me = this;
    ary = ary || [];
    var tuple = me.newObject(me.Tuple);
    tuple.value = ary;
    var obj = me.newObject(me.Array);
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
  newHash : function(ary) {
    var me = this;
    var hash = me.newObject(me.Hash);
    me.sendSync(hash, "initialize", []);
    for (var i = 0;i < ary.length; i += 2) {
      me.sendSync(hash, "set_key_cv", [ary[i], ary[i + 1]]);
    }
    return hash;
  },
  
  /**
   * Creates Ruby Range
   * @param {Number} last
   * @param {Number} first
   * @param {boolean} exclude_end
   */
  newRange : function(first, last, exclude_end) {
    var me = this;
    var obj = me.newObject(me.Range);
    obj.instanceVars = {
      "@begin": first,
      "@end": last,
      "@excl": exclude_end
    };
    return obj;
  },
  
  intern: function(str) {
    var me = this;
    // TODO: should be Symbol instead of String
    return me.newString(str);
  },
  
  /**
   * Returns true for objects which are evaluated as true in if-statement etc. in Ruby.
   */
  toBoolean: function(val) {
    var me = this;
    return val !== false && val != null;
  },
  
  arrayAt: function(rary, index) {
    var me = this;
    return rary.instanceVars["@tuple"].value[index];
  },
  
  arraySize: function(rary) {
    var me = this;
    return rary.instanceVars["@total"];
  },
  
  hashGet: function(rhash, key) {
    var me = this;
    return me.sendSync(rhash, "get_key_cv", [key]);
  },
  
  hashKeys: function(rhash) {
    var me = this;
    var rkeys = me.sendSync(rhash, "keys", []);
    var keys = new Array(me.arraySize(rkeys));
    for (var i = 0; i < keys.length; ++i) {
      keys[i] = me.arrayAt(rkeys, i);
    }
    return keys;
  },
  
  callProc: function(proc, args, block, callback) {
    var me = this;
    me.runOpcode({
      opcode: proc.opcode,
      invokeClass: proc.parentFrame.invokeClass,
      methodName: proc.parentFrame.methodName,
      self: proc.parentFrame.self,
      args: args,
      block: block,
      parentFrame: proc.parentFrame,
      type: "block"
    }, function(res, ex) {
        if (ex) return callback(null, ex);
        var frame = proc.parentFrame;
        callback(frame.stack[--frame.sp]);
      }
    );
  },
  
  getGlobalVar: function(name) {
    var me = this;
    return me.vm.globalVars[name];
  },
  
  setGlobalVar: function(name, value) {
    var me = this;
    me.vm.globalVars[name] = value;
  },
  
  raise: function(klass, message, callback) {
    var me = this;
    var ex = me.newObject(klass || me.Exception);
    me.setInstanceVar(ex, "@message", me.toRuby(message));
    me.setInstanceVar(ex, "@backtrace", me.newArray());
    callback(null, ex);
  },
  
  blockGiven: function() {
    var me = this;
    return me.currentFrame.localFrame.block != null;
  },
  
  // Async version of for (; cond(); increment()) { body(); }
  loopAsync: function(cond, increment, body, callback) {
    var me = this;
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
            me.loopAsync(cond, increment, body, callback);
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
   * Prints to console.
   * @param {String} str
   */
  printToConsole : function(str) {
    var me = this;
    switch(me.vm.env) {
      case "browser":
        var out = me.vm.consoleElement;
        if (out) {
          str = str.replace(/ /g, "\u00a0"); // " " -> "&nbsp;"
          str.split(/(\n)/).each(function(piece) {
            var node = piece == "\n" ? document.createElement("br") : document.createTextNode(piece);
            out.appendChild(node);
          });
        } else {
          console.log(str);
        }
        break;
      case "flash":
        RubyVM.debugTextField.text += str;
        break;
      case "console":
        print(str);
        break;
      default:
        me.fatal("Unknown env");
        break;
    }
  },

  fatal: function(message) {
    var me = this;
    console.error(message);
    me.printToConsole(message + "\n");
    Aborted.aborted;
  },
  
  toString: function() {
    return "RubyContext";
  }

};

// Consts
/** @memberof RubyVM */
RubyVM.VM_CALL_ARGS_SPLAT_BIT = 2;
/** @memberof RubyVM */
RubyVM.VM_CALL_ARGS_BLOCKARG_BIT = 4;
/** @memberof RubyVM */
RubyVM.VM_CALL_FCALL_BIT = 8;
/** @memberof RubyVM */
RubyVM.VM_CALL_VCALL_BIT = 16;

/**
 * Stack frame
 * @class
 * @construtor
 */

/*
  e.g.
    
    def hoge()
      # frame1
      yield()
    end
    
    def foo()
      # frame2
      hoge() do
        # frame3
        begin
          raise "foo"
        rescue
          # frame4
        end
      end
    end
    
    frame1.type = "method"
    frame2.type = "method"
    frame3.type = "block"
    frame4.type = "catch"
    
    frame4.senderFrame = frame3
    frame3.senderFrame = frame1
    frame1.senderFrame = frame2
    
    frame4.parentFrame = frame3
    frame3.parentFrame = frame2
    
    frame1.localFrame = frame1
    frame2.localFrame = frame2
    frame3.localFrame = frame2
    frame4.localFrame = frame2
    
    frame1.dynamicFrame = frame1
    frame2.dynamicFrame = frame2
    frame3.dynamicFrame = frame3
    frame4.dynamicFrame = frame3
*/
RubyVM.Frame = function() {
  /** 
   * Stack Pointer
   * @type Number 
   */
  this.sp = 0;
  /** 
   * Local Variables
   * @type Array 
   */
  this.localVars = [];
  /** 
   * Stack 
   * @type Array 
   */
  this.stack = [];
  /** 
   * Current class to define methods
   * @type Object 
   */
  this.cbase = null;
  /** 
   * Current method name
   * @type String 
   */
  this.methodName = "";
  /** 
   * Current line no
   * @type Number 
   */
  this.lineNo = 0;
  /** 
   * File name
   * @type String 
   */
  this.fileName = "";
  /** 
   * self
   * @type Object 
   */
  this.self = null;
  /** 
   * Stack frame of scope enclosing this.
   * Valid for block and catch frame. null for others.
   * @type RubyVM.Frame 
   */
  this.parentFrame = null;
  /** 
   * Stack frame which has invoked this.
   * @type RubyVM.Frame 
   */
  this.senderFrame = null;
  /** 
   * Stack frame of method which the frame belongs to. lfp in CRuby.
   * @type RubyVM.Frame 
   */
  this.localFrame = null;
  /** 
   * Stack frame of most inner block which the frame belongs to. dfp in CRuby.
   * @type RubyVM.Frame 
   */
  this.dynamicFrame = null;
  /** 
   * Type of stack frame (method, block, catch)
   * @type string
   */
  this.type = null;
};

RubyVM.Frame.prototype = {
  
  toString: function() {
    var me = this;
    return "RubyVM.Frame:" + me.type + " " + me.methodName + " in " + me.fileName + ":" + me.lineNo;
  }
  
};
