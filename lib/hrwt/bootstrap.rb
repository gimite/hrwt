old_debug = JS.debug
JS.debug = false


module InstructionHelper
    
    def self.splat_array(obj)
      if obj_kind_of?(obj, Array)
        return obj
      elsif obj.respond_to?(:to_a)
        ret = obj.to_a()
        if !obj_kind_of?(ret, Array)
          raise(TypeError, "Coercion error: obj.to_a did NOT return a Array (was #{ret.class})")
        end
        return ret
      else
        return [obj]
      end
    end
    
end


class Object
    
    include(Kernel)
    
end


class Module
    
    def attr_accessor(*args)
      attr_reader(*args)
      attr_writer(*args)
    end
    
end


class Class
    
    def new(*args, &block)
      obj = allocate()
      obj.__send__(:initialize, *args, &block)
      return obj
    end
    
end


class Array
    
    def dup()
      return Array.new(self)
    end
    
    attr_reader(:tuple, :total, :start)
    
end


class Hash
  
  def initialize
    @bins = 16
    @values = Tuple.new(@bins)
    @entries = 0
  end
  
  def redistribute
  end
  
end


class IO
    
    def puts(*args)
      for arg in args
        if arg.is_a?(Array)
          puts(*arg)
        else
          write(arg.to_s() + "\n") # TODO: don't output "\n" if arg ends with "\n"
        end
      end
      return nil
    end
    
end


MAIN = self


# Dummy implementation
module Ruby
    
    def self.primitive(*args)
    end
    
end


# Temporary implementations


class Object
    
    def obj_kind_of?(obj, klass)
      return obj.is_a?(klass)
    end
    
    alias_method(:__kind_of__, :is_a?)
    
end


module Kernel
    
    def require(name)
      # Unimplemented
    end
    
    def self.__print_exception__(ex)
      __write__("#{ex.class.name}: #{ex.message}\n")
      for line in ex.backtrace
        __write__("        from #{line}\n")
      end
    end
    
end


class String
    
    def to_str()
      return self
    end
    
end


class Integer
    
    def to_int()
      return self
    end
    
end


module CType; end
module Precision; end


JS.debug = old_debug
