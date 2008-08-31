require "json"


module HRWT

    OutputCompileOption = {
      :peephole_optimization    =>true,
      :inline_const_cache       =>false,
      :specialized_instruction  =>false,
      :operands_unification     =>false,
      :instructions_unification =>false,
      :stack_caching            =>false,
    }

    REQUIRED_PATHS = ["lib/hrwt/builtin.rb", "lib/hrwt/rpc_base.rb", "lib/hrwt/rpc_client.rb"]
    
  module_function

    def compile(src)
      src = REQUIRED_PATHS.map(){ |s| File.read(s) }.join("") + src
      return VM::InstructionSequence.compile(src, "src", 1, OutputCompileOption).to_a().to_json()
    end
    
    def run_on_console(src, debug = false)
      inst = compile(src)
      js = <<-EOS
        load("js/hot_ruby_core.js");
        load("js/hot_ruby_util.js");
        load("js/hot_ruby_classes.js");

        var inst = (#{inst});
        Ruby.vm.debug = #{debug ? "true" : "false"};
        Ruby.vm.run(inst, function(res, ex) {
          if (ex) {
            print("Error: " + ex);
          } else {
            print("Done");
          }
        });
      EOS
      IO.popen("js", "r+") do |f|
        f.print(js)
        f.close_write()
        f.each_line() do |line|
          print(line)
        end
      end
    end

end
