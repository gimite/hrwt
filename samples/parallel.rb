Thread.new() do
  for i in 0...3
    puts("sub " + i.to_s())
    sleep 1
  end
end

sleep(0.5)
for i in 0...3
  puts("main " + i.to_s())
  sleep 1
end
