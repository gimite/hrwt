if RUBY_VERSION != "1.9.0" || RUBY_REVISION != 15660
  $stderr.puts("HRWT runs only on Ruby 1.9.0-1 (2008-03-01 revision 15660).")
  $stderr.puts("If you want to try on other version, edit the condition in hrwt_server.rb")
  $stderr.puts("and probably you also need some code modification.")
  exit(1)
end

$LOAD_PATH << "./lib"
require "optparse"
require "webrick"


OutputCompileOption = {
  :peephole_optimization    =>true,
  :inline_const_cache       =>false,
  :specialized_instruction  =>false,
  :operands_unification     =>false,
  :instructions_unification =>false,
  :stack_caching            =>false,
}

REQUIRED_PATHS = ["lib/hrwt/builtin.rb", "lib/hrwt/rpc_base.rb", "lib/hrwt/rpc_client.rb"]

def compile(src, req, res)
  res["Content-Type"] = "text/javascript"
  src = REQUIRED_PATHS.map(){ |s| File.read(s) }.join("") + src
  res.body = VM::InstructionSequence.compile(src, "src", 1, OutputCompileOption).to_a().to_json()
end

def base_prefix(path)
  return File.basename(path).gsub(/\..*$/, "")
end


opts = ARGV.getopts("", "port:12006")
port = opts["port"]

server = WEBrick::HTTPServer.new(
  :Port => port,
  :MimeTypes => WEBrick::HTTPUtils.load_mime_types("config/mime.types")
)
server.mount("/js", WEBrick::HTTPServlet::FileHandler, "./js")

Dir["app/server/*.rb"].each() do |path|
  load(path)
  file_name = base_prefix(path)
  class_name = file_name.gsub(/(^|_)(.)/){ $2.upcase }
  rpc_server = Object.const_get(class_name).new()
  server.mount_proc("/rpc/#{file_name}", &rpc_server.method(:handle_request))
end

Dir["app/client/*.rb"].each() do |path|
  file_name = base_prefix(path)
  server.mount_proc("/iseq/#{file_name}") do |req, res|
    compile(File.read(path), req, res)
  end
end

Dir["app/client/*.html"].each() do |path|
  file_name = base_prefix(path)
  server.mount("/#{file_name}", WEBrick::HTTPServlet::FileHandler, path)
end

server.mount_proc("/compile") do |req, res|
  compile(req.query["src"], req, res)
end

trap("INT"){ server.shutdown() }
server.start()
