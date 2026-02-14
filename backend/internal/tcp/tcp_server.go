package tcp

import (
	"bufio"
	"fall-detection/internal/mqtt"
	"fmt"
	"io"
	"log"
	"net"
	"strings"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

var publisher pahomqtt.Client

const (
	PORT = ":8090"
)

func StartTcp(pub pahomqtt.Client) {
	publisher = pub

	listener, err := net.Listen("tcp", PORT)
	if err != nil {
		log.Fatal("Error listening: ", err)
	}

	defer listener.Close()

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Println("Error accepting connection: ", err)
			continue
		}

		go readBoard(conn)
	}
}

func readBoard(conn net.Conn) {
	defer conn.Close()

	reader := bufio.NewReader(conn)
	for {
		message, err := reader.ReadString('\n')

		if err != nil {
			if err == io.EOF {
				fmt.Printf("Read error: %v", err, conn.RemoteAddr())
			} else {
				log.Printf("Read error: %v", err)
			}
			return
		}

		line := strings.TrimSpace(message)
		fmt.Printf("Received: %s", line)

		// 0 - 2 is accelerometer data
		// 3 - 5 is gyrometer data
		// 6 is fallStatus
		// 7 is the board number

		// Publish to MQTT Broker
		data := strings.Split(line, ",")

		// TODO: Move verification into a different package
		if len(data) != 8 {
			log.Println("Data from the board is not complete")
			return
		}

		boardNumber := strings.Split(line, ",")[7]
		sensorTopic := "fall-detection/board" + boardNumber + "/sensors"
		alertTopic := "fall-detection/board" + boardNumber + "/alerts"

		mqtt.Publish(publisher, sensorTopic, line)

		if len(data) >= 7 && data[6] == "1" {
			mqtt.Publish(publisher, alertTopic, line)
		}

	}

}
