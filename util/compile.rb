$LOAD_PATH << "./lib"
require "pp"
require "json"
require "optparse"
require "hrwt"

=begin
OutputCompileOption = {
  :peephole_optimization    =>true,
  :inline_const_cache       =>true,
  :specialized_instruction  =>true,
  :operands_unification     =>true,
  :instructions_unification =>true,
  :stack_caching            =>true,
}
=end
OutputCompileOption = {
  :peephole_optimization    =>true,
  :inline_const_cache       =>false,
  :specialized_instruction  =>false,
  :operands_unification     =>false,
  :instructions_unification =>false,
  :stack_caching            =>false,
}

def compile(path)
  return VM::InstructionSequence.compile(IO.read(path), "src", 1, OutputCompileOption)
end

@opts = OptionParser.getopts("aj")

if @opts["a"]
  pp compile(ARGV[0]).to_a()
elsif @opts["j"]
  puts HRWT.compile(IO.read(ARGV[0]), false)
else
  puts compile(ARGV[0]).disasm
end
