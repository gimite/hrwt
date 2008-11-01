# Copyright (c) 2007, Evan Phoenix
# Distributed under New BSD License.
# Copied from Rubinius http://rubini.us/ revision 1b300ca6... and modified.

# depends on: class.rb comparable.rb enumerable.rb

# Default Ruby Record Separator
# Used in this file and by various methods that need to ignore $/
DEFAULT_RECORD_SEPARATOR = "\n"

class String
  include Comparable

  BASE_64_A2B = {}
  def self.after_loaded # :nodoc:
    (?A..?Z).each {|x| BASE_64_A2B[x] = x - ?A}
    (?a..?z).each {|x| BASE_64_A2B[x] = x - ?a + 26}
    (?0..?9).each {|x| BASE_64_A2B[x] = x - ?0 + 52}
    BASE_64_A2B[?+]  = ?>
    BASE_64_A2B[?\/] = ??
    BASE_64_A2B[?=]  = 0
  end

  def __ivars__ ; nil         ; end

  ##
  # Creates String of +bytes+ NUL characters.

  def self.buffer(bytes)
    "\0" * bytes
  end

  def initialize(arg=nil)
    replace StringValue(arg) unless arg.nil?

    self
  end

  private :initialize

  # call-seq:
  #   str % arg   => new_str
  #
  # Format---Uses <i>self</i> as a format specification, and returns the result
  # of applying it to <i>arg</i>. If the format specification contains more than
  # one substitution, then <i>arg</i> must be an <code>Array</code> containing
  # the values to be substituted. See <code>Kernel::sprintf</code> for details
  # of the format string.
  #
  #   "%05d" % 123                       #=> "00123"
  #   "%-5s: %08x" % [ "ID", self.id ]   #=> "ID   : 200e14d6"
  def %(args)
    Sprintf.new(self, *args).parse
  end

  # call-seq:
  #   str * integer   => new_str
  #
  # Copy --- Returns a new <code>String</code> containing <i>integer</i> copies of
  # the receiver.
  #
  #   "Ho! " * 3   #=> "Ho! Ho! Ho! "
  def *(num)
    num = Type.coerce_to(num, Integer, :to_int) unless num.is_a? Integer

    raise RangeError, "bignum too big to convert into `long' (#{num})" if num.is_a? Bignum
    raise ArgumentError, "unable to multiple negative times (#{num})" if num < 0

    str = self.class.template num * length, self
    return str
  end

  # Concatenation --- Returns a new <code>String</code> containing
  # <i>other</i> concatenated to <i>string</i>.
  #
  #   "Hello from " + self.to_s   #=> "Hello from main"
  def +(other)
    r = "#{self}#{StringValue(other)}"
    r.taint if self.tainted? or other.tainted?
    r
  end

  # Append --- Concatenates the given object to <i>self</i>. If the object is a
  # <code>Fixnum</code> between 0 and 255, it is converted to a character before
  # concatenation.
  #
  #   a = "hello "
  #   a << "world"   #=> "hello world"
  #   a.concat(33)   #=> "hello world!"
  def <<(other)
    unless other.kind_of? String
      if other.is_a?(Integer) && other >= 0 && other <= 255
        other = other.chr
      else
        other = StringValue(other)
      end
    end

    self.taint if other.tainted?
    self.append(other)
  end
  alias_method :concat, :<<

  # call-seq:
  #   str <=> other_str   => -1, 0, +1
  #
  # Comparison --- Returns -1 if <i>other_str</i> is less than, 0 if
  # <i>other_str</i> is equal to, and +1 if <i>other_str</i> is greater than
  # <i>self</i>. If the strings are of different lengths, and the strings are
  # equal when compared up to the shortest length, then the longer string is
  # considered greater than the shorter one. If the variable <code>$=</code> is
  # <code>false</code>, the comparison is based on comparing the binary values
  # of each character in the string. In older versions of Ruby, setting
  # <code>$=</code> allowed case-insensitive comparisons; this is now deprecated
  # in favor of using <code>String#casecmp</code>.
  #
  # <code><=></code> is the basis for the methods <code><</code>,
  # <code><=</code>, <code>></code>, <code>>=</code>, and <code>between?</code>,
  # included from module <code>Comparable</code>. The method
  # <code>String#==</code> does not use <code>Comparable#==</code>.
  #
  #    "abcdef" <=> "abcde"     #=> 1
  #    "abcdef" <=> "abcdef"    #=> 0
  #    "abcdef" <=> "abcdefg"   #=> -1
  #    "abcdef" <=> "ABCDEF"    #=> 1
  def <=>(other)
    if other.kind_of?(String)
      __compare__(other)
    else
      return unless other.respond_to?(:to_str) && other.respond_to?(:<=>)
      return unless tmp = (other <=> self)
      return -tmp # We're not supposed to convert to integer here
    end
  end

  # call-seq:
  #    str == obj   => true or false
  #
  # Equality---If <i>obj</i> is not a <code>String</code>, returns
  # <code>false</code>. Otherwise, returns <code>true</code> if <i>self</i>
  # <code><=></code> <i>obj</i> returns zero.
  #---
  # TODO: MRI does simply use <=> for Strings here, so what's this code about?
  #+++
  def ==(other)
    Ruby.primitive :string_equal

    unless other.kind_of?(String)
      if other.respond_to?(:to_str)
        return other == self
      end
      return false
    end

    return false unless length == other.size
    return __compare__(other) == 0
  end
  alias_method :===, :==

  # Match --- If <i>pattern</i> is a <code>Regexp</code>, use it as a pattern to match
  # against <i>self</i>, and return the position the match starts, or
  # <code>nil</code> if there is no match. Otherwise, invoke
  # <i>pattern.=~</i>, passing <i>self</i> as an argument.
  #
  # The default <code>=~</code> in <code>Object</code> returns <code>false</code>.
  #
  #   "cat o' 9 tails" =~ /\d/ #=> 7
  #   "cat o' 9 tails" =~ 9    #=> false
  def =~(pattern)
    case pattern
    when Regexp
      if m = pattern.match_from(self, 0)
        Regexp.last_match = m
        return m.begin(0)
      end
      Regexp.last_match = nil
      return nil
    when String
      raise TypeError, "type mismatch: String given"
    else
      pattern =~ self
    end
  end

  # call-seq:
  #    str[fixnum]                 => fixnum or nil
  #    str[fixnum, fixnum]         => new_str or nil
  #    str[range]                  => new_str or nil
  #    str[regexp]                 => new_str or nil
  #    str[regexp, fixnum]         => new_str or nil
  #    str[other_str]              => new_str or nil
  #    str.slice(fixnum)           => fixnum or nil
  #    str.slice(fixnum, fixnum)   => new_str or nil
  #    str.slice(range)            => new_str or nil
  #    str.slice(regexp)           => new_str or nil
  #    str.slice(regexp, fixnum)   => new_str or nil
  #    str.slice(other_str)        => new_str or nil
  #
  # Element Reference --- If passed a single <code>Fixnum</code>, returns the code
  # of the character at that position. If passed two <code>Fixnum</code>
  # objects, returns a substring starting at the offset given by the first, and
  # a length given by the second. If given a range, a substring containing
  # characters at offsets given by the range is returned. In all three cases, if
  # an offset is negative, it is counted from the end of <i>self</i>. Returns
  # <code>nil</code> if the initial offset falls outside the string, the length
  # is negative, or the beginning of the range is greater than the end.
  #
  # If a <code>Regexp</code> is supplied, the matching portion of <i>self</i> is
  # returned. If a numeric parameter follows the regular expression, that
  # component of the <code>MatchData</code> is returned instead. If a
  # <code>String</code> is given, that string is returned if it occurs in
  # <i>self</i>. In both cases, <code>nil</code> is returned if there is no
  # match.
  #
  #    a = "hello there"
  #    a[1]                   #=> 101
  #    a[1,3]                 #=> "ell"
  #    a[1..3]                #=> "ell"
  #    a[-3,2]                #=> "er"
  #    a[-4..-2]              #=> "her"
  #    a[12..-1]              #=> nil
  #    a[-2..-4]              #=> ""
  #    a[/[aeiou](.)\1/]      #=> "ell"
  #    a[/[aeiou](.)\1/, 0]   #=> "ell"
  #    a[/[aeiou](.)\1/, 1]   #=> "l"
  #    a[/[aeiou](.)\1/, 2]   #=> nil
  #    a["lo"]                #=> "lo"
  #    a["bye"]               #=> nil
  def [](index, other = Undefined)
    unless other.equal?(Undefined)
      len = Type.coerce_to(other, Fixnum, :to_int)

      if index.kind_of? Regexp
        match, str = subpattern(index, len)
        Regexp.last_match = match
        return str
      else
        start  = Type.coerce_to(index, Fixnum, :to_int)
        return substring(start, len)
      end
    end

    case index
    when Regexp
      match, str = subpattern(index, 0)
      Regexp.last_match = match
      return str
    when String
      return include?(index) ? index.dup : nil
    when Range
      start   = Type.coerce_to index.first, Fixnum, :to_int
      len  = Type.coerce_to index.last,  Fixnum, :to_int

      start += length if start < 0

      len += length if len < 0
      len += 1 unless index.exclude_end?

      return "" if start == length
      return nil if start < 0 || start > length

      len = length if len > length
      len = len - start
      len = 0 if len < 0

      return substring(start, len)
    # A really stupid case hit for rails. Either we define this or we define
    # Symbol#to_int. We removed Symbol#to_int in late 2007 because it's evil,
    # and do not want to re add it.
    when Symbol
      return nil
    else
      index = Type.coerce_to index, Fixnum, :to_int
      index = length + index if index < 0

      return if index < 0 || length <= index
      return __at__(index)
    end
  end
  alias_method :slice, :[]

  # call-seq:
  #   str[fixnum] = fixnum
  #   str[fixnum] = new_str
  #   str[fixnum, fixnum] = new_str
  #   str[range] = aString
  #   str[regexp] = new_str
  #   str[regexp, fixnum] = new_str
  #   str[other_str] = new_str
  #
  # Element Assignment --- Replaces some or all of the content of <i>self</i>. The
  # portion of the string affected is determined using the same criteria as
  # <code>String#[]</code>. If the replacement string is not the same length as
  # the text it is replacing, the string will be adjusted accordingly. If the
  # regular expression or string is used as the index doesn't match a position
  # in the string, <code>IndexError</code> is raised. If the regular expression
  # form is used, the optional second <code>Fixnum</code> allows you to specify
  # which portion of the match to replace (effectively using the
  # <code>MatchData</code> indexing rules. The forms that take a
  # <code>Fixnum</code> will raise an <code>IndexError</code> if the value is
  # out of range; the <code>Range</code> form will raise a
  # <code>RangeError</code>, and the <code>Regexp</code> and <code>String</code>
  # forms will silently ignore the assignment.
  def []=(*args)
    if args.size == 3
      if args.first.is_a? Regexp
        subpattern_set args[0], Type.coerce_to(args[1], Integer, :to_int), args[2]
      else
        splice! Type.coerce_to(args[0], Integer, :to_int), Type.coerce_to(args[1], Integer, :to_int), args[2]
      end

      return args.last
    elsif args.size != 2
      raise ArgumentError, "wrong number of arguments (#{args.size} for 2)"
    end

    index = args[0]
    replacement = args[1]

    case index
    when Regexp
      subpattern_set index, 0, replacement
    when String
      unless start = self.index(index)
        raise IndexError, "string not matched"
      end

      splice! start, index.length, replacement
    when Range
      start   = Type.coerce_to(index.first, Integer, :to_int)
      len  = Type.coerce_to(index.last, Integer, :to_int)

      start += length if start < 0

      # TODO: this is wrong
      return nil if start < 0 || start > length

      len = length if len > length
      len += length if len < 0
      len += 1 unless index.exclude_end?

      len = len - start
      len = 0 if len < 0

      splice! start, len, replacement
    else
      index = Type.coerce_to(index, Integer, :to_int)
      raise IndexError, "index #{index} out of string" if length <= index

      if index < 0
        raise IndexError, "index #{index} out of string" if -index > length
        index += length
      end

      if replacement.is_a?(Fixnum)
        modify!
        __set__(index, replacement)
      else
        splice! index, 1, replacement
      end
    end
    return replacement
  end

  # Returns a copy of <i>self</i> with the first character converted to uppercase
  # and the remainder to lowercase.
  # Note: case conversion is effective only in ASCII region.
  #
  #   "hello".capitalize    #=> "Hello"
  #   "HELLO".capitalize    #=> "Hello"
  #   "123ABC".capitalize   #=> "123abc"
  def capitalize
    (str = self.dup).capitalize! || str
  end

  # Modifies <i>self</i> by converting the first character to uppercase and the
  # remainder to lowercase. Returns <code>nil</code> if no changes are made.
  # Note: case conversion is effective only in ASCII region.
  #
  #   a = "hello"
  #   a.capitalize!   #=> "Hello"
  #   a               #=> "Hello"
  #   a.capitalize!   #=> nil
  def capitalize!
    return if length == 0
    self.modify!

    modified = false

    c = __at__(0)
    if c.islower
      __set__(0, c.toupper)
      modified = true
    end

    i = 1
    while i < length
      c = __at__(i)
      if c.isupper
        __set__(i, c.tolower)
        modified = true
      end
      i += 1
    end

    modified ? self : nil
  end

  # Case-insensitive version of <code>String#<=></code>.
  #
  #   "abcdef".casecmp("abcde")     #=> 1
  #   "aBcDeF".casecmp("abcdef")    #=> 0
  #   "abcdef".casecmp("abcdefg")   #=> -1
  #   "abcdef".casecmp("ABCDEF")    #=> 0
  def casecmp(to)
    order = length - to.length
    size = order < 0 ? length : to.length

    i = 0
    while i < size
      a = __at__(i)
      b = to.__at__(i)
      i += 1

      r = a - b
      next if r == 0

      if (a.islower or a.isupper) and (b.islower or b.isupper)
        r += r < 0 ? ?\s : -?\s
      end

      next if r == 0
      return -1 if r < 0
      return 1
    end

    return 0 if order == 0
    return -1 if order < 0
    return 1
  end

  # If <i>integer</i> is greater than the length of <i>self</i>, returns a new
  # <code>String</code> of length <i>integer</i> with <i>self</i> centered and
  # padded with <i>padstr</i>; otherwise, returns <i>self</i>.
  #
  #    "hello".center(4)         #=> "hello"
  #    "hello".center(20)        #=> "       hello        "
  #    "hello".center(20, '123') #=> "1231231hello12312312"
  def center(width, padstr = " ")
    justify(width, :center, padstr)
  end

  # Returns a new <code>String</code> with the given record separator removed
  # from the end of <i>self</i> (if present). If <code>$/</code> has not been
  # changed from the default Ruby record separator, then <code>chomp</code> also
  # removes carriage return characters (that is it will remove <code>\n</code>,
  # <code>\r</code>, and <code>\r\n</code>).
  #
  #   "hello".chomp            #=> "hello"
  #   "hello\n".chomp          #=> "hello"
  #   "hello\r\n".chomp        #=> "hello"
  #   "hello\n\r".chomp        #=> "hello\n"
  #   "hello\r".chomp          #=> "hello"
  #   "hello \n there".chomp   #=> "hello \n there"
  #   "hello".chomp("llo")     #=> "he"
  def chomp(separator = $/)
    (str = self.dup).chomp!(separator) || str
  end

  # Modifies <i>self</i> in place as described for <code>String#chomp</code>,
  # returning <i>self</i>, or <code>nil</code> if no modifications were made.
  #---
  # NOTE: TypeError is raised in String#replace and not in String#chomp! when
  # self is frozen. This is intended behaviour.
  #+++
  def chomp!(sep = $/)
    return if sep.nil? || length == 0
    sep = StringValue sep

    if (sep == $/ && sep == DEFAULT_RECORD_SEPARATOR) || sep == "\n"
      size = length
      c = __at__(length-1)
      if c == ?\n
        size -= (length > 1 && __at__(length-2) == ?\r) ? 2 : 1
      elsif c == ?\r
        size -= 1
      else
        return
      end

      modify!
      __replace__(self, 0, size)
    elsif sep.size == 0
      size = length
      while size > 0 && __at__(size-1) == ?\n
        if size > 1 && __at__(size-2) == ?\r
          size -= 2
        else
          size -= 1
        end
      end

      return if size == length
      modify!
      __replace__(self, 0, size)
    else
      size = sep.size
      return if size > length || sep.compare_substring(self, -size, size) != 0

      modify!
      __replace__(self, 0, length - size)
    end

    return self
  end

  # Returns a new <code>String</code> with the last character removed.  If the
  # string ends with <code>\r\n</code>, both characters are removed. Applying
  # <code>chop</code> to an empty string returns an empty
  # string. <code>String#chomp</code> is often a safer alternative, as it leaves
  # the string unchanged if it doesn't end in a record separator.
  #
  #   "string\r\n".chop   #=> "string"
  #   "string\n\r".chop   #=> "string\n"
  #   "string\n".chop     #=> "string"
  #   "string".chop       #=> "strin"
  #   "x".chop.chop       #=> ""
  def chop
    (str = self.dup).chop! || str
  end

  # Processes <i>self</i> as for <code>String#chop</code>, returning <i>self</i>,
  # or <code>nil</code> if <i>self</i> is the empty string.  See also
  # <code>String#chomp!</code>.
  def chop!
    return if length == 0

    self.modify!
    if length > 1 and __at__(length-1) == ?\n and __at__(length-2) == ?\r
      __replace__(self, 0, length - 2)
    else
      __replace__(self, 0, length - 1)
    end

    self
  end

  # Each <i>other_string</i> parameter defines a set of characters to count.  The
  # intersection of these sets defines the characters to count in
  # <i>self</i>. Any <i>other_str</i> that starts with a caret (^) is
  # negated. The sequence c1--c2 means all characters between c1 and c2.
  #
  #   a = "hello world"
  #   a.count "lo"            #=> 5
  #   a.count "lo", "o"       #=> 2
  #   a.count "hello", "^l"   #=> 4
  #   a.count "ej-m"          #=> 4
  def count(*strings)
    raise ArgumentError, "wrong number of Arguments" if strings.empty?
    return 0 if length == 0

    table = count_table(*strings).data

    count = i = 0
    while i < length
      count += 1 if table[__at__(i)] == 1
      i += 1
    end

    count
  end

  # Applies a one-way cryptographic hash to <i>self</i> by invoking the standard
  # library function <code>crypt</code>. The argument is the salt string, which
  # should be two characters long, each character drawn from
  # <code>[a-zA-Z0-9./]</code>.
  def crypt(other_str)
    other_str = StringValue(other_str)
    raise ArgumentError.new("salt must be at least 2 characters") if other_str.size < 2

    hash = __crypt__(other_str)
    hash.taint if self.tainted? || other_str.tainted?
    hash
  end

  # Returns a copy of <i>self</i> with all characters in the intersection of its
  # arguments deleted. Uses the same rules for building the set of characters as
  # <code>String#count</code>.
  #
  #   "hello".delete "l","lo"        #=> "heo"
  #   "hello".delete "lo"            #=> "he"
  #   "hello".delete "aeiou", "^e"   #=> "hell"
  #   "hello".delete "ej-m"          #=> "ho"
  def delete(*strings)
    (str = self.dup).delete!(*strings) || str
  end

  # Performs a <code>delete</code> operation in place, returning <i>self</i>, or
  # <code>nil</code> if <i>self</i> was not modified.
  def delete!(*strings)
    raise ArgumentError, "wrong number of arguments" if strings.empty?
    self.modify!

    table = count_table(*strings).data

    i, j = 0, -1
    while i < length
      c = __at__(i)
      unless table[c] == 1
        __set__(j+=1, c)
      end
      i += 1
    end

    if (j += 1) < length
      __replace__(self, 0, j)
      self
    else
      nil
    end
  end

  # Returns a copy of <i>self</i> with all uppercase letters replaced with their
  # lowercase counterparts. The operation is locale insensitive---only
  # characters ``A'' to ``Z'' are affected.
  #
  # "hEllO".downcase   #=> "hello"
  def downcase
    (str = self.dup).downcase! || str
  end

  # Passes each byte in <i>self</i> to the given block.
  #
  #   "hello".each_byte {|c| print c, ' ' }
  #
  # <em>produces:</em>
  #
  #   104 101 108 108 111
  def each_byte()
    i = 0
    while i < length do
      yield __at__(i)
      i += 1
    end
    self
  end

  # works exactly like each_byte, but returns characters instead of bytes
  def each_char()
    i = 0
    while i < length do
      yield __at__(i)
      i += 1
    end
    self
  end

  # Splits <i>self</i> using the supplied parameter as the record separator
  # (<code>$/</code> by default), passing each substring in turn to the supplied
  # block. If a zero-length record separator is supplied, the string is split on
  # <code>\n</code> characters, except that multiple successive newlines are
  # appended together.
  #
  #   print "Example one\n"
  #   "hello\nworld".each {|s| p s}
  #   print "Example two\n"
  #   "hello\nworld".each('l') {|s| p s}
  #   print "Example three\n"
  #   "hello\n\n\nworld".each('') {|s| p s}
  #
  # <em>produces:</em>
  #
  #   Example one
  #   "hello\n"
  #   "world"
  #   Example two
  #   "hel"
  #   "l"
  #   "o\nworl"
  #   "d"
  #   Example three
  #   "hello\n\n\n"
  #   "world"
  def each_line(sep = $/)
    if sep.nil?
      yield self
      return self
    end

    sep = StringValue sep
    raise LocalJumpError, "no block given" unless block_given?

    #id = @data.object_id
    size = length
    ssize = sep.size
    newline = ssize == 0 ? ?\n : sep[ssize-1]

    last, i = 0, ssize
    while i < size
      if ssize == 0 && __at__(i) == ?\n
        if __at__(i+=1) != ?\n
          i += 1
          next
        end
        i += 1 while i < size && __at__(i) == ?\n
      end

      if i > 0 && __at__(i-1) == newline &&
          (ssize < 2 || sep.compare_substring(self, i-ssize, ssize) == 0)
        line = substring last, i-last
        line.taint if tainted?
        yield line
        #modified? id, size
        last = i
      end

      i += 1
    end

    unless last == size
      line = substring last, size-last+1
      line.taint if tainted?
      yield line
    end

    self
  end

  # Returns <code>true</code> if <i>self</i> has a length of zero.
  #
  #   "hello".empty?   #=> false
  #   "".empty?        #=> true
  def empty?
    length == 0
  end

  # Two strings are equal if the have the same length and content.
  def eql?(other)
    Ruby.primitive :string_equal
    return false unless other.is_a?(String) && other.size == length
    (substring(0, length) <=> other.substring(0, length)) == 0
  end

  # Returns a copy of <i>self</i> with <em>all</em> occurrences of <i>pattern</i>
  # replaced with either <i>replacement</i> or the value of the block. The
  # <i>pattern</i> will typically be a <code>Regexp</code>; if it is a
  # <code>String</code> then no regular expression metacharacters will be
  # interpreted (that is <code>/\d/</code> will match a digit, but
  # <code>'\d'</code> will match a backslash followed by a 'd').
  #
  # If a string is used as the replacement, special variables from the match
  # (such as <code>$&</code> and <code>$1</code>) cannot be substituted into it,
  # as substitution into the string occurs before the pattern match
  # starts. However, the sequences <code>\1</code>, <code>\2</code>, and so on
  # may be used to interpolate successive groups in the match.
  #
  # In the block form, the current match string is passed in as a parameter, and
  # variables such as <code>$1</code>, <code>$2</code>, <code>$`</code>,
  # <code>$&</code>, and <code>$'</code> will be set appropriately. The value
  # returned by the block will be substituted for the match on each call.
  #
  # The result inherits any tainting in the original string or any supplied
  # replacement string.
  #
  #   "hello".gsub(/[aeiou]/, '*')              #=> "h*ll*"
  #   "hello".gsub(/([aeiou])/, '<\1>')         #=> "h<e>ll<o>"
  #   "hello".gsub(/./) {|s| s[0].to_s + ' '}   #=> "104 101 108 108 111 "
  def gsub(pattern, replacement=nil, &prc)
    raise ArgumentError, "wrong number of arguments (1 for 2)" unless replacement || block_given?
    raise ArgumentError, "wrong number of arguments (0 for 2)" unless pattern

    tainted = false

    if replacement
      tainted = replacement.tainted?
      replacement = StringValue(replacement)
      tainted ||= replacement.tainted?
    end

    pattern = get_pattern(pattern, true)
    copy = self.dup

    last_end = 0
    offset = nil
    ret = self.class.template(0,0) # Empty string, or string subclass

    last_match = nil
    match = pattern.match_from self, last_end

    offset = match.begin 0 if match

    while match do
      ret << (match.pre_match_from(last_end) || "")

      if replacement
        ret << replacement.to_sub_replacement(match)
      else
        # We do this so that we always manipulate $~ in the context
        # of the passed block.
        prc.block.home.last_match = match

        val = yield(match[0].dup)
        tainted ||= val.tainted?
        ret << val.to_s

        raise RuntimeError, "string modified" if self != copy
      end

      tainted ||= val.tainted?

      last_end = match.end(0)
      offset = match.collapsing? ? offset + 1 : match.end(0)

      last_match = match

      match = pattern.match_from self, offset
      break unless match

      offset = match.begin 0
    end

    Regexp.last_match = last_match

    str = substring(last_end, length-last_end+1)
    ret << str if str

    ret.taint if tainted || self.tainted?
    return ret
  end

  # Performs the substitutions of <code>String#gsub</code> in place, returning
  # <i>self</i>, or <code>nil</code> if no substitutions were performed.
  def gsub!(pattern, replacement = nil, &block)
    str = gsub(pattern, replacement, &block)

    if lm = Regexp.last_match
      Regexp.last_match = Regexp.last_match
      replace(str)
      return self
    else
      Regexp.last_match = nil
      return nil
    end
  end

  # Treats leading characters from <i>self</i> as a string of hexadecimal digits
  # (with an optional sign and an optional <code>0x</code>) and returns the
  # corresponding number. Zero is returned on error.
  #
  #    "0x0a".hex     #=> 10
  #    "-1234".hex    #=> -4660
  #    "0".hex        #=> 0
  #    "wombat".hex   #=> 0
  def hex
    self.to_inum(16)
  end

  # Returns <code>true</code> if <i>self</i> contains the given string or
  # character.
  #
  #   "hello".include? "lo"   #=> true
  #   "hello".include? "ol"   #=> false
  #   "hello".include? ?h     #=> true
  def include?(needle)
    if needle.is_a? Fixnum
      needle = needle % 256
      each_byte { |b| return true if b == needle }
      return false
    end

    !self.index(StringValue(needle)).nil?
  end

  # Returns the index of the first occurrence of the given <i>substring</i>,
  # character (<i>fixnum</i>), or pattern (<i>regexp</i>) in <i>self</i>. Returns
  # <code>nil</code> if not found. If the second parameter is present, it
  # specifies the position in the string to begin the search.
  #
  #   "hello".index('e')             #=> 1
  #   "hello".index('lo')            #=> 3
  #   "hello".index('a')             #=> nil
  #   "hello".index(101)             #=> 1
  #   "hello".index(/[aeiou]/, -3)   #=> 4
  def index(needle, offset = 0)
    offset = Type.coerce_to(offset, Integer, :to_int)
    offset = length + offset if offset < 0
    return nil if offset < 0 || offset > length

    needle = needle.to_str if !needle.instance_of?(String) && needle.respond_to?(:to_str)

    # What are we searching for?
    case needle
    when Fixnum
      (offset...self.size).each do |i|
        return i if __at__(i) == needle
      end
    when String
      return offset if needle == ""

      needle_size = needle.size

      max = length - needle_size
      return if max < 0 # <= 0 maybe?

      offset.upto(max) do |i|
        if __at__(i) == needle.__at__(0)
          return i if substring(i, needle_size) == needle
        end
      end
    when Regexp
      if match = needle.match_from(self[offset..-1], 0)
        Regexp.last_match = match
        return (offset + match.begin(0))
      else
        Regexp.last_match = nil
      end
    else
      raise TypeError, "type mismatch: #{needle.class} given"
    end

    return nil
  end

  # Inserts <i>other_string</i> before the character at the given
  # <i>index</i>, modifying <i>self</i>. Negative indices count from the
  # end of the string, and insert <em>after</em> the given character.
  # The intent is insert <i>other_string</i> so that it starts at the given
  # <i>index</i>.
  #
  #   "abcd".insert(0, 'X')    #=> "Xabcd"
  #   "abcd".insert(3, 'X')    #=> "abcXd"
  #   "abcd".insert(4, 'X')    #=> "abcdX"
  #   "abcd".insert(-3, 'X')   #=> "abXcd"
  #   "abcd".insert(-1, 'X')   #=> "abcdX"
  def insert(index, other)
    other = StringValue(other)
    index = Type.coerce_to(index, Integer, :to_int) unless index.__kind_of__ Fixnum

    osize = other.size
    size = length + osize
    str = self.class.new("\0") * size

    index = length + 1 + index if index < 0
    raise IndexError, "index #{index} out of string" if index > length or index < 0

    if index == 0
      str.copy_from other, 0, other.size, 0
      str.copy_from self, 0, length, other.size
    elsif index < length
      str.copy_from self, 0, index, 0
      str.copy_from other, 0, osize, index
      str.copy_from self, index, length - index, index + osize
    else
      str.copy_from self, 0, length, 0
      str.copy_from other, 0, other.size, length
    end
    __replace__(str)
    taint if other.tainted?

    self
  end

  ControlCharacters = [?\n, ?\t, ?\a, ?\v, ?\f, ?\r, ?\e, ?\b]
  ControlPrintValue = ["\\n", "\\t", "\\a", "\\v", "\\f", "\\r", "\\e", "\\b"]

  # Returns a printable version of _self_, with special characters
  # escaped.
  #
  #   str = "hello"
  #   str[3] = 8
  #   str.inspect       #=> "hel\010o"
  def inspect
    if true # $KCODE == "UTF-8"
      str = "\"#{self}\""
    else
      str = "\""
      i = -1
      str << __at__(i).toprint while (i += 1) < length
      str << "\""
    end
    str.taint if tainted?
    str
  end

  # Returns the length of <i>self</i>.
  alias_method :size, :length

  # If <i>integer</i> is greater than the length of <i>self</i>, returns a new
  # <code>String</code> of length <i>integer</i> with <i>self</i> left justified
  # and padded with <i>padstr</i>; otherwise, returns <i>self</i>.
  #
  #   "hello".ljust(4)            #=> "hello"
  #   "hello".ljust(20)           #=> "hello               "
  #   "hello".ljust(20, '1234')   #=> "hello123412341234123"
  def ljust(width, padstr = " ")
    justify(width, :left, padstr)
  end

  # Returns a copy of <i>self</i> with leading whitespace removed. See also
  # <code>String#rstrip</code> and <code>String#strip</code>.
  #
  #   "  hello  ".lstrip   #=> "hello  "
  #   "hello".lstrip       #=> "hello"
  def lstrip
    (str = self.dup).lstrip! || str
  end

  # Removes leading whitespace from <i>self</i>, returning <code>nil</code> if no
  # change was made. See also <code>String#rstrip!</code> and
  # <code>String#strip!</code>.
  #
  #   "  hello  ".lstrip   #=> "hello  "
  #   "hello".lstrip!      #=> nil
  def lstrip!
    return if length == 0

    start = 0
    while start < length
      c = __at__(start)
      if c.isspace or c == 0
        start += 1
      else
        break
      end
    end

    return if start == 0

    modify!
    __replace__(self, start, length - start)
    self
  end

  # Converts <i>pattern</i> to a <code>Regexp</code> (if it isn't already one),
  # then invokes its <code>match</code> method on <i>self</i>.
  #
  #   'hello'.match('(.)\1')      #=> #<MatchData:0x401b3d30>
  #   'hello'.match('(.)\1')[0]   #=> "ll"
  #   'hello'.match(/(.)\1/)[0]   #=> "ll"
  #   'hello'.match('xx')         #=> nil
  def match(pattern)
    obj = get_pattern(pattern).match_from(self, 0)
    Regexp.last_match = obj
    return obj
  end

  # Treats leading characters of <i>self</i> as a string of octal digits (with an
  # optional sign) and returns the corresponding number. Returns 0 if the
  # conversion fails.
  #
  #   "123".oct       #=> 83
  #   "-377".oct      #=> -255
  #   "bad".oct       #=> 0
  #   "0377bad".oct   #=> 255
  def oct
    self.to_inum(8, false, true)
  end

  # Replaces the contents and taintedness of <i>string</i> with the corresponding
  # values in <i>other</i>.
  #
  #   s = "hello"         #=> "hello"
  #   s.replace "world"   #=> "world"
  def replace(other)
    # If we're replacing with ourselves, then we have nothing to do
    return self if self.equal?(other)

    other = StringValue(other)

    __replace__(other)

    self.taint if other.tainted?

    self
  end
  alias_method :initialize_copy, :replace
  # private :initialize_copy

  # Returns a new string with the characters from <i>self</i> in reverse order.
  #
  #   "stressed".reverse   #=> "desserts"
  def reverse
    self.dup.reverse!
  end

  # Reverses <i>self</i> in place.
  def reverse!
    return self if length <= 1
    self.modify!

    i = 0
    j = length - 1
    while i < j
      tmp = __at__(i)
      __set__(i, __at__(j))
      __set__(j, tmp)
      i += 1
      j -= 1
    end
    self
  end

  # Returns the index of the last occurrence of the given <i>substring</i>,
  # character (<i>fixnum</i>), or pattern (<i>regexp</i>) in <i>self</i>. Returns
  # <code>nil</code> if not found. If the second parameter is present, it
  # specifies the position in the string to end the search---characters beyond
  # this point will not be considered.
  #
  #   "hello".rindex('e')             #=> 1
  #   "hello".rindex('l')             #=> 3
  #   "hello".rindex('a')             #=> nil
  #   "hello".rindex(101)             #=> 1
  #   "hello".rindex(/[aeiou]/, -2)   #=> 1
  def rindex(arg, finish = Undefined)
    arg = StringValue(arg) unless [Fixnum, String, Regexp].include?(arg.class)
    original_klass = arg.class
    if !finish.equal?(Undefined)
      finish = Type.coerce_to(finish, Integer, :to_int)
      finish += length if finish < 0
      return nil if finish < 0
      finish = length if finish >= length
    else
      finish = size
    end
    case arg
    when Fixnum
      return nil if arg > 255 || arg < 0
      arg = Regexp.new(Regexp.quote(arg.chr))
    when String
      arg = Regexp.new(Regexp.quote(arg))
    end

    ret = arg.search_region(self, 0, finish, false)
    Regexp.last_match = ret if original_klass == Regexp
    ret && ret.begin(0)
  end

  # If <i>integer</i> is greater than the length of <i>self</i>, returns a new
  # <code>String</code> of length <i>integer</i> with <i>self</i> right justified
  # and padded with <i>padstr</i>; otherwise, returns <i>self</i>.
  #
  #   "hello".rjust(4)            #=> "hello"
  #   "hello".rjust(20)           #=> "               hello"
  #   "hello".rjust(20, '1234')   #=> "123412341234123hello"
  def rjust(width, padstr = " ")
    justify(width, :right, padstr)
  end

  # Returns a copy of <i>self</i> with trailing whitespace removed. See also
  # <code>String#lstrip</code> and <code>String#strip</code>.
  #
  #   "  hello  ".rstrip   #=> "  hello"
  #   "hello".rstrip       #=> "hello"
  def rstrip
    (str = self.dup).rstrip! || str
  end

  # Removes trailing whitespace from <i>self</i>, returning <code>nil</code> if
  # no change was made. See also <code>String#lstrip!</code> and
  # <code>String#strip!</code>.
  #
  #   "  hello  ".rstrip   #=> "  hello"
  #   "hello".rstrip!      #=> nil
  def rstrip!
    return if length == 0

    stop = length - 1
    while stop >= 0
      c = __at__(stop)
      if c.isspace || c == 0
        stop -= 1
      else
        break
      end
    end

    return if (stop += 1) == length

    modify!
    __replace__(self, 0, stop)
    self
  end


  # Both forms iterate through <i>self</i>, matching the pattern (which may be a
  # <code>Regexp</code> or a <code>String</code>). For each match, a result is
  # generated and either added to the result array or passed to the block. If
  # the pattern contains no groups, each individual result consists of the
  # matched string, <code>$&</code>.  If the pattern contains groups, each
  # individual result is itself an array containing one entry per group.
  #
  #   a = "cruel world"
  #   a.scan(/\w+/)        #=> ["cruel", "world"]
  #   a.scan(/.../)        #=> ["cru", "el ", "wor"]
  #   a.scan(/(...)/)      #=> [["cru"], ["el "], ["wor"]]
  #   a.scan(/(..)(..)/)   #=> [["cr", "ue"], ["l ", "wo"]]
  #
  # And the block form:
  #
  #   a.scan(/\w+/) {|w| print "<<#{w}>> " }
  #   print "\n"
  #   a.scan(/(.)(.)/) {|x,y| print y, x }
  #   print "\n"
  #
  # <em>produces:</em>
  #
  #   <<cruel>> <<world>>
  #   rceu lowlr

  def scan(pattern)
    taint = self.tainted? || pattern.tainted?
    pattern = get_pattern(pattern, true)
    index = 0

    last_match = nil

    if block_given?
      ret = self
    else
      ret = []
    end

    while match = pattern.match_from(self, index)
      index = match.collapsing? ? match.end(0) + 1 : match.end(0)
      last_match = match
      val = (match.length == 1 ? match[0] : match.captures)
      val.taint if taint

      if block_given?
        Regexp.last_match = match
        yield(val)
      else
        ret << val
      end
    end

    Regexp.last_match = last_match
    return ret
=begin

    unless block_given?
      ret = []

      while (index, match = scan_once(pattern, index)) && match
        last_match = match
        match.taint if taint
        ret << match
      end

      Regexp.last_match = last_match
      return ret
    else
      while (index, match = scan_once(pattern, index)) && match
        last_match = old_md = $~

        match.taint if taint

        block.call(match)
        Regexp.last_match = old_md
      end

      ret = self
    end

    Regexp.last_match = last_match
    return ret
=end
  end

  # Deletes the specified portion from <i>self</i>, and returns the portion
  # deleted. The forms that take a <code>Fixnum</code> will raise an
  # <code>IndexError</code> if the value is out of range; the <code>Range</code>
  # form will raise a <code>RangeError</code>, and the <code>Regexp</code> and
  # <code>String</code> forms will silently ignore the assignment.
  #
  #   string = "this is a string"
  #   string.slice!(2)        #=> 105
  #   string.slice!(3..6)     #=> " is "
  #   string.slice!(/s.*t/)   #=> "sa st"
  #   string.slice!("r")      #=> "r"
  #   string                  #=> "thing"
  def slice!(*args)
    result = slice(*args)
    lm = Regexp.last_match
    self[*args] = '' unless result.nil?
    Regexp.last_match = lm
    result
  end

  # Divides <i>self</i> into substrings based on a delimiter, returning an array
  # of these substrings.
  #
  # If <i>pattern</i> is a <code>String</code>, then its contents are used as
  # the delimiter when splitting <i>self</i>. If <i>pattern</i> is a single
  # space, <i>self</i> is split on whitespace, with leading whitespace and runs
  # of contiguous whitespace characters ignored.
  #
  # If <i>pattern</i> is a <code>Regexp</code>, <i>self</i> is divided where the
  # pattern matches. Whenever the pattern matches a zero-length string,
  # <i>self</i> is split into individual characters.
  #
  # If <i>pattern</i> is omitted, the value of <code>$;</code> is used.  If
  # <code>$;</code> is <code>nil</code> (which is the default), <i>self</i> is
  # split on whitespace as if ` ' were specified.
  #
  # If the <i>limit</i> parameter is omitted, trailing null fields are
  # suppressed. If <i>limit</i> is a positive number, at most that number of
  # fields will be returned (if <i>limit</i> is <code>1</code>, the entire
  # string is returned as the only entry in an array). If negative, there is no
  # limit to the number of fields returned, and trailing null fields are not
  # suppressed.
  #
  #   " now's  the time".split        #=> ["now's", "the", "time"]
  #   " now's  the time".split(' ')   #=> ["now's", "the", "time"]
  #   " now's  the time".split(/ /)   #=> ["", "now's", "", "the", "time"]
  #   "1, 2.34,56, 7".split(%r{,\s*}) #=> ["1", "2.34", "56", "7"]
  #   "hello".split(//)               #=> ["h", "e", "l", "l", "o"]
  #   "hello".split(//, 3)            #=> ["h", "e", "llo"]
  #   "hi mom".split(%r{\s*})         #=> ["h", "i", "m", "o", "m"]
  #
  #   "mellow yellow".split("ello")   #=> ["m", "w y", "w"]
  #   "1,2,,3,4,,".split(',')         #=> ["1", "2", "", "3", "4"]
  #   "1,2,,3,4,,".split(',', 4)      #=> ["1", "2", "", "3,4,,"]
  #   "1,2,,3,4,,".split(',', -4)     #=> ["1", "2", "", "3", "4", "", ""]
  def split(pattern = nil, limit = nil)

    # Odd edge case
    return [] if empty?

    if limit
      if !limit.kind_of?(Integer) and limit.respond_to?(:to_int)
        limit = limit.to_int
      end

      if limit > 0
        return [self.dup] if limit == 1
        limited = true
      else
        limited = false
      end
    else
      limited = false
    end

    pattern ||= ($; || " ")

    if pattern == ' '
      spaces = true
      pattern = /\s+/
    elsif pattern.nil?
      pattern = /\s+/
    elsif pattern.kind_of?(Regexp)
      # Pass
    else
      pattern = StringValue(pattern) unless pattern.kind_of?(String)
      pattern = Regexp.new(Regexp.quote(pattern))
    end

    start = 0
    ret = []

    last_match = nil

    while match = pattern.match_from(self, start)
      break if limited && limit - ret.size <= 1

      collapsed = match.collapsing?

      if !collapsed || (match.begin(0) != 0)
        ret << match.pre_match_from(last_match ? last_match.end(0) : 0)
        ret.push(*match.captures.compact)
      end

      if collapsed
        start += 1
      elsif last_match && last_match.collapsing?
        start = match.end(0) + 1
      else
        start = match.end(0)
      end

      last_match = match
    end

    if last_match
      ret << last_match.post_match
    elsif ret.empty?
      ret << self.dup
    end

    # Trim from end
    if !ret.empty? and (limit == 0 || limit.nil?)
      while s = ret.last and s.empty?
        ret.pop
      end
    end

    # Trim from front
    if !ret.empty? and spaces
      while s = ret.first and s.empty?
        ret.shift
      end
    end

    # Support subclasses
    ret = ret.map { |str| self.class.new(str) } if !self.instance_of?(String)

    # Taint all
    ret = ret.map { |str| str.taint } if self.tainted?

    ret
  end

  # Builds a set of characters from the <i>*strings</i> parameter(s) using the
  # procedure described for <code>String#count</code>. Returns a new string
  # where runs of the same character that occur in this set are replaced by a
  # single character. If no arguments are given, all runs of identical
  # characters are replaced by a single character.
  #
  #   "yellow moon".squeeze                  #=> "yelow mon"
  #   "  now   is  the".squeeze(" ")         #=> " now is the"
  #   "putters shoot balls".squeeze("m-z")   #=> "puters shot balls"
  def squeeze(*strings)
    (str = self.dup).squeeze!(*strings) || str
  end

  # Squeezes <i>self</i> in place, returning either <i>self</i>, or
  # <code>nil</code> if no changes were made.
  def squeeze!(*strings)
    return if length == 0
    self.modify!

    table = count_table(*strings).data

    i, j, last = 1, 0, __at__(0)
    while i < length
      c = __at__(i)
      unless c == last and table[c] == 1
        __set__(j+=1, last = c)
      end
      i += 1
    end

    if (j += 1) < length
      __replace__(self, 0, j)
      self
    else
      nil
    end
  end

  # Returns a copy of <i>self</i> with leading and trailing whitespace removed.
  #
  #   "    hello    ".strip   #=> "hello"
  #   "\tgoodbye\r\n".strip   #=> "goodbye"
  def strip
    (str = self.dup).strip! || str
  end

  # Removes leading and trailing whitespace from <i>self</i>. Returns
  # <code>nil</code> if <i>self</i> was not altered.
  def strip!
    left = lstrip!
    right = rstrip!
    left.nil? && right.nil? ? nil : self
  end

  # Returns a copy of <i>self</i> with the <em>first</em> occurrence of
  # <i>pattern</i> replaced with either <i>replacement</i> or the value of the
  # block. The <i>pattern</i> will typically be a <code>Regexp</code>; if it is
  # a <code>String</code> then no regular expression metacharacters will be
  # interpreted (that is <code>/\d/</code> will match a digit, but
  # <code>'\d'</code> will match a backslash followed by a 'd').
  #
  # If the method call specifies <i>replacement</i>, special variables such as
  # <code>$&</code> will not be useful, as substitution into the string occurs
  # before the pattern match starts. However, the sequences <code>\1</code>,
  # <code>\2</code>, etc., may be used.
  #
  # In the block form, the current match string is passed in as a parameter, and
  # variables such as <code>$1</code>, <code>$2</code>, <code>$`</code>,
  # <code>$&</code>, and <code>$'</code> will be set appropriately. The value
  # returned by the block will be substituted for the match on each call.
  #
  # The result inherits any tainting in the original string or any supplied
  # replacement string.
  #
  #   "hello".sub(/[aeiou]/, '*')               #=> "h*llo"
  #   "hello".sub(/([aeiou])/, '<\1>')          #=> "h<e>llo"
  #   "hello".sub(/./) {|s| s[0].to_s + ' ' }   #=> "104 ello"
  def sub(pattern, replacement = nil, &prc)
    raise ArgumentError, "wrong number of arguments (1 for 2)" if !replacement && !block_given?
    raise ArgumentError, "wrong number of arguments (0 for 2)" if pattern.nil?

    if match = get_pattern(pattern, true).match_from(self, 0)
      out = match.pre_match

      Regexp.last_match = match

      if replacement
        out.taint if replacement.tainted?
        replacement = StringValue(replacement).to_sub_replacement(match)
      else
        # We do this so that we always manipulate $~ in the context
        # of the passed block.
        prc.block.home.last_match = match

        replacement = yield(match[0].dup).to_s
        out.taint if replacement.tainted?
      end

      # We have to reset it again to match the specs
      Regexp.last_match = match

      out << replacement << match.post_match
      out.taint if self.tainted?
    else
      out = self
      Regexp.last_match = nil
    end

    # MRI behavior emulation. Sub'ing String subclasses doen't return the
    # subclass, they return String instances.
    unless self.instance_of?(String)
      out = self.class.new(out)
    end

    return out
  end

  # Performs the substitutions of <code>String#sub</code> in place,
  # returning <i>self</i>, or <code>nil</code> if no substitutions were
  # performed.
  def sub!(pattern, replacement = nil, &prc)
    if block_given?
      orig = self.dup
      str = sub(pattern, replacement, &prc)
    else
      str = sub(pattern, replacement)
    end

    if lm = Regexp.last_match
      Regexp.last_match = lm
      replace(str)
      return self
    else
      Regexp.last_match = nil
      return nil
    end
  end

  # Returns the successor to <i>self</i>. The successor is calculated by
  # incrementing characters starting from the rightmost alphanumeric (or
  # the rightmost character if there are no alphanumerics) in the
  # string. Incrementing a digit always results in another digit, and
  # incrementing a letter results in another letter of the same case.
  # Incrementing nonalphanumerics uses the underlying character set's
  # collating sequence.
  #
  # If the increment generates a ``carry,'' the character to the left of
  # it is incremented. This process repeats until there is no carry,
  # adding an additional character if necessary.
  #
  #   "abcd".succ        #=> "abce"
  #   "THX1138".succ     #=> "THX1139"
  #   "<<koala>>".succ   #=> "<<koalb>>"
  #   "1999zzz".succ     #=> "2000aaa"
  #   "ZZZ9999".succ     #=> "AAAA0000"
  #   "***".succ         #=> "**+"
  def succ
    self.dup.succ!
  end

  # Equivalent to <code>String#succ</code>, but modifies the receiver in
  # place.
  def succ!
    return self if length == 0

    carry = nil
    last_alnum = 0
    start = length - 1

    self.modify!

    while start >= 0
      if (s = __at__(start)).isalnum
        carry = 0
        if (?0 <= s && s < ?9) ||
           (?a <= s && s < ?z) ||
           (?A <= s && s < ?Z)
          __set__(start, String.fromCharCode(__at__(start).charCodeAt(0) + 1))
        elsif s == ?9
          __set__(start, ?0)
          carry = ?1
        elsif s == ?z
          __set__(start, carry = ?a)
        elsif s == ?Z
          __set__(start, carry = ?A)
        end

        break if carry == 0
        last_alnum = start
      end

      start -= 1
    end

    if carry.nil?
      start = length - 1
      carry = ?\001

      while start >= 0
        if __at__(start) >= 255
          __set__(start, 0)
        else
          __set__(start, String.fromCharCode(__at__(start).charCodeAt(0) + 1))
          break
        end

        start -= 1
      end
    end

    if start < 0
      splice! last_alnum, 1, carry.chr + __at__(last_alnum)
    end

    return self
  end

  alias_method :next, :succ
  alias_method :next!, :succ!

  # Returns a basic <em>n</em>-bit checksum of the characters in <i>self</i>,
  # where <em>n</em> is the optional <code>Fixnum</code> parameter, defaulting
  # to 16. The result is simply the sum of the binary value of each character in
  # <i>self</i> modulo <code>2n - 1</code>. This is not a particularly good
  # checksum.
  def sum(bits = 16)
    bits = Type.coerce_to bits, Integer, :to_int unless bits.__kind_of__ Fixnum
    i, sum = -1, 0
    sum += __at__(i) while (i += 1) < length
    sum & ((1 << bits) - 1)
  end

  # Returns a copy of <i>self</i> with uppercase alphabetic characters converted to
  # lowercase and lowercase characters converted to uppercase.
  #
  #   "Hello".swapcase          #=> "hELLO"
  #   "cYbEr_PuNk11".swapcase   #=> "CyBeR_pUnK11"
  def swapcase
    (str = self.dup).swapcase! || str
  end

  # Equivalent to <code>String#swapcase</code>, but modifies the receiver in
  # place, returning <i>self</i>, or <code>nil</code> if no changes were made.
  def swapcase!
    self.modify!
    return if length == 0

    modified = false

    i = 0
    while i < length
      c = __at__(i)
      if c.islower
        __set__(i, c.upcase)
        modified = true
      elsif c.isupper
        __set__(i, c.downcase)
        modified = true
      end
      i += 1
    end

    modified ? self : nil
  end

  # Returns the <code>Symbol</code> corresponding to <i>self</i>, creating the
  # symbol if it did not previously exist. See <code>Symbol#id2name</code>.
  #
  #   "Koala".intern         #=> :Koala
  #   s = 'cat'.to_sym       #=> :cat
  #   s == :cat              #=> true
  #   s = '@cat'.to_sym      #=> :@cat
  #   s == :@cat             #=> true
  #
  # This can also be used to create symbols that cannot be represented using the
  # <code>:xxx</code> notation.
  #
  #   'cat and dog'.to_sym   #=> :"cat and dog"
  #--
  # TODO: Add taintedness-check
  #++
  def to_sym
    raise ArgumentError, "interning empty string" if self.empty?
    raise ArgumentError, "symbol string may not contain `\\0'" if self.include?("\x00")
    __symbol_lookup__
  end
  alias_method :intern, :to_sym

  # Returns the result of interpreting leading characters in <i>self</i> as an
  # integer base <i>base</i> (between 2 and 36). Extraneous characters past the
  # end of a valid number are ignored. If there is not a valid number at the
  # start of <i>self</i>, <code>0</code> is returned. This method never raises an
  # exception.
  #
  #   "12345".to_i             #=> 12345
  #   "99 red balloons".to_i   #=> 99
  #   "0a".to_i                #=> 0
  #   "0a".to_i(16)            #=> 10
  #   "hello".to_i             #=> 0
  #   "1100101".to_i(2)        #=> 101
  #   "1100101".to_i(8)        #=> 294977
  #   "1100101".to_i(10)       #=> 1100101
  #   "1100101".to_i(16)       #=> 17826049
  # NOTE: use native implementation until Regexp is implemented
  #def to_i(base = 10)
  #  base = Type.coerce_to(base, Integer, :to_int)
  #  raise ArgumentError, "illegal radix #{base}" if base < 0
  #  self.to_inum(base)
  #end

  # Returns self if self is an instance of String,
  # else returns self converted to a String instance.
  def to_s
    self.class == String ? self : "".replace(self)
  end
  alias_method :to_str, :to_s

  # Returns a copy of <i>self</i> with the characters in <i>from_str</i> replaced
  # by the corresponding characters in <i>to_str</i>. If <i>to_str</i> is
  # shorter than <i>from_str</i>, it is padded with its last character. Both
  # strings may use the c1--c2 notation to denote ranges of characters, and
  # <i>from_str</i> may start with a <code>^</code>, which denotes all
  # characters except those listed.
  #
  #    "hello".tr('aeiou', '*')    #=> "h*ll*"
  #    "hello".tr('^aeiou', '*')   #=> "*e**o"
  #    "hello".tr('el', 'ip')      #=> "hippo"
  #    "hello".tr('a-y', 'b-z')    #=> "ifmmp"
  def tr(source, replacement)
    (str = self.dup).tr!(source, replacement) || str
  end

  # Translates <i>self</i> in place, using the same rules as
  # <code>String#tr</code>. Returns <i>self</i>, or <code>nil</code> if no
  # changes were made.
  def tr!(source, replacement)
    tr_trans(source, replacement, false)
  end

  # Processes a copy of <i>self</i> as described under <code>String#tr</code>,
  # then removes duplicate characters in regions that were affected by the
  # translation.
  #
  #    "hello".tr_s('l', 'r')     #=> "hero"
  #    "hello".tr_s('el', '*')    #=> "h*o"
  #    "hello".tr_s('el', 'hx')   #=> "hhxo"
  def tr_s(source, replacement)
    (str = self.dup).tr_s!(source, replacement) || str
  end

  # Performs <code>String#tr_s</code> processing on <i>self</i> in place,
  # returning <i>self</i>, or <code>nil</code> if no changes were made.
  def tr_s!(source, replacement)
    tr_trans(source, replacement, true)
  end

  # Returns a copy of <i>self</i> with all lowercase letters replaced with their
  # uppercase counterparts. The operation is locale insensitive---only
  # characters ``a'' to ``z'' are affected.
  #
  #   "hEllO".upcase   #=> "HELLO"
  def upcase
    (str = self.dup).upcase! || str
  end

  def tr_trans(source, replacement, squeeze)
    source = StringValue(source).dup
    replacement = StringValue(replacement).dup

    self.modify!

    return self.delete!(source) if replacement.empty?
    return if length == 0

    invert = source[0] == ?^ && source.length > 1
    expanded = source.tr_expand! nil
    size = source.size

    if invert
      replacement.tr_expand! nil
      r = replacement.__at__(replacement.size-1)
      table = Tuple.template 256, r

      i = 0
      while i < size
        table[source.__at__(i)] = -1
        i += 1
      end
    else
      table = Tuple.template 256, -1

      replacement.tr_expand! expanded
      rsize = replacement.size
      i = 0
      while i < size
        r = replacement.__at__(i) if i < rsize
        table[source.__at__(i)] = r
        i += 1
      end
    end

    self.modify!
    modified = false

    if squeeze
      i, j, last = -1, -1, nil
      while (i += 1) < length
        s = __at__(i)
        c = table[s]
        if c >= 0
          next if last == c
          __set__(j+=1, last = c)
          modified = true
        else
          __set__(j+=1, s)
          last = nil
        end
      end

      __replace__(self, 0, j) if (j += 1) < length
    else
      i = 0
      while i < length
        c = table[__at__(i)]
        if c >= 0
          __set__(i, c)
          modified = true
        end
        i += 1
      end
    end

    return modified ? self : nil
  end

  def to_sub_replacement(match)
    index = 0
    result = ""
    while index < length
      current = index
      while current < length && __at__(current) != ?\\
        current += 1
      end
      result << substring(index, current - index)
      break if current == length

      # found backslash escape, looking next
      if current == length - 1
        result << ?\\ # backslash at end of string
        break
      end
      index = current + 1

      result << case (cap = __at__(index))
        when ?&
          match[0]
        when ?` # `
          match.pre_match
        when ?' # '
          match.post_match
        when ?+
          match.captures.compact[-1].to_s
        when ?0..?9
          match[cap - ?0].to_s
        when ?\\ # escaped backslash
          '\\'
        else     # unknown escape
          '\\' << cap
      end
      index += 1
    end
    return result
  end

  def to_inum(base, check = false, detect_base = false)
    detect_base = true if base == 0

    raise(ArgumentError,
          "invalid value for Integer: #{inspect}") if check and self =~ /__/

    s = if check then
          self.strip
        else
          self.delete('_').strip
        end

    if detect_base then
      base = if s =~ /^[+-]?0([bdox]?)/i then
               {"b" => 2, "d" => 10, "o" => 8, '' => 8, "x" => 16}[$1.downcase]
             else
               base == 8 ? 8 : 10
             end
    end

    raise ArgumentError, "illegal radix #{base}" unless (2..36).include? base

    match_re = case base
               when  2 then
                 /([+-])?(?:0b)?([a-z0-9_]*)/ix
               when  8 then
                 /([+-])?(?:0o)?([a-z0-9_]*)/ix
               when 10 then
                 /([+-])?(?:0d)?([a-z0-9_]*)/ix
               when 16 then
                 /([+-])?(?:0x)?([a-z0-9_]*)/ix
               else
                 /([+-])?       ([a-z0-9_]*)/ix
               end

    match_re = /^#{match_re}$/x if check # stupid /x for emacs lameness

    sign = data = nil
    sign, data = $1, $2 if s =~ match_re

    raise ArgumentError, "error in impl parsing: #{self.inspect} with #{match_re.source}" if
      data.nil? || (check && (s =~ /^_/ || data.empty? ))

    negative = sign == "-"
    result = 0

    data.each_byte do |char|
      value = case char
              when ?0..?9 then
                (char - ?0)
              when ?A..?Z then
                (char - ?A + 10)
              when ?a..?z then
                (char - ?a + 10)
              when ?_ then
                next
              else
                nil
              end

      if value.nil? or value >= base then
        raise ArgumentError, "invalid value for Integer: #{inspect}" if check
        return negative ? -result : result
      end

      result *= base
      result += value
    end

    return negative ? -result : result
  end

  def apply_and!(other)
    Ruby.primitive :string_apply_and
    raise PrimitiveFailure, "String#apply_and! primitive failed"
  end

  def compare_substring(other, start, size)
    Ruby.primitive :string_compare_substring
    if start > length || start + length < 0
      raise IndexError, "index #{start} out of string"
    end
    raise PrimitiveFailure, "String#compare_substring primitive failed"
  end

  def count_table(*strings)
    table = String.template 256, "1"

    i, size = 0, strings.size
    while i < size
      str = StringValue(strings[i]).dup
      if str.size > 1 && str[0] == ?^
        pos, neg = "0", "1"
      else
        pos, neg = "1", "0"
      end

      set = String.template 256, neg
      str.tr_expand! nil
      j, chars = -1, str.size
      set[str[j]] = pos while (j += 1) < chars

      table.apply_and! set

      i += 1
    end
    table
  end

  def tr_expand!(limit)
    Ruby.primitive :string_tr_expand
    raise PrimitiveFailure, "String#tr_expand primitive failed"
  end

  def justify(width, direction, padstr=" ")
    padstr = StringValue(padstr)
    raise ArgumentError, "zero width padding" if padstr.size == 0

    width = Type.coerce_to(width, Integer, :to_int) unless width.__kind_of__ Fixnum
    if width > length
      padsize = width - length
    else
      return dup
    end

    str = self.class.new("\0") * (padsize + length)
    str.taint if tainted? or padstr.tainted?

    case direction
    when :right
      pad = String.template padsize, padstr
      str.copy_from pad, 0, padsize, 0
      str.copy_from self, 0, length, padsize
    when :left
      pad = String.template padsize, padstr
      str.copy_from self, 0, length, 0
      str.copy_from pad, 0, padsize, length
    when :center
      half = padsize / 2.0
      lsize = half.floor
      rsize = half.ceil
      lpad = String.template lsize, padstr
      rpad = String.template rsize, padstr
      str.copy_from lpad, 0, lsize, 0
      str.copy_from self, 0, length, lsize
      str.copy_from rpad, 0, rsize, lsize + length
    end

    str
  end

  # Unshares shared strings.
  def modify!
    # Sharing is not supported in HotRuby.
  end

  # Raises RuntimeError if either the ByteArray object_id
  # or the size has changed.
  def modified?(id, size)
    # Probably we don't need to check this in HotRuby.
  end

  def subpattern(pattern, capture)
    # TODO: A part of the functionality here should go into MatchData#[]
    match = pattern.match(self)
    if !match or capture >= match.size
      return nil
    end

    if capture < 0
      capture += match.size
      return nil if capture <= 0
    end

    start = match.begin(capture)
    count = match.end(capture) - match.begin(capture)
    str = self.substring(start, count)
    str.taint if pattern.tainted?
    [match, str]
  end

  def subpattern_set(pattern, capture, replacement)
    unless match = pattern.match(self)
      raise IndexError, "regexp not matched"
    end

    raise IndexError, "index #{index} out of regexp" if capture >= match.size

    if capture < 0
      raise IndexError, "index #{index} out of regexp" if -capture >= match.size
      capture += match.size
    end

    start  = match.begin(capture)
    len = match.end(capture) - start
    splice! start, len, replacement
  end

  def splice!(start, count, replacement)
    start += length if start < 0
    raise IndexError, "index #{start} out of string" if start > length || start < 0
    raise IndexError, "negative length #{count}" if count < 0
    replacement = StringValue replacement
    modify!

    count = length - start if start + count > length
    size = start < length ? length - count : length
    rsize = replacement.size

    str = self.class.new("\0") * (size + rsize)
    str.taint if tainted? || replacement.tainted?

    last = start + count
    str.copy_from self, 0, start, 0 if start > 0
    str.copy_from replacement, 0, rsize, start
    str.copy_from self, last, length - last, start + rsize if last < length

    replace str
  end

  # FIXME - Make Unicode-safe
  def codepoints
    chars = []
    i = 0
    while i < length
      chars << self.substring(i, 1)
      i += 1
    end
    chars
  end

  def prefix?(other)
    size = other.size
    return false if size > length
    other.compare_substring(self, 0, size) == 0
  end

  def suffix?(other)
    size = other.size
    return false if size > length
    other.compare_substring(self, -size, size) == 0
  end

  # TODO: inspect is NOT dump!
  def dump
    kcode = $KCODE
    $KCODE = "NONE"
    str = self.class.new self.inspect
    $KCODE = kcode
    str.taint if tainted?
    str
  end

  def to_sexp(name="(eval)",line=1,newlines=true)
    out = to_sexp_full(name, line, newlines)
    if out.kind_of? Tuple
      exc = SyntaxError.new out.at(0)
      exc.import_position out.at(1), out.at(2), out.at(3)
      exc.file = name
      raise exc
    end

    out = [:newline, 0, "<empty: #{name}>", [:nil]] unless out
    out
  end

  def shared!
    @shared = true
  end

  def get_pattern(pattern, quote = false)
    unless pattern.is_a?(String) || pattern.is_a?(Regexp)
      if pattern.respond_to?(:to_str)
        pattern = pattern.to_str
      else
        raise TypeError, "wrong argument type #{pattern.class} (expected Regexp)"
      end
    end
    pattern = Regexp.quote(pattern) if quote && pattern.is_a?(String)
    pattern = Regexp.new(pattern) unless pattern.is_a?(Regexp)
    pattern
  end

  def full_to_i
    err = "invalid value for Integer: #{self.inspect}"
    raise ArgumentError, err if self.match(/__/) || self.empty?
    case self
    when /^[-+]?0(\d|_\d)/
      raise ArgumentError, err if self =~ /[^0-7_]/
      to_i(8)
    when /^[-+]?0x[a-f\d]/i
      after = self.match(/^[-+]?0x/i)
      raise ArgumentError, err if /([^0-9a-f_])/i.match_from(self, after.end(0))
      to_i(16)
    when /^[-+]?0b[01]/i
      after = self.match(/^[-+]?0b/i)
      raise ArgumentError, err if /[^01_]/.match_from(self, after.end(0))
      to_i(2)
    when /^[-+]?\d/
      raise ArgumentError, err if self.match(/[^0-9_]/)
      to_i(10)
    else
      raise ArgumentError, err
    end
  end

  def upto(stop)
    stop = StringValue(stop)
    return self if self > stop

    after_stop = stop.succ
    current = self

    until current == after_stop
      yield current
      current = StringValue(current.succ)
      break if current.size > stop.size || current.size == 0
    end

    self
  end

  ##
  #  call-seq:
  #     str.unpack(format)   => anArray
  #
  #  Decodes <i>str</i> (which may contain binary data) according to
  #  the format string, returning an array of each value
  #  extracted. The format string consists of a sequence of
  #  single-character directives, summarized in the table at the end
  #  of this entry.
  #
  #  Each directive may be followed by a number, indicating the number
  #  of times to repeat with this directive. An asterisk
  #  (``<code>*</code>'') will use up all remaining elements. The
  #  directives <code>sSiIlL</code> may each be followed by an
  #  underscore (``<code>_</code>'') to use the underlying platform's
  #  native size for the specified type; otherwise, it uses a
  #  platform-independent consistent size. Spaces are ignored in the
  #  format string. See also <code>Array#pack</code>.
  #
  #     "abc \0\0abc \0\0".unpack('A6Z6')   #=> ["abc", "abc "]
  #     "abc \0\0".unpack('a3a3')           #=> ["abc", " \000\000"]
  #     "abc \0abc \0".unpack('Z*Z*')       #=> ["abc ", "abc "]
  #     "aa".unpack('b8B8')                 #=> ["10000110", "01100001"]
  #     "aaa".unpack('h2H2c')               #=> ["16", "61", 97]
  #     "\xfe\xff\xfe\xff".unpack('sS')     #=> [-2, 65534]
  #     "now=20is".unpack('M*')             #=> ["now is"]
  #     "whole".unpack('xax2aX2aX1aX2a')    #=> ["h", "e", "l", "l", "o"]
  #
  #  This table summarizes the various formats and the Ruby classes
  #  returned by each.
  #
  #     Format | Returns | Function
  #     -------+---------+-----------------------------------------
  #       A    | String  | with trailing nulls and spaces removed
  #     -------+---------+-----------------------------------------
  #       a    | String  | string
  #     -------+---------+-----------------------------------------
  #       B    | String  | extract bits from each character (msb first)
  #     -------+---------+-----------------------------------------
  #       b    | String  | extract bits from each character (lsb first)
  #     -------+---------+-----------------------------------------
  #       C    | Fixnum  | extract a character as an unsigned integer
  #     -------+---------+-----------------------------------------
  #       c    | Fixnum  | extract a character as an integer
  #     -------+---------+-----------------------------------------
  #       d,D  | Float   | treat sizeof(double) characters as
  #            |         | a native double
  #     -------+---------+-----------------------------------------
  #       E    | Float   | treat sizeof(double) characters as
  #            |         | a double in little-endian byte order
  #     -------+---------+-----------------------------------------
  #       e    | Float   | treat sizeof(float) characters as
  #            |         | a float in little-endian byte order
  #     -------+---------+-----------------------------------------
  #       f,F  | Float   | treat sizeof(float) characters as
  #            |         | a native float
  #     -------+---------+-----------------------------------------
  #       G    | Float   | treat sizeof(double) characters as
  #            |         | a double in network byte order
  #     -------+---------+-----------------------------------------
  #       g    | Float   | treat sizeof(float) characters as a
  #            |         | float in network byte order
  #     -------+---------+-----------------------------------------
  #       H    | String  | extract hex nibbles from each character
  #            |         | (most significant first)
  #     -------+---------+-----------------------------------------
  #       h    | String  | extract hex nibbles from each character
  #            |         | (least significant first)
  #     -------+---------+-----------------------------------------
  #       I    | Integer | treat sizeof(int) (modified by _)
  #            |         | successive characters as an unsigned
  #            |         | native integer
  #     -------+---------+-----------------------------------------
  #       i    | Integer | treat sizeof(int) (modified by _)
  #            |         | successive characters as a signed
  #            |         | native integer
  #     -------+---------+-----------------------------------------
  #       L    | Integer | treat four (modified by _) successive
  #            |         | characters as an unsigned native
  #            |         | long integer
  #     -------+---------+-----------------------------------------
  #       l    | Integer | treat four (modified by _) successive
  #            |         | characters as a signed native
  #            |         | long integer
  #     -------+---------+-----------------------------------------
  #       M    | String  | quoted-printable
  #     -------+---------+-----------------------------------------
  #       m    | String  | base64-encoded
  #     -------+---------+-----------------------------------------
  #       N    | Integer | treat four characters as an unsigned
  #            |         | long in network byte order
  #     -------+---------+-----------------------------------------
  #       n    | Fixnum  | treat two characters as an unsigned
  #            |         | short in network byte order
  #     -------+---------+-----------------------------------------
  #       P    | String  | treat sizeof(char *) characters as a
  #            |         | pointer, and  return \emph{len} characters
  #            |         | from the referenced location
  #     -------+---------+-----------------------------------------
  #       p    | String  | treat sizeof(char *) characters as a
  #            |         | pointer to a  null-terminated string
  #     -------+---------+-----------------------------------------
  #       Q    | Integer | treat 8 characters as an unsigned
  #            |         | quad word (64 bits)
  #     -------+---------+-----------------------------------------
  #       q    | Integer | treat 8 characters as a signed
  #            |         | quad word (64 bits)
  #     -------+---------+-----------------------------------------
  #       S    | Fixnum  | treat two (different if _ used)
  #            |         | successive characters as an unsigned
  #            |         | short in native byte order
  #     -------+---------+-----------------------------------------
  #       s    | Fixnum  | Treat two (different if _ used)
  #            |         | successive characters as a signed short
  #            |         | in native byte order
  #     -------+---------+-----------------------------------------
  #       U    | Integer | UTF-8 characters as unsigned integers
  #     -------+---------+-----------------------------------------
  #       u    | String  | UU-encoded
  #     -------+---------+-----------------------------------------
  #       V    | Fixnum  | treat four characters as an unsigned
  #            |         | long in little-endian byte order
  #     -------+---------+-----------------------------------------
  #       v    | Fixnum  | treat two characters as an unsigned
  #            |         | short in little-endian byte order
  #     -------+---------+-----------------------------------------
  #       w    | Integer | BER-compressed integer (see Array.pack)
  #     -------+---------+-----------------------------------------
  #       X    | ---     | skip backward one character
  #     -------+---------+-----------------------------------------
  #       x    | ---     | skip forward one character
  #     -------+---------+-----------------------------------------
  #       Z    | String  | with trailing nulls removed
  #            |         | upto first null with *
  #     -------+---------+-----------------------------------------
  #       @    | ---     | skip to the offset given by the
  #            |         | length argument
  #     -------+---------+-----------------------------------------

  def unpack(format)

    # some of the directives work when repeat == 0 because of this behavior:
    # str[0...0] == '' and str[1..0] == ''

    raise TypeError, "can't convert nil into String" if format.nil?

    i = 0
    elements = []
    length = self.length

    schema = format.scan(/([@a-zA-Z])(-?\d+|[\*_])?/).map { |c, n|
      # n in (nil, -num, num, "*", "_")
      [c, n.nil? || n =~ /\*|_/ ? n : Integer(n)]
    }

    schema.each do |code, count|

      count = nil if Fixnum === count and count < 0
      count ||= code == "@" ? 0 : 1

      # TODO: profile avg occurances and reorder case
      case code
      when 'A' then
        new_pos, str = if i >= length then
                         [i, '']
                       elsif count == '*' then
                         [length, self[i..-1]]
                       else
                         new_pos = i + count
                         [new_pos,
                          new_pos <= length ? self[i...new_pos] : self[i..-1]]
                       end
        i = new_pos
        elements << str.sub(/[\x00\x20]+\Z/, '')
      when 'a' then
        if i >= length then
          elements << ''
        elsif count == '*' then
          elements << self[i..-1]
          i = length
        else
          nnd = i + count
          s = if i + count <= length then
                self[i...nnd]
              else
                self[i..-1]
              end
          elements << s
          i = nnd
        end
      when 'B', 'b', 'H', 'h' then
        lsb = code =~ /[bh]/
        fmt = case code
              when /[Bb]/ then "%08b"
              when /[Hh]/ then "%02x"
              end

        if i >= length then
          elements << ''
        elsif count == '*' then
          a = self[i..-1].split(//).map { |c| fmt % c[0] }
          a.map! { |s| s.reverse } if lsb
          elements << a.join
          i = length
        else
          case code
          when /[Bb]/ then
            num_bytes, r = count.divmod(8)
            num_drop = r != 0 ? 8 - r : 0
          when /[Hh]/ then
            num_bytes, r = (count * 4).divmod(8)
            num_drop = r != 0 ? 1 : 0
          end
          num_bytes += 1 if r != 0
          str0 = if i + num_bytes <= length then
                   self[i...(i + num_bytes)]
                 else
                   self[i..-1]
                 end
          len = str0.length
          str1 = ''
          str0.each_byte { |n|
            len -= 1
            s = fmt % n
            str1 << if lsb then
                      len == 0 ? s[num_drop..-1].reverse : s.reverse
                    else
                      len == 0 ? s[0..-num_drop.succ]    : s
                    end
          }
          elements << str1
          i += num_bytes
        end
      when /[CcDdEeFfGgIiLlNnQqSsVv]/ then
        num_bytes = case code
                    when /[DdEGQq]/ then 8
                    when /[eFfgNV]/ then 4
                    when /[nSsv]/   then 2
                    when /[Cc]/     then 1
                    when /[IiLl]/   then 1.size
                    end

        size = case code
               when /[NncGg]/          then :big
               when /[CILQSilqsFfDd]/ then :native
               when /[VveE]/          then :little
               else
                 raise "huh? #{code.inspect}"
               end

        star = count == '*'
        count = length - i if star
        count.times do |j|
          if i + num_bytes > length
            break if star
            elements << nil if code != 'Q'
          else
            start    = i
            offset   = num_bytes - 1
            endian   = size
            n        = exp = 0
            bytebits = 8

            if :big == endian || (:native == endian && endian?(:big)) then
              exp      =  bytebits * offset
              bytebits = -bytebits
            end

            (start..start + offset).each do |x|
              n   += (self[x] * 2**exp)
              exp += bytebits
            end

            case code
            when /[NnCILQSVv]/ then
              elements << n
            when /[ilqsc]/ then
              max = 2 ** (num_bytes * 8 - 1)
              n = n >= max ? -(2**(num_bytes*8) - n) : n
              elements << n
            when /[eFfg]/ then
              sign   = (2**31 & n != 0) ? -1 : 1
              expo   = ((0xFF * 2**23) & n) >> 23
              frac   = (2**23 - 1) & n
              result = if expo == 0 and frac == 0 then
                         sign.to_f * 0.0    # zero
                       elsif expo == 0 then # denormalized
                         sign * 2**(expo - 126) * (frac.to_f / 2**23.to_f)
                       elsif expo == 0xFF and frac == 0 then
                         sign.to_f / 0.0    # Infinity
                       elsif expo == 0xFF then
                         0.0 / 0.0          # NaN
                       else                 # normalized
                         sign * 2**(expo - 127) * (1.0 + (frac.to_f / 2**23.to_f))
                       end
              elements << result
            when /[DdEG]/ then
              sign   = (2**63 & n != 0) ? -1 : 1
              expo   = ((0x7FF * 2**52) & n) >> 52
              frac   = (2**52 - 1) & n
              result = if expo == 0 and frac == 0 then
                         sign.to_f * 0.0    # zero
                       elsif expo == 0 then # denormalized
                         sign * 2**(expo - 1022) * (frac.to_f / 2**52.to_f)
                       elsif expo == 0x7FF and frac == 0 then
                         sign.to_f / 0.0    # Infinity
                       elsif expo == 0x7FF then
                         0.0 / 0.0          # NaN
                       else                 # normalized
                         sign * 2**(expo-1023) * (1.0 + (frac.to_f / 2**52.to_f))
                       end
              elements << result
            end
            i += num_bytes
          end
        end
      when 'M' then
        if i >= length then
          elements << ''
        else
          str              = ''
          num_bytes        = 0
          regex_permissive = / \= [0-9A-Fa-f]{2} | [^=]+ | [\x00-\xFF]+ /xn
          regex_junk       = / \A ( \= [0-9A-Fa-f]{0,1} )               /xn
          regex_strict     = / \A (?: \= [0-9A-Fa-f]{2} | [^=]+ )    \Z /xn
          regex_hex        = / \A \= ([0-9A-Fa-f]{2})                \Z /xn

          self[i..-1].scan(regex_permissive) do |s|
            if s =~ regex_strict then
              num_bytes += s.length
              s = $1.hex.chr if s =~ regex_hex
              str << s
            elsif s =~ regex_junk
              num_bytes += $1.length
            end
          end

          elements << str
          i += num_bytes
        end
      when 'm' then
        if i >= length
          elements << ''
        else
          buffer    = ''
          str       = ''
          num_bytes = 0

          b64_regex_permissive = /[A-Za-z0-9+\/]{4} |[A-Za-z0-9+\/]{3} \=?
            |[A-Za-z0-9+\/]{2}\={0,2} |[A-Za-z0-9+\/]\={0,3} |[^A-Za-z0-9+\/]+/x

          self[i..-1].scan(b64_regex_permissive) do |s|
            num_bytes += s.length

            b64_regex_strict = /\A (?:[A-Za-z0-9+\/]{4} |[A-Za-z0-9+\/]{3} \=?
              |[A-Za-z0-9+\/]{2} \={0,2} |[A-Za-z0-9+\/] \={0,3} ) \Z /x

            if s =~ b64_regex_strict then

              s << '=' while s.length != 4 if s =~ /=\Z/

              # TODO: WHY?
              if buffer == '' and s =~ /\A([A-Za-z0-9+\/])\=+\Z/ then
                buffer << $1
              else
                buffer << s
              end

              process = buffer.length >= 4

              if process then
                s      = buffer[0..3]
                buffer = buffer[4..-1]

                a = BASE_64_A2B[s[0]]
                b = BASE_64_A2B[s[1]]
                c = BASE_64_A2B[s[2]]
                d = BASE_64_A2B[s[3]]

                # http://www.opengroup.org/onlinepubs/009695399/utilities/uuencode.html
                decoded = [a << 2 | b >> 4,
                           (b & (2**4 - 1)) << 4 | c >> 2,
                           (c & (2**2 - 1)) << 6 | d].pack('CCC')

                if s[3].chr == '='
                  num_bytes -= 1
                  decoded = decoded[0..-2]
                  decoded = decoded[0..-2] if s[2].chr == '='
                  str << decoded
                  break
                else
                  str << decoded
                end
              end
            end
          end
          elements << str
          i += num_bytes
        end
      when 'U' then
        utf8_regex_strict = /\A(?:[\x00-\x7F]
                                 |[\xC2-\xDF][\x80-\xBF]
                                 |[\xE1-\xEF][\x80-\xBF]{2}
                                 |[\xF1-\xF7][\x80-\xBF]{3}
                                 |[\xF9-\xFB][\x80-\xBF]{4}
                                 |[\xFD-\xFD][\x80-\xBF]{5} )\Z/xn

        utf8_regex_permissive = / [\x00-\x7F]
                                 |[\xC0-\xDF][\x80-\xBF]
                                 |[\xE0-\xEF][\x80-\xBF]{2}
                                 |[\xF0-\xF7][\x80-\xBF]{3}
                                 |[\xF8-\xFB][\x80-\xBF]{4}
                                 |[\xFC-\xFD][\x80-\xBF]{5}
                                 |[\x00-\xFF]+ /xn

        if i >= length then
          # do nothing?!?
        else
          num_bytes = 0
          self[i..-1].scan(utf8_regex_permissive) do |c|
            raise ArgumentError, "malformed UTF-8 character" if
              c !~ utf8_regex_strict

            break if count == 0

            if false then
              elements << c.utf8_code_value
              num_bytes += c.length
            else
              len = c.length
              if len == 1
                result = c[0]
              else
                shift = (len - 1) * 2
                result = (((2 ** (8 - len.succ) - 1) & c[0]) *
                          2 ** ((len - 1) * 8)) >> shift
                (1...(len - 1)).each do |x|
                  shift -= 2
                  result |= (((2 ** 6 - 1) & c[x]) *
                               2 ** ((len - x.succ) * 8)) >> shift
                end
                result |= (2 ** 6 - 1) & c[-1]
              end
              elements << result
              num_bytes += len
            end

            count -= 1 if count != '*'
          end
          i += num_bytes
        end
      when 'X' then
        count = length - i if count == '*'

        raise ArgumentError, "X outside of string" if count < 0 or i - count < 0
        i -= count
      when 'x' then
        if count == '*' then
          raise ArgumentError, "x outside of string" if i > length
          i = length
        else
          raise ArgumentError, "x outside of string" if i + count > length
          i += count
        end
      when 'Z' then
        if i >= length then
          elements << ''
        elsif count == '*' then
          self[i..-1] =~ / \A ( [^\x00]* ) ( [\x00]? ) /x
          elements << $1
          i += $1.length
          i += 1 if $2 == "\0"
        else
          str = i + count <= length ? self[i...(i + count)] : self[i..-1]
          str =~ / \A ( [^\x00]* ) /x
          elements << $1
          i += count
        end
      when '@' then
        if count == '*' then
          i = length
        else
          raise ArgumentError, "@ outside of string" if count > length
          i = count > 0 ? count : 0
        end
      else
        # raise "unknown directive: #{code.inspect}"
      end
    end

    elements
  end

=begin

  # Should be added when Crypt is required
  def crypt(other_str)
    raise NotImplementedError
  end

=end

end
