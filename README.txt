* What's HRWT?

HRWT (HotRuby Web Toolkit) is Ruby VM on JavaScript (modified HotRuby) + DRb-ish RPC.

Hopefully this will be a framework which is Ruby version of GWT (Google Web Toolkit) in the future,
which enables you to write whole Web application (both client and server) in Ruby, without JavaScript.

But currently this is EXPERIMENTAL and not useful for practical use.

Demo: http://gimite.net/rwt_demo/console


* How to use

To start server, run:
$ ruby hrwt_server.rb --port 12007

and try:
http://localhost:12007/chat
http://localhost:12007/console

Edit files in app/ to modify the applications.

Ruby must be 1.9.0-1 (2008-03-01 revision 15660):
ftp://ftp.ruby-lang.org/pub/ruby/1.9/


* Licence

Ruby Licence.


* Copyright

js/hot_ruby_*.js: id:yukoba (http://hotruby.accelart.jp/)
js/prototype-1.6.0.2.js: see the file
lib/core/*: see the file
Others: Hiroshi Ichikawa (Gimite) (http://gimite.net/)
