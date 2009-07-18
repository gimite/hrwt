require "hrwt/rpc_client"


@auto_reload = true
@view = HRWT.view
#@server = ChatServer.connect()
@server = RPCClient.new("rpc/chat_server").root


def update_log()
  messages = @server.recent_messages(10)
  @view.log.clear()
  for m in messages
    line = @view.log.add()
    line.author.text = m["author"]
    line.body.text = m["body"]
  end
end

@view.form.on_submit() do |e|
  e.stop()
  if @view.message_field.value != ""
    @server.post(@view.author_field.value, @view.message_field.value)
  end
  update_log()
  @view.message_field.value = ""
  @view.message_field.focus()
end

if @auto_reload
  while true
    update_log()
    sleep(10)
  end
else
  update_log()
end
