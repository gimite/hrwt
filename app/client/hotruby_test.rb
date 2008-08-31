# Literals

assert_equal(1+2, 3, "int literal 1")
assert_equal(1.class, Integer, "int literal 2")
assert_equal("hoge"+"foo", "hogefoo", "string literal 1")
assert_equal("hoge".class, String, "string literal 2")
assert_equal(true.class, TrueClass, "true literal")
assert_equal(false.class, FalseClass, "false literal")
assert_equal(nil.class, NilClass, "nil literal")
foo = "FOO"
assert_equal("hoge#{foo}bar", "hogeFOObar", "embedded expression")

# Constants and classes

FOO = "foo"

class Hoge
  
  assert_equal(self, Hoge, "self in class")
  
  FOO = "hogefoo"
  
  class Bar
    def im3()
      return "bar"
    end
  end
  
  def initialize(a)
    @a = a
  end
  
  def im1(b)
    return b
  end
  
  def im2()
    return @a
  end
  
  def method_missing(name, arg)
    return [name, arg]
  end
  
  def self.cm1()
    return "cm1"
  end
  
  class << self
    def cm2()
      return "cm2"
    end
  end
  
end

class Hoge
  
  def im4()
    return "hoga"
  end
  
end

hoge = Hoge.new("hoge")

assert_equal(hoge.im1("bar"), "bar", "instance method")
assert_equal(hoge.im2(), "hoge", "instance variable")
assert_equal(Hoge.cm1(), "cm1", "class method 1")
assert_equal(Hoge.cm2(), "cm2", "class method 2")
assert_equal(FOO, "foo", "constant 1")
assert_equal(Hoge::FOO, "hogefoo", "constant 2")
assert_equal(Hoge::Bar.new().im3(), "bar", "nested class")
assert_equal(hoge.im4(), "hoga", "redefine class")
res = hoge.im99(3)
assert_equal(res[0], "im99", "method_missing 1")
assert_equal(res[1], 3, "method_missing 2")

# Inheritance and modules

module Module1
  
  assert_equal(Hoge::FOO, "hogefoo", "constant lookup in module")
  
  def foo()
    return "mfoo"
  end
  
  def bar()
    return "mbar"
  end
  
end

class Class1
  
  include(Module1)
  
  def bar()
    return super() + " c1bar"
  end
  
end

class Class2 < Class1
  
  def bar()
    return super() + " c2bar"
  end
  
end

class Class3 < Class2
  
  def bar()
    return super() + " c3bar"
  end
  
end

obj = Class3.new()
assert_equal(obj.foo(), "mfoo", "module 1")
assert(obj.is_a?(Module1), "module 2")
assert_equal(obj.bar(), "mbar c1bar c2bar c3bar", "super")
assert(obj.is_a?(Class1), "is_a? superclass")

# Method args

def func1(a, b)
  return [a, b]
end

def func2(a, *b)
  return [a, b]
end

def func3(&block)
  block.call()
end

def func4(&block)
  yield(4)
end

res = func1(1, 2)
assert_equal(res[0], 1, "method arg 1")
assert_equal(res[1], 2, "method arg 2")
res = func2(1, 2)
assert_equal(res[0], 1, "method arg 3")
assert_equal(res[1][0], 2, "method arg 4")
a = 0
func3(){ a = 1 }
assert_equal(a, 1, "block arg 1")
func4(){ |b| a = b }
assert_equal(a, 4, "block arg 2")

# Object methods

assert("hoge".is_a?(String), 'Object#is_a? 1')
assert("hoge".is_a?(Object), 'Object#is_a? 2')
assert(!"hoge".is_a?(Integer), 'Object#is_a? 3')
assert(String === "hoge", 'Class#=== 1')
assert(!(String === 3), 'Class#=== 2')

# Strings

assert_equal("hoge", "hoge", 'String#==')

# Arrays

ary = [1, 2, 3]
assert_equal(ary[1], 2, 'Array#[]')
assert_equal(ary.size, 3, 'Array#size')
assert_equal(ary, [1, 2, 3], 'Array#== 1')
assert(ary != [1, 2], 'Array#== 2')
assert(ary != [1, 5, 3], 'Array#== 3')
assert_equal(ary.map(){ |v| v*2 }, [2, 4, 6], 'Array#map')
ary2 = []
for v in ary
  ary2.push(v)
end
assert_equal(ary2, ary, 'Array#each')

ary[1] = 4
assert_equal(ary, [1, 4, 3], 'Array#[]=')
ary.push(2)
assert_equal(ary, [1, 4, 3, 2], 'Array#push')

# for

ary = []
for i in 0...3
  ary.push(i)
end
assert_equal(ary, [0, 1, 2], "for 1")

ary = []
for a, b in [[1, 2], [3, 4]]
  ary.push([a, b])
end
assert_equal(ary, [[1, 2], [3, 4]], "for 2")

for i in 0...10
  break if i==5
end
assert_equal(i, 5, "for 3")

ary = []
for i in 0...5
  next if i==3
  ary.push(i)
end
assert_equal(ary, [0, 1, 2, 4], "for 4")

# case

case 2
  when 1
    assert(false, "int case 1")
  else
    assert(true, "int case 2")
end

case 1
  when Integer
    assert(true, "class case 1")
  when String
    assert(false, "class case 2")
  else
    assert(false, "class case 3")
end

# Exceptions

a = 0
begin
  raise(StandardError.new())
  assert(false, "exception 1.1")
rescue
  a = 1
end
assert_equal(a, 1, "exception 1.2")

def raise_func()
  raise(StandardError.new())
end

begin
  raise_func()
  assert(false, "exception 2.1")
rescue
  a = 2
end
assert_equal(a, 2, "exception 2.2")

# break/return

def br_hoge
  yield
  assert(false, "break 3")
end

def br_foo
  br_hoge() do
    yield
    assert(false, "break 4")
  end
  assert(false, "break 5")
end

a = 0
b = br_foo() do
  a = 1
  break "foo"
  a = 2
end

assert_equal(a, 1, "break 1")
assert_equal(b, "foo", "break 2")

def br_bar()
  br_foo() do
    return "bar"
  end
  assert(false, "return 2")
end

assert_equal(br_bar(), "bar", "return 1")


puts("Passed all tests.")
