package tcp

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net"
	"strings"
)

const (
	PORT = ":8090"
)

func StartTcp() {
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
	}

}
