package main

import (
	"fmt"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	broker = "broker.emqx.io"
	port   = 1883
)

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	// TODO: Move these into standardized logging
	fmt.Printf("Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	// TODO: Move these into standardized logging
	fmt.Println("Connected")
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	// TODO: Move these into standardized logging
	fmt.Printf("Connect lost: %v", err)
}

func brokerConfig() *mqtt.ClientOptions {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%d", broker, port))
	opts.SetClientID("go_mqtt_client")
	opts.SetUsername("emqx")
	opts.SetPassword("public")
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler

	return opts
}

func connectToBroker() mqtt.Client {
	opts := brokerConfig()

	client := mqtt.NewClient(opts)

	if token := client.Connect(); token.Wait() && token.Error() != nil {
		// TODO: Move to centralised logging
		panic(token.Error())
	}

	return client
}
