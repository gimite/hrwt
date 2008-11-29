require "hrwt/rpc_client"


@view = HRWT.view
#@server = ChatServer.connect()
@server = RPCClient.new("rpc/chat_server").root


def update_log()
  messages = @server.recent_messages(10)
  #@view.log.clear()
  for i in 0...messages.size
    @view.log[i].author.text = messages[i]["author"]
    @view.log[i].body.text = messages[i]["body"]
  end
  #for m in messages
  #  line = @view.log.add()
  #  line.author.text = m["author"]
  #  line.body.text = m["body"]
  #end
end

@view.form.on_submit() do |e|
  e.stop()
  @server.post(@view.author_field.value, @view.message_field.value)
  update_log()
  @view.message_field.value = ""
  @view.message_field.focus()
end

while true
  update_log()
  sleep(10)
end
