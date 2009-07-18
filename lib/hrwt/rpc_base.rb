if RUBY_PLATFORM == "javascript-hotruby"
  old_debug = JS.debug
  JS.debug = false
end

require "rubygems"
require "webrick"
require "json"
require "set"


class RemoteObject
    
    def initialize(client, id, class_name)
      @client = client
      @id = id
      @class_name = class_name
    end
    
    def method_missing(name, *args)
      return @client.send(self, name, args)
    end
    
    #attr_reader(:client, :id)
    
    def client
      return @client
    end
    
    def id
      return @id
    end
    
end


module RPCHelper
  
  module_function
    
    def obj_to_rep(obj)
      case obj
        when RemoteObject
          return remote_obj_to_rep(obj)
        when NilClass, TrueClass, FalseClass, Integer, Float, String
          return obj
        when Array
          return obj.map(){ |o| obj_to_rep(o) }
        when Hash
          return {
            "class" => "Hash",
            "value" => obj.map(){ |k, v| [obj_to_rep(k), obj_to_rep(v)] }
          }
        else
          return local_obj_to_rep(obj)
      end
    end
    
    def rep_to_obj(rep)
      case rep
        when Hash
          if rep["id"]
            return reference_rep_to_obj(rep)
          elsif rep["class"] == "Hash"
            obj = {}
            for k, v in rep["value"]
              obj[k] = v
            end
            return obj
          else
            raise("Unimplemented")
          end
        when Array
          return rep.map(){ |r| rep_to_obj(r) }
        else
          return rep
      end
    end
    
end


JS.debug = old_debug if RUBY_PLATFORM == "javascript-hotruby"
