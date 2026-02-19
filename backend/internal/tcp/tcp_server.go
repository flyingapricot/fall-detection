package tcp

import (
	"bufio"
	"fall-detection/internal/mqtt"
	"fmt"
	"io"
	"log"
	"net"
	"strings"
	"sync"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

type Board struct {
	ID          string // for board1, ID = 1
	ConnectedAt time.Time
	LastSeen    time.Time // Last seen time depends on response from DataSocket

	DataSocket net.Conn
}

type TCPServer struct {
	Addr      string // Port
	Publisher pahomqtt.Client

	Boards   map[string]*Board
	BoardsMu sync.RWMutex

	FallState   map[string]string // Tracks previous fall status per board
	FallStateMu sync.RWMutex
}

const (
	staleAfter = 5 * time.Second
)

func NewTCPServer(addr string, pub pahomqtt.Client) *TCPServer {
	return &TCPServer{
		Addr:      addr,
		Publisher: pub,
		Boards:    make(map[string]*Board),
		FallState: make(map[string]string),
	}
}

func (s *TCPServer) Start() error {
	listener, err := net.Listen("tcp", s.Addr)
	if err != nil {
		log.Fatal("Error listening: ", err)
		return err
	}

	defer listener.Close()

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Println("Error accepting connection: ", err)
			continue
		}

		go s.handleConnection(conn)
	}
}

func (s *TCPServer) handleConnection(conn net.Conn) error {
	defer conn.Close()

	reader := bufio.NewReader(conn)
	registered := false
	var boardID string;

	defer func() {
		if boardID != "" {
			s.BoardsMu.Lock()
			b := s.Boards[boardID]
			if b != nil && b.DataSocket == conn {
				b.DataSocket = nil
			}
			s.BoardsMu.Unlock()
		}
	}()


	for {
		// Timeout if no data received within 5 seconds
		conn.SetReadDeadline(time.Now().Add(staleAfter))
		message, err := reader.ReadString('\n')

		if err != nil {
			if err == io.EOF {
				fmt.Printf("Read error: %v\n", err, conn.RemoteAddr())
			} else {
				log.Printf("Read error: %v\n", err)
			}
			return err
		}

		line := strings.TrimSpace(message)
		fmt.Printf("Received: %s", line)
		if line == "" {
			// No message received from the board
			continue
		}

		// Extract the boardID from this valid message
		fields := strings.Split(line, ",")

		// TODO: Create and Move verification into a different package
		if len(fields) != 9 {
			log.Printf("Invalid message (len=%d) from %s: %q", len(fields), conn.RemoteAddr(), line)
			continue
		}

		boardID = fields[7]

		if !registered {
			// Board has been connected for the first time

			// Check if board exists
			s.BoardsMu.Lock()
			existingBoard, exists := s.Boards[boardID]
			var oldConn net.Conn

			if exists {
				// Board exists, this may either be a duplicate connection
				// or might be a stale connection
				// Both will be deleted and disconnected

				if time.Now().Sub(existingBoard.LastSeen) < staleAfter {
					// Duplicate Connection trying to connect, reject
					log.Println("[TCP SERVER] Duplicate connection")
				} else {
					// Stale connection
					log.Println("[TCP SERVER] Duplicate connection")
				}

				oldConn = existingBoard.DataSocket

			} else {
				s.Boards[boardID] = &Board{
					ID:         boardID,
					DataSocket: conn,
				}
			}

			s.Boards[boardID].ConnectedAt = time.Now()
			s.BoardsMu.Unlock()

			// Disconnect old connection
			if oldConn != nil {
				oldConn.Close()
			}

			registered = true

		}

		// Update lastSeen
		s.BoardsMu.Lock()
		s.Boards[boardID].LastSeen = time.Now()
		s.BoardsMu.Unlock()

		// 0 - 2 is accelerometer data
		// 3 - 5 is gyrometer data
		// 6 is fallStatus
		// 7 is the board number
		// 8 is the fall state (TODO)

		// Publish to MQTT Broker
		sensorTopic := "fall-detection/board" + boardID + "/sensors"

		mqtt.Publish(s.Publisher, sensorTopic, line)

		currentFall := fields[6]

		s.FallStateMu.Lock()
		prevFall := s.FallState[boardID]

		if currentFall == "1" && prevFall != "1" {
			alertTopic := "fall-detection/board" + boardID + "/alerts"
			log.Printf("[TCP Server] Sending alert to topic: %s", alertTopic)
			mqtt.Publish(s.Publisher, alertTopic, line)
		}

		s.FallState[boardID] = currentFall
		s.FallStateMu.Unlock()
	}
}

func (s *TCPServer) GetBoards() []*Board {
	s.BoardsMu.RLock()

	var result []*Board

	for _, board := range s.Boards {
		result = append(result, board)
	}

	s.BoardsMu.RUnlock()

	return result
}
