old_debug = JS.debug
JS.debug = false


class Class
    
    def new(*args, &block)
      obj = allocate()
      obj.__send__(:initialize, *args, &block)
      return obj
    end
    
end


class Array
    
    alias_method :<<, :push
    
    def each(&block)
      i = 0
      size = self.size
      while i < size
        block.call(self[i])
        i += 1
      end
      return self
    end
    
    def ==(rhs)
      return false if !rhs.is_a?(Array)
      return false if self.size != rhs.size
      i = 0
      size = self.size
      while i < size
        return false if self[i] != rhs[i]
        i += 1
      end
      return true
    end
    
    def map(&block)
      result = []
      for v in self
        result.push(block.call(v))
      end
      return result
    end
    
    def join(sep = $,)
      str = ""
      for v in self
        str << sep if !str.empty?
        str << v.to_s()
      end
      return str
    end
    
    def inspect
      return "[" + self.map(){ |e| e.inspect }.join(", ") + "]"
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


JS.debug = old_debug
