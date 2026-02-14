package main

func main() {
	client := connectToBroker()

	sub(client, "topic/test")
	publish(client, "topic/test", "hello")

}
