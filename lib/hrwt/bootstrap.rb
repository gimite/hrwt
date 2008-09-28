old_debug = JS.debug
JS.debug = false


class Object
    
    include(Kernel)
    
end


class Class
    
    def new(*args, &block)
      obj = allocate()
      obj.__send__(:initialize, *args, &block)
      return obj
    end
    
end


class Hash
    
    def each(&block)
      for k in self.keys
        block.call([k, self[k]])
      end
    end
    
    def map(&block)
      result = []
      for v in self
        result.push(block.call(v))
      end
      return result
    end
    
    def inspect
      return "{" + self.map(){ |e| e[0].inspect + "=>" + e[1].inspect }.join(", ") + "}"
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


Fixnum = Integer


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


class Array
    
    def dup()
      return Array.new(self)
    end
    
    attr_reader(:tuple, :total, :start)
    
end


JS.debug = old_debug
