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
      "(bootstrap_dynamic)",
      "lib/core/exception.rb",
      "lib/core/kernel.rb",
      "lib/core/misc.rb",
      "lib/core/integer.rb",
      "lib/core/enumerable.rb",
      "lib/core/comparable.rb",
      "lib/core/encoding.rb",
      "lib/core/string.rb",
      "lib/core/tuple.rb",
      "lib/core/range.rb",
      "lib/core/array.rb",
      "lib/core/hash.rb",
      "lib/core/regexp.rb",
      "lib/hrwt/builtin.rb",
      "lib/hrwt/rpc_base.rb",
      "lib/hrwt/rpc_client.rb",
    ]
    
  module_function

    def compile(src)
      return [compile_to_array(src, "(src)")].to_json()
    end
    
    def builtin_iseqs
      iseq_arys = REQUIRED_PATHS.map() do |path|
        src = path == "(bootstrap_dynamic)" ? bootstrap_dynamic_source : File.read(path)
        compile_to_array(src, path)
      end
      return iseq_arys.to_json()
    end
    
    def compile_to_array(src, file_name)
      iseq = VM::InstructionSequence.compile(src, file_name, 1, OutputCompileOption).to_a()
      return convert_iseq(iseq) # TODO: write seriously
    end
    
    def convert_iseq(obj)
      if obj.is_a?(Array)
        if obj[0] == :putobject
          obj[1] = serialize_object(obj[1])
        else
          obj.each(){ |e| convert_iseq(e) }
        end
      end
      return obj
    end
    
    def serialize_object(obj)
      case obj
        when NilClass, TrueClass, FalseClass, Integer, Float, String
          return obj
        when Regexp
          return {"type" => "regexp", "source" => obj.source, "options" => obj.options}
        when Symbol
          return {"type" => "symbol", "value" => obj.to_s()}
        when Range
          return {
            "type" => "range",
            "begin" => serialize_object(obj.begin),
            "end" => serialize_object(obj.end),
            "exclude_end" => obj.exclude_end?,
          }
        when Module
          return {"type" => "constant", "name" => obj.name}
        else
          raise("Unexpected type of object: %p" % obj)
      end
    end
    
    def bootstrap_dynamic_source
      return "RUBY_VERSION = \"#{RUBY_VERSION}\"; RUBY_REVISION = #{RUBY_REVISION}"
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
