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

    REQUIRED_PATHS = [
      "lib/hrwt/bootstrap.rb",
      "lib/core/kernel.rb",
      "lib/core/misc.rb",
      "lib/core/integer.rb",
      "lib/core/enumerable.rb",
      "lib/core/tuple.rb",
      "lib/core/range.rb",
      "lib/core/array.rb",
      "lib/core/hash.rb",
      "lib/core/exception.rb",
      "lib/hrwt/builtin.rb",
      "lib/hrwt/rpc_base.rb",
      "lib/hrwt/rpc_client.rb",
    ]
    
  module_function

    def compile(src, require_defaults = true)
      if require_defaults
        src = REQUIRED_PATHS.map(){ |s| File.read(s) }.join("") + src
      end
      inst = VM::InstructionSequence.compile(src, "src", 1, OutputCompileOption).to_a()
      inst = convert_objects(inst) # TODO: write seriously
      return inst.to_json()
    end
    
    def convert_objects(obj)
      if obj.is_a?(Array)
        if obj[0] == :putobject
          case obj[1]
            when Symbol
              obj[1] = {"type" => "symbol", "value" => obj[1].to_s()}
            when Module
              obj[1] = {"type" => "constant", "name" => obj[1].name}
          end
        else
          obj.each(){ |e| convert_objects(e) }
        end
      end
      return obj
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
