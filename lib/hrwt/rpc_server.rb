require "hrwt/rpc_base"


module Publishable
    
    def published(*names)
      public(*names)
      if !names.empty?
        @published ||= Set.new()
        @published.merge(names)
      else
        @publishing = true
      end
    end
    
    def published?(name)
      return @published.include?(name.to_sym)
    end
    
    def private(*args)
      super(*args)
      @publishing = false if args.empty?
    end
    
    def protected(*args)
      super(*args)
      @publishing = false if args.empty?
    end
    
    def public(*args)
      super(*args)
      @publishing = false if args.empty?
    end
    
=begin
    # Below doesn't work in Ruby 1.9 because of Ruby bug (super calls itself).
    %w(private protected public).each() do |name|
      define_method(name) do |*args|
        super(*args)
        @publishing = false if args.empty?
      end
    end
=end
    
    def method_added(name)
      super(name) if defined?(super)
      published(name) if @publishing
    end
    
end


class RPCServer
    
    include(RPCHelper)
    
    def initialize()
      @public_objs = {"root" => self}
    end
    
    def handle_request(req, res)
      res["Content-Type"] = "text/javascript"
      req_json = req.query["req"]
      puts("--> #{req_json}")
      res_json = process(JSON.parse(req_json)).to_json()
      puts("<-- #{res_json}")
      res.body = res_json
    end
    
    def process(req)
      receiver = rep_to_obj(req["receiver"])
      method = req["method"]
      params = req["params"].map(){ |r| rep_to_obj(r) }
      if !receiver.class.respond_to?(:published?) || !receiver.class.published?(method)
        raise("Unpublished method")
      end
      result = receiver.__send__(method, *params)
      return {"result" => obj_to_rep(result)}
    end
    
    def local_obj_to_rep(obj)
      @public_objs[obj.object_id] = obj
      return {"id" => obj.object_id, "class" => obj.class.inspect}
    end
    
    def reference_rep_to_obj(rep)
      obj = @public_objs[rep["id"]]
      raise("Object not published") if !obj
      return obj
    end
    
    def start()
      @server.start()
    end
    
end


if $0 == __FILE__
  
  class Hoge < RPCServer
    
    extend(Publishable)
    
    published
      
      def run_puts(str)
        Kernel.puts(str)
        return str
      end
      
      def test(obj)
        p obj
        return {"a" => [1, true], "b" => 2}
      end
      
  end
  
  case ARGV[0]
    when "hoge"
      server = Hoge.new(12006)
      server.start()
    when "test"
      class Foo
        extend(Publishable)
          def a
          end
        published
          def b
          end
          def c
          end
        public
          def d
          end
        p @published
      end
    else
      raise("unknown mode")
  end
  
end
