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
	ID          string
	ConnectedAt time.Time
	LastSeen    time.Time
}

type TCPServer struct {
	Addr      string // Port
	Publisher pahomqtt.Client

	Boards   map[string]*Board
	BoardsMu sync.RWMutex

	Conns   map[string]net.Conn
	ConnsMu sync.RWMutex

	BoardToConn   map[string]string // boardID -> connID
	BoardToConnMu sync.RWMutex
}

const (
	staleAfter = 5 * time.Second
)

func NewTCPServer(addr string, pub pahomqtt.Client) *TCPServer {
	return &TCPServer{
		Addr:      addr,
		Publisher: pub,
		Boards:    make(map[string]*Board),
		Conns:     make(map[string]net.Conn),
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

		id := conn.RemoteAddr().String()
		s.ConnsMu.Lock()
		s.Conns[id] = conn
		s.ConnsMu.Unlock()

		go s.readBoard(id, conn)
	}
}

func (s *TCPServer) readBoard(id string, conn net.Conn) error {
	defer conn.Close()

	// Unregister connection when exiting
	defer func() {
		s.ConnsMu.Lock()
		delete(s.Conns, id)
		s.ConnsMu.Unlock()

		s.BoardsMu.Lock()
		delete(s.Boards, id)
		s.BoardsMu.Unlock()
	}()

	reader := bufio.NewReader(conn)
	var boardID string
	registered := false

	for {
		// Timeout if no data received within 15 seconds
		conn.SetReadDeadline(time.Now().Add(staleAfter))
		message, err := reader.ReadString('\n')

		if err != nil {
			if err == io.EOF {
				fmt.Printf("Read error: %v", err, conn.RemoteAddr())
			} else {
				log.Printf("Read error: %v", err)
			}
			return err
		}

		line := strings.TrimSpace(message)
		fmt.Printf("Received: %s", line)
		if line == "" {
			// No message received from the board
			s.BoardsMu.RLock()
			continue
		}

		// 0 - 2 is accelerometer data
		// 3 - 5 is gyrometer data
		// 6 is fallStatus
		// 7 is the board number

		// Publish to MQTT Broker
		fields := strings.Split(line, ",")

		// TODO: Create and Move verification into a different package
		if len(fields) != 8 {
			log.Printf("Invalid message (len=%d) from %s: %q", len(fields), conn.RemoteAddr(), line)
			continue
		}

		// First message is to establish board identity
		if !registered {
			boardID = fields[7]

			s.BoardToConnMu.RLock()
			existing, exists := s.BoardToConn[boardID]
			s.BoardToConnMu.RUnlock()

			if exists {
				s.BoardsMu.RLock()
				existingBoard := s.Boards[existing]
				s.BoardsMu.RUnlock()

				stale := existingBoard == nil || time.Since(existingBoard.LastSeen) > 10*time.Second
				if !stale {
					return fmt.Errorf("duplicate boardID %s", boardID)
				} else {
					// Connection is stale
					s.ConnsMu.RLock()
					oldConn := s.Conns[existing]
					s.ConnsMu.RUnlock()

					if oldConn != nil {
						log.Printf("Closing stale connection for board %s (%s)", boardID, existing)
						_ = oldConn.Close()
					}
				}

			}

			s.BoardsMu.Lock()
			s.Boards[id] = &Board{
				ID:          boardID,
				ConnectedAt: time.Now(),
				LastSeen:    time.Now(),
			}
			s.BoardsMu.Unlock()
			registered = true
		} else {
			// Update LastSeen since message
			// has been successfully receieved
			now := time.Now()
			s.BoardsMu.Lock()
			b := s.Boards[id]
			if b != nil {
				b.LastSeen = now
			}
			s.BoardsMu.Unlock()
		}

		sensorTopic := "fall-detection/board" + boardID + "/sensors"
		alertTopic := "fall-detection/board" + boardID + "/alerts"

		mqtt.Publish(s.Publisher, sensorTopic, line)

		if fields[6] == "1" {
			mqtt.Publish(s.Publisher, alertTopic, line)
		}

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
