package main

import "fall-detection/internal/tcp"

func main() {
	// Create mqtt client here

	go tcp.StartTcp()

	select {} // Block forever
}
