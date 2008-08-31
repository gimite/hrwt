=begin
  You need js command of SpiderMonkey to run this test.
  Alternatively, you can run the test using Web browser:
    $ ruby hrwt_server.rb --port 12007

    and go to:
    http://localhost:12007/console
    and click [test].
  
  Actual test code is in app/client/hotruby_test.rb.
=end

$LOAD_PATH << "./lib"
require "optparse"
require "hrwt"


@opts = OptionParser.getopts("d")
HRWT.run_on_console(IO.read("app/client/hotruby_test.rb"), @opts["d"])
