// The license of this source is "Ruby License"

RubyVM.addInitializer(function(ctx) {

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

});
