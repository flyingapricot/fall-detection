package mqtt

import (
	"fall-detection/internal/config"
	"fmt"
	"log"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

var messagePubHandler pahomqtt.MessageHandler = func(client pahomqtt.Client, msg pahomqtt.Message) {
	// TODO: Move these into standardized logging
	fmt.Printf("Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())
}

var connectHandler pahomqtt.OnConnectHandler = func(client pahomqtt.Client) {
	// TODO: Move these into standardized logging
	fmt.Println("Connected")
}

var connectLostHandler pahomqtt.ConnectionLostHandler = func(client pahomqtt.Client, err error) {
	// TODO: Move these into standardized logging
	log.Printf("Connect lost: %v", err)
}

func brokerConfig(clientID string) *pahomqtt.ClientOptions {
	opts := pahomqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("ssl://%s:%s", config.MQTTBroker, config.MQTTPort))
	opts.SetClientID(clientID)
	opts.SetUsername(config.MQTTUsername)
	opts.SetPassword(config.MQTTPassword)
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler

	return opts
}

func CreateClient(clientID string) pahomqtt.Client {
	opts := brokerConfig(clientID)

	client := pahomqtt.NewClient(opts)

	if token := client.Connect(); token.Wait() && token.Error() != nil {
		// TODO: Move to centralised logging
		panic(token.Error())
	}

	return client
}
