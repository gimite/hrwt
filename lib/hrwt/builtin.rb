old_debug = JS.debug
JS.debug = false


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


# Dummy implementation
module RecursionGuard
    
    def self.inspecting?(obj)
      return false
    end

    def self.inspect(obj, &block)
      yield
    end

end


# Dummy implementation
module Ruby
    
    def self.primitive(*args)
    end
    
end


# Temporarily imported from core/kernel.rb
module Type

  ##
  # Returns an object of given class. If given object already is one, it is
  # returned. Otherwise tries obj.meth and returns the result if it is of the
  # right kind. TypeErrors are raised if the conversion method fails or the
  # conversion result is wrong.
  #
  # Uses Type.obj_kind_of to bypass type check overrides.
  #
  # Equivalent to MRI's rb_convert_type().

  def self.coerce_to(obj, cls, meth)
    return obj if self.obj_kind_of?(obj, cls)

    begin
      ret = obj.__send__(meth)
    rescue Exception => e
      raise TypeError, "Coercion error: #{obj.inspect}.#{meth} => #{cls} failed:\n" \
                       "(#{e.message})"
    end

    return ret if self.obj_kind_of?(ret, cls)

    raise TypeError, "Coercion error: obj.#{meth} did NOT return a #{cls} (was #{ret.class})"
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
    
end


JS.debug = old_debug
