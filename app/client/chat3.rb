require "hrwt/rpc_client"


HRWT.title = "HotRuby+RPC Chat (rendering whole document with Ruby, no HTML)"

@log_div = HRWT::Div.new()
@log_div.text = "Loading..."
@form = HRWT::Form.new()
@author_field = HRWT::Input.new()
@author_field.type = "text"
@author_field.size = "10"
@author_field.value = "Anonymous"
@message_field = HRWT::Input.new()
@message_field.type = "text"
@message_field.size = "60"
@say_button = HRWT::Input.new()
@say_button.type = "submit"
@say_button.value = "Say"
@form << @author_field << @message_field << @say_button
HRWT.view << @log_div << @form

@server = RPCClient.new("rpc/chat_server").root

def update_log()
  messages = @server.recent_messages(10)
  @log_div.clear_children()
  for m in messages
    @log_div << (m["author"] + ": " + m["body"]) << HRWT::Br.new()
  end
end

@form.on_submit() do |e|
  e.stop()
  @server.post(@author_field.value, @message_field.value)
  update_log()
  @message_field.value = ""
  @message_field.focus()
end

while true
  update_log()
  sleep(10)
end
