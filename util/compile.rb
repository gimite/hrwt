require "pp"
require "json"

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

inst= VM::InstructionSequence.compile(IO.read(ARGV[0]), "src", 1, OutputCompileOption)
if ARGV[1]=="a"
  pp inst.to_a
else
  puts inst.disasm
end
