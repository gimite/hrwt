old_debug = JS.debug
JS.debug = false

require "rubygems"
require "mechanize"
require "hrwt/js"
require "hrwt/rpc_base"


class RPCClient
    
    include(RPCHelper)
    
    def initialize(uri)
      @uri = uri
    end
    
    def root
      return RemoteObject.new(self, "root", nil)
    end
    
    def remote_obj_to_rep(obj)
      return {"id" => obj.id}
    end
    
    def reference_rep_to_obj(rep)
      return RemoteObject.new(self, rep["id"], rep["class"])
    end
    
    def send(receiver, method, params)
      request = {
        "receiver" => obj_to_rep(receiver),
        "method" => method.to_s(),
        "params" => params.map(){ |o| obj_to_rep(o) },
      }
      response = JSON.parse(http_post(@uri, {"req" => JSON.unparse(request)}))
      return rep_to_obj(response["result"])
    end
    
    def http_post(uri, params)
      if JS
        JS.http_request("POST", uri, params)
      else
        @agent ||= WWW::Mechanize.new()
        @agent.post(uri, params).body
      end
    end
    
    def inspect
      return "#<%p:%s>" % [self.class, @uri]
    end
    
end

JS.debug = old_debug
