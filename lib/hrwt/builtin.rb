old_debug = JS.debug
JS.debug = false


module Kernel
    
    alias_method(:sleep, :__sleep__)
    module_function(:sleep)
    
    alias_method(:proc, :__proc__)
    module_function(:proc)
    
    # TODO: support advanced usage
    alias_method(:raise, :__raise__)
    module_function(:proc)
    
end


$stdout = IO.new()
$stderr = IO.new()


JS.debug = old_debug
