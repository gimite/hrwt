require "pp"
require "json"
require "optparse"

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

@opts = OptionParser.getopts("aj")

inst = VM::InstructionSequence.compile(IO.read(ARGV[0]), "src", 1, OutputCompileOption)
if @opts["a"]
  pp inst.to_a()
elsif @opts["j"]
  puts inst.to_a().to_json()
else
  puts inst.disasm
end
