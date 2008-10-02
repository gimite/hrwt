old_debug = JS.debug
JS.debug = false


module Kernel
    
    alias_method(:sleep, :__sleep__)
    module_function(:sleep)
    
    alias_method(:proc, :__proc__)
    module_function(:proc)
    
    alias_method(:block_given?, :__block_given__)
    module_function(:block_given?)
    
    # Based on Kernel#raise in lib/core/kernel.rb
    def raise(exc=Undefined, msg=nil, trace=nil)
      skip = false
      if exc.equal? Undefined
        exc = $!
        if exc
          skip = true
        else
          exc = RuntimeError.new("No current exception")
        end
      elsif exc.respond_to? :exception
        exc = exc.exception msg
        raise ::TypeError, 'exception class/object expected' unless exc.kind_of?(::Exception)
        exc.set_backtrace trace if trace
      elsif exc.kind_of? String or !exc
        exc = ::RuntimeError.exception exc
      else
        raise ::TypeError, 'exception class/object expected'
      end

      if $DEBUG and $VERBOSE != nil
        STDERR.puts "Exception: `#{exc.class}' #{sender.location} - #{exc.message}"
      end

      __raise__(exc)
    end
    
    module_function(:raise)
    
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


Hash.after_loaded()
$stdout = IO.new()
$stderr = IO.new()


JS.debug = old_debug
