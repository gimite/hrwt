$LOAD_PATH << "./lib"
require "optparse"
require "hrwt"


@opts = OptionParser.getopts("d")
HRWT.run_on_console(IO.read(ARGV[0]), @opts["d"])
