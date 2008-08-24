require "hrwt/rpc_client"


@log_div = $native.document.getElementById("log")
@author_field = $native.document.getElementById("author")
@message_field = $native.document.getElementById("message")
@form = $native.document.getElementById("form")
@server = RPCClient.new("rpc/chat_server").root

def update_log()
  messages = @server.recent_messages(10)
  @log_div.innerHTML = messages.
    map(){ |m| CGI.escapeHTML(m["author"] + ": " + m["body"]) }.
    join("<br>")
end

on_submit = proc() do |e|
  $native.Event.stop(e)
  @server.post(@author_field.value, @message_field.value)
  update_log()
  @message_field.value = ""
  @message_field.focus()
end
$native.Event.observe(@form, "submit", on_submit, true)

while true
  update_log()
  sleep(10)
end
