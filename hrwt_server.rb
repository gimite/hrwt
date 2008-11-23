if RUBY_VERSION != "1.9.0" || !(15660..15664).include?(RUBY_REVISION)
  $stderr.puts("HRWT runs only on Ruby 1.9.0-1 (2008-03-01 revision 15664).")
  $stderr.puts("If you want to try on other version, edit the condition in hrwt_server.rb")
  $stderr.puts("and probably you also need some code modification.")
  exit(1)
end

$LOAD_PATH << "./lib"
require "optparse"
require "webrick"
require "hrwt"


def compile(src, req, res)
  res["Content-Type"] = "text/javascript"
  res.body = HRWT.compile(src)
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
server.mount("/images", WEBrick::HTTPServlet::FileHandler, "./app/images")

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
  if !File.exist?("app/client/#{file_name}.html")
    server.mount_proc("/#{file_name}") do |req, res|
      res["Content-Type"] = "text/html"
      template = File.read("etc/hrwt/client.rhtml")
      res.body = ERB.new(template, nil, "<>").result(binding)
    end
  end
end

Dir["app/client/*.html"].each() do |path|
  file_name = base_prefix(path)
  server.mount("/#{file_name}", WEBrick::HTTPServlet::FileHandler, path)
end

server.mount_proc("/iseq/builtin") do |req, res|
  res["Content-Type"] = "text/javascript"
  res.body = HRWT.builtin_iseqs
end

server.mount_proc("/compile") do |req, res|
  compile(req.query["src"], req, res)
end

trap("INT"){ server.shutdown() }
server.start()
