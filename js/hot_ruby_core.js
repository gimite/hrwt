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

var RubyObject = function(classObj) {
  if (!classObj) Ruby.fatal("classObj is missing");
  this.rubyClass = classObj;
  this.instanceVars = {};
};

RubyObject.prototype = {
  toString: function() {
    return "RubyObject:" + this.rubyClass.name;
  }
};

var RubyModule = function(className, params) {
  this.type = params.type || "module";
  this.rubyClass = this.type == "module" ? Ruby.Module : Ruby.Class;
  this.superClass = this.type == "module" ? null : (params.superClass || Ruby.Object || null);
  this.methods = params.instanceMethods || {};
  this.constants = params.constants || {};
  this.classVars = params.classVars || {};
  this.instanceVars = params.instanceVars || {};
  this.included = params.included || [];
  if (this.type != "singleton") {
    this.singletonClass = new RubyModule(null, {
      superClass: this.superClass ? this.superClass.singletonClass : this.rubyClass,
      type: "singleton",
      instanceMethods: params.classMethods || {}
    });
  }
  if (this.type != "singleton" && className && Ruby.Object) {
    this.upperModule = params.upperModule || Ruby.Object;
    this.upperModule.constants[className] = this;
    if (this.upperModule == Ruby.Object) {
      this.name = className;
      if (!Ruby[className]) Ruby[className] = this;
    } else {
      this.name = this.upperModule.name ? this.upperModule.name + "::" + className : null;
    }
  } else {
    this.name = className;
  }
};

RubyModule.prototype = {
  toString: function() {
    return "RubyModule:" + this.name;
  }
};

/**
 * RubyVM
 * @class
 * @construtor
 */
var RubyVM = function() {
  this.compilerUrl = "compile";
  /** 
   * Global Variables
   * @type Object 
   */
  this.globalVars = {
    "$native": new RubyObject(Ruby.NativeEnviornment)
  };
  /** 
   * END blocks
   * @type Array 
   */
  this.endBlocks = [];
  /**
   * Running Enviornment
   * @type String
   */
  this.env = "browser";
  this.topObject = new RubyObject(Ruby.Object);
  this.topSF = null;
  
  this.loaded = false;
  this.onLoaded = [];
  
  this.checkEnv();
};

/**
 * StackFrame
 * @class
 * @construtor
 */
RubyVM.StackFrame = function() {
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
   * StackFrame of scope enclosing this.
   * Valid for block and catch frame. null for others.
   * @type RubyVM.StackFrame 
   */
  this.parentStackFrame = null;
  /** 
   * StackFrame which has invoked this.
   * null if it has invoked from native (JavaScript) method.
   * @type RubyVM.StackFrame 
   */
  this.callerStackFrame = null;
  /** 
   * Is Proc(Block)
   * @type boolean 
   */
  this.isProc = false;
};

RubyVM.prototype = {
  /**
   * Run the script.
    * @param {Array} opcode
   */
  run : function(opcode, callback) {
    this.runOpcode(
      opcode, Ruby.Object, "<main>", this.topObject, [], null, null, null, false, callback);
  },
  
  /**
   * Run the opcode.
   * @param {Array} opcode
   * @param {Object} classObj
   * @param {String} methodName
   * @param {Object} self
   * @param {Array} args
   * @param {RubyVM.StackFrame} parentSF Parent StackFrame
   * @param {boolean} isProc
   * @private
   */
  runOpcode : function(
      opcode, invokeClass, methodName, self, args, block, parentSF, callerSF, isProc, callback) {
    var me = this;
    if (me.debug) console.log(["runOpcode", invokeClass, methodName, self, args, block]);
    
    // Create Stack Frame
    var sf = new RubyVM.StackFrame();
    sf.fileName = opcode[6];
    sf.invokeClass = invokeClass;
    sf.methodName = methodName;
    sf.self = self;
    sf.parentStackFrame = parentSF;
    sf.callerStackFrame = callerSF;
    sf.isProc = isProc;
    sf.isCatch = opcode[7] == "rescue";
    sf.block = block;
    sf.localVars = sf.isCatch ? parentSF.localVars : new Array(opcode[4].local_size + 1);
    sf.cbase = (sf.isProc || sf.isCatch) ? parentSF.cbase : (opcode.cbase || Ruby.Object);
    sf.stack = new Array(opcode[4].stack_max);
    sf.catchTable = opcode[10];
    
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
    if (!isProc && (args.length < minArgc || (args.length > maxArgc && restIndex == -1))) {
      return Ruby.raise(Ruby.ArgumentError,
        "wrong number of arguments (" + args.length + " for " + minArgc + ")",
        callback);
    }
    // Copy args to localVars. Fill from last.
    var normalArgc = Math.min(args.length, maxArgc);
    for (var i = 0; i < normalArgc; i++) {
      sf.localVars[sf.localVars.length - 1 - i] = args[i];
    }
    if (restIndex != -1) {
      sf.localVars[sf.localVars.length - 1 - restIndex] = Ruby.newRubyArray(args.slice(normalArgc));
    }
    if (blockIndex != -1) {
      sf.localVars[sf.localVars.length - 1 - blockIndex] = block;
    }
    var startLabel = labels[normalArgc - minArgc];
    
    var prevSF = me.latestStackFrame;
    me.latestStackFrame = sf;
    if(me.topSF == null) me.topSF = sf;
    
    // Run the mainLoop
    me.mainLoop(opcode[11], sf, startLabel, function(res, ex) {
      
      me.latestStackFrame = prevSF;
      
      if (ex) return callback(null, ex);
      
      // Copy the stack to the parent stack frame
      if (parentSF != null) {
        for (var i = 0;i < sf.sp; i++) {
          parentSF.stack[parentSF.sp++] = sf.stack[i];
        }
      }
      if (sf == me.topSF && me.endBlocks.length > 0) {
        // Run END blocks
        me.run(me.endBlocks.pop(), callback);
        return;
      }
      if (callback) callback(sf.sp > 0 ? sf.stack[0] : null);
      
    });
  },
  
  /**
   * Main loop for opcodes.
   * @param {Array} opcode
   * @param {RubyVM.StackFrame} sf
   * @private
   */
  mainLoop : function(opcode, sf, startLabel, callback) {
    //console.log(["mainLoop", callback]);
    var me = this;
    // Create label to ip
    if(!("label2ip" in opcode)) {
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
    
    var ip = startLabel ? opcode.label2ip[startLabel] : 0;
    
    Ruby.loopAsync(
      
      function() { return ip < opcode.length; },
      function() { ++ip; },
      
      // Body of the loop
      function(bodyCallback) {
        if (sf.sp < 0) Ruby.fatal("sp is negative");
        // Get the next command
        var cmd = opcode[ip];
        
        if (me.debug) console.log(["ip", ip].concat(cmd));
        // If "cmd" is a Number then it is the line number.
        if (typeof(cmd) == "number") sf.lineNo = cmd;
        
        // "cmd" must be an Array
        if (cmd != null && typeof(cmd) != "number" && cmd instanceof Array) {
          
          //trace("cmd = " + cmd[0] + ", sp = " + sf.sp);
          switch (cmd[0]) {
            case "jump" :
              ip = opcode.label2ip[cmd[1]];
              break;
            case "branchif" :
              var val = sf.stack[--sf.sp];
              if(Ruby.toBoolean(val)) {
                ip = opcode.label2ip[cmd[1]];
              }
              break;
            case "branchunless" :
              var val = sf.stack[--sf.sp];
              if(!Ruby.toBoolean(val)) {
                ip = opcode.label2ip[cmd[1]];
              }
              break;
            case "opt_case_dispatch":
              var v = sf.stack[--sf.sp];
              if(typeof(v) != "number") v = v.value;
              for(var i=0; i<cmd[1].length; i+=2) {
                if(v === cmd[1][i]) {
                  ip = opcode.label2ip[cmd[1][i+1]];
                  break;
                }
              }
              if(i == cmd[1].length) {
                ip = opcode.label2ip[cmd[2]];
              }
              break;
            case "leave" :
              ip = opcode.length;
              break;
            case "putnil" :
              sf.stack[sf.sp++] = null;
              break;
            case "putself" :
              sf.stack[sf.sp++] = sf.self;
              break;
            case "putobject" :
              var node = cmd[1];
              sf.stack[sf.sp++] = me.deserializeObject(node, sf);
              break;
            case "putstring" :
              sf.stack[sf.sp++] = Ruby.newRubyString(cmd[1]);
              break;
            case "tostring" :
              if (Ruby.getClass(sf.stack[sf.sp - 1]) != Ruby.String) {
                Ruby.sendAsync(sf.stack[sf.sp - 1], "to_s", [], null, function(res, ex) {
                  if (ex) return bodyCallback(null, ex);
                  sf.stack[sf.sp - 1] = res;
                  bodyCallback();
                });
                return;
              }
              break;
            case "concatstrings" :
              var str = "";
              for (var i = sf.sp - cmd[1]; i < sf.sp; ++i) {
                str += sf.stack[i].value;
              }
              sf.sp -= cmd[1];
              sf.stack[sf.sp++] = Ruby.newRubyString(str);
              break;
            case "newarray" :
              var value = Ruby.newRubyArray(sf.stack.slice(sf.sp - cmd[1], sf.sp));
              sf.sp -= cmd[1];
              sf.stack[sf.sp++] = value;
              break;
            case "duparray" :
              sf.stack[sf.sp++] = Ruby.newRubyArray(cmd[1]);
              break;
            case "expandarray" :
              var obj = sf.stack[--sf.sp];
              if(typeof(obj) == "object" && obj.rubyClass == Ruby.Array) {
                for(var i = cmd[1] - 1; i >= 0; i--) {
                  sf.stack[sf.sp++] = Ruby.arrayAt(obj, i);
                }
                if(cmd[2] && 1) {
                  // TODO
                }
                if(cmd[2] && 2) {
                  // TODO
                }
                if(cmd[2] && 4) {
                  // TODO
                }
              } else {
                sf.stack[sf.sp++] = obj;
                for (var i = 0;i < cmd[1] - 1; i++) {
                  sf.stack[sf.sp++] = null;
                }
              }
              break;
            case "splatarray" :
              var obj = sf.stack[--sf.sp];
              me.invokeMethodAndPush(
                Ruby.InstructionHelper, "splat_array", [obj], null, sf, 0, false, null, bodyCallback);
              return;
            case "newhash" :
              var hash = Ruby.newRubyHash(sf.stack.slice(sf.sp - cmd[1], sf.sp));
              sf.sp -= cmd[1];
              sf.stack[sf.sp++] = hash;
              break;
            case "newrange" :
              var last = sf.stack[--sf.sp];
              var first = sf.stack[--sf.sp];
              var value = Ruby.newRubyRange(first, last, cmd[1]);
              sf.stack[sf.sp++] = value;
              break;
            case "setlocal" :
              me.getLocalStackFrame(sf).localVars[cmd[1]] = sf.stack[--sf.sp];
              break;
            case "getlocal" :
              sf.stack[sf.sp++] = me.getLocalStackFrame(sf).localVars[cmd[1]];
              break;
            case "setglobal" :
              me.globalVars[cmd[1]] = sf.stack[--sf.sp];
              break;
            case "getglobal" :
              var val;
              if (cmd[1] == "$~") {
                var lsf = me.getLocalStackFrame(sf);
                val = lsf.data && lsf.data.last_match;
              } else {
                val = me.globalVars[cmd[1]];
              }
              sf.stack[sf.sp++] = val;
              break;
            case "setconstant" :
              me.setConstant(sf, sf.stack[--sf.sp], cmd[1], sf.stack[--sf.sp]);
              break;
            case "getconstant" :
              var value = me.getConstant(sf, sf.stack[--sf.sp], cmd[1]);
              if (typeof(value) == "undefined") {
                return Ruby.raise(Ruby.NameError, "uninitialized constant " + cmd[1], bodyCallback);
              }
              sf.stack[sf.sp++] = value;
              break;
            case "setinstancevariable" :
              sf.self.instanceVars[cmd[1]] = sf.stack[--sf.sp];
              break;
            case "getinstancevariable" :
              sf.stack[sf.sp++] = sf.self.instanceVars[cmd[1]];
              break;
            case "setclassvariable" :
              // TODO: consider inheritance
              sf.cbase.classVars[cmd[1]] = sf.stack[--sf.sp];
              break;
            case "getclassvariable" :
              var searchClass = sf.cbase;
              while (true) {
                if (cmd[1] in searchClass.classVars) {
                  sf.stack[sf.sp++] = searchClass.classVars[cmd[1]];
                  break;
                }
                searchClass = searchClass.superClass;
                if (searchClass == null) {
                  return Ruby.raise(Ruby.NameError,
                    "uninitialized class variable " + cmd[1] + " in " + sf.cbase.name,
                    bodyCallback);
                }
              }
              break;
            case "getdynamic" :
              var lookupSF = sf;
              for (var i = 0;i < cmd[2]; i++) {
                lookupSF = lookupSF.parentStackFrame;
              }
              sf.stack[sf.sp++] = lookupSF.localVars[cmd[1]];
              break;
            case "setdynamic" :
              var lookupSF = sf;
              for (var i = 0;i < cmd[2]; i++) {
                lookupSF = lookupSF.parentStackFrame;
              }
              lookupSF.localVars[cmd[1]] = sf.stack[--sf.sp];
              break;
            case "getspecial" :
              var idx = cmd[1];
              var type = cmd[2];
              if (idx == 1 && (type == 77|| (type >= 2 && type <= 18 && type % 2 == 0))) {
                  // $&, $1, ...
                var lsf = me.getLocalStackFrame(sf);
                var lastMatch = lsf.data && lsf.data.last_match;
                var val;
                if (lastMatch) {
                  var n = (type == 77) ? 0 : type / 2;
                  val = Ruby.sendSync(lastMatch, "[]", [n]);
                } else {
                  val = null;
                }
                sf.stack[sf.sp++] = val;
              } else {
                Ruby.raise(Ruby.NotImplementedError,
                  "getspecial " + idx + "," + type + " not implemented", bodyCallback);
              }
              break;
    //        case "setspecial" :
    //          break;
            case "pop" :
              sf.sp--;
              break;
            case "dup" :
              sf.stack[sf.sp] = sf.stack[sf.sp - 1];
              sf.sp++;
              break;
            case "dupn" :
              for (var i = 0;i < cmd[1]; i++) {
                sf.stack[sf.sp + i] = sf.stack[sf.sp + i - cmd[1]];
              }
              sf.sp += cmd[1];
              break;
            case "swap" :
              var tmp = sf.stack[sf.sp - 1];
              sf.stack[sf.sp - 1] = sf.stack[sf.sp - 2];
              sf.stack[sf.sp - 2] = tmp;
              break;
            case "topn" :
              sf.stack[sf.sp] = sf.stack[sf.sp - cmd[1] - 1];
              sf.sp++;
              break;
            case "setn" :
              sf.stack[sf.sp - cmd[1] - 1] = sf.stack[sf.sp - 1];
              break;
            case "emptstack" :
              sf.sp = 0;
              break;
            case "send" :
              var block = (cmd[4] & RubyVM.VM_CALL_ARGS_BLOCKARG_BIT) ? sf.stack[--sf.sp] : cmd[3];
              var args = sf.stack.slice(sf.sp - cmd[2], sf.sp);
              sf.sp -= cmd[2];
              var receiver = sf.stack[--sf.sp];
              if (cmd[4] & RubyVM.VM_CALL_FCALL_BIT) {
                receiver = sf.self;
              }
              if (block instanceof Array)
                block = Ruby.newRubyProc(block, sf);
              me.invokeMethodAndPush(
                receiver, cmd[1], args, block, sf, cmd[4], false, null, bodyCallback);
              return;
            case "invokesuper" :
              var block = (cmd[3] & RubyVM.VM_CALL_ARGS_BLOCKARG_BIT) ? sf.stack[--sf.sp] : cmd[2];
              var args = sf.stack.slice(sf.sp - cmd[1], sf.sp);
              sf.sp -= cmd[1];
              // TODO When to use this autoPassAllArgs?
              var autoPassAllArgs = sf.stack[--sf.sp];
              if (block instanceof Array)
                block = Ruby.newRubyProc(block, sf);
              me.invokeMethodAndPush(
                sf.self, sf.methodName, args, block, sf, cmd[3], true, sf.invokeClass, bodyCallback);
              return;
            case "invokeblock" :
              var args = sf.stack.slice(sf.sp - cmd[1], sf.sp);
              sf.sp -= cmd[1];
              var localSF = me.getLocalStackFrame(sf);
              if (!localSF.block) {
                return Ruby.raise(Ruby.LocalJumpError, "no block given (yield)", bodyCallback);
              }
              me.invokeMethodAndPush(
                localSF.block, "yield", args, null, sf, cmd[2], false, null, bodyCallback);
              return;
            case "definemethod" :
              var obj = sf.stack[--sf.sp];
              var classObj;
              if (obj == null) {
                classObj = sf.cbase;
              } else {
                classObj = Ruby.getSingletonClass(obj);
              }
              classObj.methods[cmd[1]] = cmd[2];
              cmd[2].cbase = sf.cbase;
              if (classObj.scope == "module_function") {
                Ruby.makeModuleFunction(classObj, cmd[1]);
              }
              opcode[ip] = null;
              opcode[ip - 1] = null;
              break;
            case "defineclass" :
              var superClass = sf.stack[--sf.sp];
              var isRedefine = superClass === false;
              if(superClass == null)
                superClass = Ruby.Object;
              var cbaseObj = sf.stack[--sf.sp];
              if(cmd[3] == 0 || cmd[3] == 2) {
                // Search predefined class
                var newClass = me.getConstant(sf, sf.cbase, cmd[1]);
                if(typeof(newClass) == "undefined" || isRedefine) {
                  // Create class object
                  var newClass = new RubyModule(cmd[1], {
                    superClass: superClass,
                    upperModule: sf.cbase,
                    type: cmd[3] == 0 ? "class" : "module"
                  });
                }
                cmd[2].cbase = newClass;
                // Run the class definition
                me.runOpcode(
                  cmd[2], newClass, "<class:" + newClass.name + ">", newClass,
                  [], null, sf, sf, false, bodyCallback);
                return;
              } else if(cmd[3] == 1) {
                // Object-Specific Classes
                if(cbaseObj == null || typeof(cbaseObj) != "object")
                  Ruby.fatal("Not supported Object-Specific Classes on Primitive Object");
                var singletonClass = Ruby.getSingletonClass(cbaseObj);
                cmd[2].cbase = singletonClass;
                // Run the class definition
                me.runOpcode(
                  cmd[2], singletonClass, null, singletonClass, [], null, sf, sf, false, bodyCallback);
                return;
              }
              break;
            case "postexe" :
              me.endBlocks.push(cmd[1]);
              break;
            case "throw" :
              // See: vm_insnhelper.c: vm_throw()
              var val = sf.stack[--sf.sp];
              var throwObj;
              var state = cmd[1] & 0xff;
              var flag = cmd[1] & 0x8000;
              var level = cmd[1] >> 16;
              switch (state) {
                case 0:
                  throwObj = val;
                  break;
                case 1:
                  throwObj = new RubyObject(Ruby.ReturnException);
                  throwObj.value = val;
                  throwObj.targetStackFrame = me.getLocalStackFrame(sf);
                  break;
                case 2:
                  var dsf = sf;
                  while (dsf.isCatch) dsf = sf.parentStackFrame;
                  if (!dsf.isProc) Ruby.fatal("unexpected break");
                  throwObj = new RubyObject(Ruby.BreakException);
                  throwObj.value = val;
                  throwObj.targetStackFrame = dsf.parentStackFrame;
                  break;
                default:
                  Ruby.fatal("Unknown throw state: " + cmd[1]);
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
              sf.stack[sf.sp++] = null;
              break;
            default :
              Ruby.fatal("[mainLoop] Unknown opcode : " + cmd[0]);
          }
        }
        bodyCallback();
      },
      
      // After the loop finished
      function(res, ex) {
        if (ex) {
          me.handleException(opcode, sf, ip, ex, 0, callback);
        } else {
          callback(res, ex);
        }
      }
      
    );
  },
  
  deserializeObject: function(node, sf) {
    if (typeof(node) == "object") {
      if (node.type == "symbol") {
        return Ruby.intern(node.value);
      } else if (node.type == "regexp") {
        return Ruby.newRubyRegexp(node.source, node.options);
      } else if (node.type == "range") {
        return Ruby.newRubyRange(
          this.deserializeObject(node.begin), this.deserializeObject(node.end), node.exclude_end);
      } else if (node.type == "constant") {
        return this.getConstant(sf, null, node.name);
      } else {
        Ruby.fatal("Unknown type for putobject: " + node.type);
      }
    } else if (typeof(node) == "string") {
      return Ruby.newRubyString(node);
    } else {
      return node;
    }
  },
  
  handleException: function(opcode, sf, ip, ex, catchIndex, callback) {
    //console.log(["handleException", ex, catchIndex]);
    var me = this;
    var deferred = false;
    if (catchIndex == 0) {
      var trace = Ruby.getInstanceVar(ex, "@backtrace");
      if (trace) {
        var line = sf.fileName + ":" + sf.lineNo + ":in `" + sf.methodName + "'";
        Ruby.sendSync(trace, "push", [Ruby.newRubyString(line)]);
      } else {
        trace = Ruby.newRubyArray();
        Ruby.setInstanceVar(ex, "@backtrace", trace);
      }
    }
    sf.localVars[1] = ex; // $!
      // TODO: Looks like it is not always 1.
    for (var i = catchIndex; !deferred && i < sf.catchTable.length; ++i) {
      (function() {
        var catchType = sf.catchTable[i][0];
        var catchOpcode = sf.catchTable[i][1];
        var start = opcode.label2ip[sf.catchTable[i][2]];
        var end = opcode.label2ip[sf.catchTable[i][3]];
        var contLabel = sf.catchTable[i][4];
        var nextIndex = i + 1;
        if (catchType == "rescue" && ip >= start && ip < end) {
          if (me.debug) console.log(["catch table -> ", nextIndex - 1, ex]);
          me.runOpcode(catchOpcode, sf.invokeClass, sf.methodName, sf.self, [], null, sf, sf, false,
            function(res, ex) {
              if (me.debug) console.log(["catch table <- ", nextIndex - 1, ex]);
              if (ex) {
                me.handleException(opcode, sf, ip, ex, nextIndex, callback);
              } else {
                me.mainLoop(opcode, sf, contLabel, callback);
              }
            }
          );
          deferred = true;
        } else {
          // TODO: not implemented
        }
      })();
    }
    if (deferred) return;
    if (Ruby.getClass(ex) == Ruby.ReturnException && ex.targetStackFrame == sf) {
      sf.stack[sf.sp++] = ex.value;
      callback();
    } else {
      callback(null, ex);
    }
  },
  
  invokeMethodAndPush: function(
        receiver, methodName, args, block, sf, type, invokeSuper, classObj, callback) {
    this.invokeMethod(
          receiver, methodName, args, block, sf, type, invokeSuper, classObj, function(res, ex) {
      if (ex) {
        if (Ruby.getClass(ex) == Ruby.BreakException && ex.targetStackFrame == sf) {
          res = ex.value;
        } else {
          return callback(null, ex);
        }
      }
      sf.stack[sf.sp++] = res;
      //console.log("stack: ", sf, sf.stack.slice(0, sf.sp), sf.sp);
      callback(res);
    });
  },
  
  /**
   * Invoke the method
   * @param {RubyModule} classObj
   * @param {RubyObject} receiver
   * @param {String} methodName
   * @param {Array} args
   * @param {RubyObject} block
   * @param {RubyVM.StackFrame} sf
   * @param {Number} type VM_CALL_ARGS_SPLAT_BIT, ...
   * @param {boolean} invokeSuper
   * @param {function} callback
   */
  invokeMethod : function(
        receiver, methodName, args, block, sf, type, invokeSuper, classObj, callback) {
    var me = this;
    var receiverClass = Ruby.getClass(receiver);
    var invokeClass = receiverClass;
    var invokeMethodName = methodName;
    var func = null;
    
    if (me.debug) {
      console.log(["invokeMethod ->", receiver, methodName, args, block, type, invokeSuper]);
      var origCallback = callback;
      callback = function(res, ex) {
        if (ex) {
          console.log(["invokeMethod <- exception", ex]);
          return origCallback(null, ex);
        }
        console.log(["invokeMethod <-", res]);
        origCallback(res);
      }
    }

    // Invoke host method
    var res = me.invokeNative(receiver, methodName, args, receiverClass);
    if (res) {
      callback(res.result);
      return;
    }
    
    if (!receiverClass) {
      return Ruby.raise(Ruby.ArgumentError, "self is not a Ruby object", callback);
    }
    
    var singletonClass = receiver != null ? receiver.singletonClass : null;
    var searchClass = singletonClass || receiverClass;
    
    var skip = invokeSuper;
    Ruby.eachAncestor(searchClass, function(c) {
      if (!skip) {
        invokeClass = c;
        func = c.methods[methodName];
        if (func) return func;
      }
      if (invokeSuper && c == classObj) skip = false;
    });
    if (func == null) {
      if (methodName != "method_missing") {
        var newArgs = [Ruby.intern(methodName)].concat(args);
        me.invokeMethod(
          receiver, "method_missing", newArgs, block, sf, type, false, null, callback);
        return;
      } else {
        Ruby.fatal("This must not happen");
      }
    }
    
    // Splat array args
    if (type & RubyVM.VM_CALL_ARGS_SPLAT_BIT) {
      var last = args.pop();
      var size = Ruby.arraySize(last);
      for (var i = 0; i < size; ++i) {
        args.push(Ruby.arrayAt(last, i));
      }
    }
    
    // Exec method
    switch (typeof(func)) {
      case "function" :
        if (func.async) {
          func.call(me, receiver, args, block, function(res, ex) {
            if (ex) return callback(null, ex);
            callback(Ruby.toRuby(res));
          });
          return;
        } else {
          var res = func.call(me, receiver, args, block);
          callback(Ruby.toRuby(res));
        }
        break;
      case "object" :
        me.runOpcode(func, invokeClass,
            invokeMethodName, receiver, args, block, null, sf, false, callback);
        return;
      default :
        Ruby.fatal("[invokeMethod] Unknown function type : " + typeof(func));
    }
    
  },
  
  respondTo: function(receiver, methodName) {
    var singletonClass = receiver != null ? receiver.singletonClass : null;
    var searchClass = singletonClass || Ruby.getClass(receiver);
    var func = null;
    Ruby.eachAncestor(searchClass, function(c) {
      func = c.methods[methodName];
      if (func) return true;
    });
    return func != null;
  },
  
  /**
   * Invoke native routine
   */
  invokeNative: function(receiver, methodName, args, receiverClass) {
    var res;
    switch(receiverClass) {
      case Ruby.NativeEnviornment:
        res = this.getNativeEnvVar(receiver, methodName, args);
        break;
      case Ruby.NativeObject:
        res = this.invokeNativeMethod(receiver, methodName, args);
        break;
      case Ruby.NativeClass:
        if(methodName == "new") {
          res = this.invokeNativeNew(receiver, methodName, args);
        } else {
          res = this.invokeNativeMethod(receiver, methodName, args);
        }
        break;
      default:
        return null;
    }
    return {result: res};
  },
  
  /**
   * Get variable from NativeEnviornment
   */
  getNativeEnvVar: function(receiver, varName, args) {
    //trace(varName);
    if(this.env == "flash" && varName == "import") {
      var imp = args[0].value;
      if(imp.charAt(imp.length - 1) != "*")
        Ruby.fatal("[getNativeEnvVar] Param must ends with * : " + imp);
      this.asPackages.push(imp.substr(0, imp.length - 1));
      return null;
    }
    
    if(varName in receiver.instanceVars) {
      return receiver.instanceVars[varName];
    }
    
    if(this.env == "browser" || this.env == "console") {
      // Get native global variable
      var v = eval("(" + varName + ")");
      if (typeof(v) != "undefined") {
        if (args.length > 0) {
          var convArgs = Ruby.arrayRubyToNative(args);
          var ret = v.apply(null, convArgs);
          return Ruby.toRuby(ret);
        } else {
          var obj = new RubyObject(Ruby.NativeObject);
          obj.value = v;
          return obj;
        }
      }
    } else if(this.env == "flash") {
      // Get NativeClass Object
      var classObj;
      if(varName in this.nativeClassObjCache) {
        classObj = this.nativeClassObjCache[varName];
      } else {
        for(var i=0; i<this.asPackages.length; i++) {
          try {
            classObj = getDefinitionByName(this.asPackages[i] + varName);
            break;
          } catch(e) {
          }
        }
        if(classObj == null) {
          Ruby.fatal("[getNativeEnvVar] Cannot find class: " + varName);
        }
        this.nativeClassObjCache[varName] = classObj;
      }
      return {
        className : "NativeClass",
        value : classObj
      }
    }
    
    Ruby.fatal("[getNativeEnvVar] Cannot get the value variable: " + varName);
  },
  
  /**
   * Invoke value method or get value instance variable
   */
  invokeNativeMethod: function(receiver, methodName, args) {
    // Split methodName and operator
    var op = this.getOperator(methodName);
    if(op != null) {
      methodName = methodName.substr(0, methodName.length - op.length);
    }
    
    var ret;
    if (typeof(receiver.value[methodName]) == "function") {
      // Invoke native method
      if(op != null)
        Ruby.fatal("[invokeNativeMethod] Unsupported operator: " + op);
      var convArgs = Ruby.arrayRubyToNative(args);
      ret = receiver.value[methodName].apply(receiver.value, convArgs);
    } else {
      // Get native instance variable
      if(op == null) {
        ret = receiver.value[methodName];
      } else {
        switch(op) {
          case "=": 
            ret = receiver.value[methodName] = Ruby.toNative(args[0]);
            break;
          default:
            Ruby.fatal("[invokeNativeMethod] Unsupported operator: " + op);
        }
      }
    }
    return Ruby.toRuby(ret);
  },
  
  /**
   * Invoke native "new", and create value instance.
   */
  invokeNativeNew: function(receiver, methodName, args) {
    var obj;
    var args = Ruby.arrayRubyToNative(args);
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
      default: Ruby.fatal("[invokeNativeNew] Too much arguments: " + args.length);
    }
    var result = new RubyObject(Ruby.NativeObject);
    result.value = obj;
    return result;
  },
  
  /**
   * Set the Constant
   * @param {RubyVM.StackFrame} sf
   * @param {Object} classObj
   * @param {String} constName
   * @param constValue
   * @private
   */
  setConstant : function(sf, classObj, constName, constValue) {
    if (classObj == null) {
      classObj = sf.cbase;
    } else if (classObj === false) {
      // TODO
      Ruby.fatal("[setConstant] Not implemented");
    }
    classObj.constants[constName] = constValue;
  },
  
  /**
   * Get the constant
   * @param {RubyVM.StackFrame} sf
   * @param {Object} classObj
   * @param {String} constName
   * @return constant value
   * @private
   */
  getConstant : function(sf, classObj, constName) {
    if (classObj == null) {
      var isFound = false;
      // Search cbase and its parents
      for (classObj = sf.cbase; classObj; ) {
        if (constName in classObj.constants) {
          isFound = true;
          break;
        }
        classObj = classObj.upperModule;
      }
      // Search super classes
      if (!isFound) {
        for (classObj = sf.invokeClass; classObj && classObj != Ruby.Object; ) {
          if (constName in classObj.constants) {
            isFound = true;
            break;
          }
          classObj = classObj.superClass;
        }
      }
    }
    if (classObj && constName in classObj.constants) {
      var res = classObj.constants[constName];
      return res == null ? null : res; // Converts undefined to null
    } else {
      return; // Returns undefined
    }
  },
  
  getLocalStackFrame: function(sf) {
    while (sf.isProc || sf.isCatch) {
      sf = sf.parentStackFrame;
    }
    return sf;
  },
  
  includeModule: function(klass, module) {
    // imported from rb_include_module()
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
    var ary = document.getElementsByTagName("script");
    for(var i=0; i < ary.length; i++) {
      var hoge = ary[i].type;
      if(ary[i].type == "text/ruby") {
        this.compileAndRun({src: ary[i].text});
        break;
      }
    }
  },
  
  /**
   * Send the source to server and run.
   * @param {String} url Ruby compiler url
   * @param {src} Ruby source
   */
  compileAndRun : function(source, callback) {
    var me = this;
    var url;
    var params = {};
    if (source == "builtin") {
      url = "iseq/builtin";
    } else if (source.url) {
      url = source.url;
    } else if (source.src) {
      url = me.compilerUrl;
      params["src"] = source.src;
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
            if(response.responseText.length == 0) {
              alert("Compile failed");
            } else {
              var opcodes = eval("(" + response.responseText + ")");
              if (!me.loaded && source != "builtin") {
                // Waits until builtin classes are loaded.
                me.onLoaded.push(function() {
                  me.runOpcodes(opcodes, callback);
                });
              } else {
                me.runOpcodes(opcodes, callback);
              }
            }
          } catch (ex) {
            console.error(ex);
          }
        },
        onFailure: function(response) {
          alert("Compile failed");
        }
      }
    );
  },
  
  runOpcodes: function(opcodes, callback) {
    var me = this;
    var i = 0;
    Ruby.loopAsync(
      function() { return i < opcodes.length; },
      function() { ++i; },
      function(bodyCallback) {
        me.run(opcodes[i], function(res, ex) {
          if (ex) {
            console.error("Error: ", ex);
            Ruby.sendSync(Ruby.Kernel, "__print_exception__", [ex]);
            if (callback) callback(null, ex);
          } else {
            bodyCallback();
          }
        })
      },
      function() {
        console.log("Done");
        if (callback) callback();
      }
    );
  },
  
  /**
   * Check whether the environment is Flash, Browser or Console (SpiderMonkey or Rhino).
   */
  checkEnv : function() {
    if (typeof(_root) != "undefined") {
      this.env = "flash";
      // Create debug text field
      RubyVM.debugTextField = new TextField();
      RubyVM.debugTextField.autoSize = TextFieldAutoSize.LEFT;
      _root.addChild(RubyVM.debugTextField);
      // Define alert
      alert = function(str) {
        RubyVM.debugTextField.text += str + "\n";
      }
      this.nativeClassObjCache = {};
      this.asPackages = [""];
      // Create _root NativeObject
      var obj = new RubyObject(Ruby.NativeObject);
      obj.value = _root;
      this.globalVars.$native.instanceVars._root = obj;
    } else if (typeof(window) != "undefined") {
      this.env = "browser";
    } else if (typeof(print) != "undefined") {
      this.env = "console";
      // Define alert
      alert = function(str) {
        print(str);
      }
    } else {
      Ruby.fatal("Unknown environment");
    }
  },
  
  getOperator: function(str) {
    var result = str.match(/[^\+\-\*\/%=]+([\+\-\*\/%]?=)/);
    if(result == null || result == false) {
      return null;
    }
    if(result instanceof Array) {
      return result[1];
    } else {
      RegExp.$1;
    }
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
