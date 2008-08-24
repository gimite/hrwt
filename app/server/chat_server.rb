require "hrwt/rpc_server"


class ChatServer < RPCServer
  
  extend(Publishable)
    
    def initialize(*args)
      super
      @messages = []
      post("System", "Chat server has started.")
    end
    
  published
    
    def recent_messages(n)
      n = [n, @messages.size].min
      return @messages[-n..-1]
    end
    
    def post(author, body)
      @messages.push({"author" => author, "body" => body})
    end
    
end
