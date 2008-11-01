# Copyright (c) 2008, Hiroshi Ichikawa
# Distributed under Ruby License.

# So far only supports UTF-8.
class Encoding
  
  def self.list
    return [Encoding::UTF_8]
  end
  
  def self.find(name)
    if name.upcase == "UTF-8"
      return Encoding::UTF_8
    else
      raise(ArgumentError, "unknown encoding name - #{name}")
    end
  end
  
  def name
    return "UTF-8"
  end
  
  alias_method(:to_s, :name)
  
  def inspect
    return "\#<Encoding:#{self.name}>"
  end
  
  UTF_8 = Encoding.new()
  
end
