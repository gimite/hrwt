old_debug = JS.debug
JS.debug = false


module Kernel
    
    alias_method(:sleep, :__sleep__)
    module_function(:sleep)
    
    alias_method(:proc, :__proc__)
    module_function(:proc)
    
    alias_method(:block_given?, :__block_given__)
    module_function(:block_given?)
    
    # TODO: support advanced usage
    alias_method(:raise, :__raise__)
    module_function(:proc)
    
end


# Dummy implementation
module RecursionGuard
    
    def self.inspecting?(obj)
      return false
    end

    def self.inspect(obj, &block)
      yield
    end

end


$stdout = IO.new()
$stderr = IO.new()


JS.debug = old_debug
