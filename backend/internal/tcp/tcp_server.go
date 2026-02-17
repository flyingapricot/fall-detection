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

	RecvSocket net.Conn  // Socket on board that recieves commands
	DataSocket net.Conn  // Socket on board that sends data
}

type TCPServer struct {
	Addr      string // Port
	Publisher pahomqtt.Client

	Boards   map[string]*Board
	BoardsMu sync.RWMutex
}

const (
	staleAfter = 5 * time.Second
)

func NewTCPServer(addr string, pub pahomqtt.Client) *TCPServer {
	return &TCPServer{
		Addr:      addr,
		Publisher: pub,
		Boards:    make(map[string]*Board),
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

func (s* TCPServer) handleConnection(conn net.Conn) error {
	reader := bufio.NewReader(conn)
	
	firstMsg, err := reader.ReadString('\n')
	if err != nil {
		return err
	}

	line := strings.TrimSpace(firstMsg)
	if strings.HasPrefix(line, "TYPE:CMD:") {
		boardID := strings.TrimPrefix(line, "TYPE:CMD:")
		s.registerBoard(boardID , "CMD",conn)
		s.handleRecvSocket(conn, boardID)
	} else if strings.HasPrefix(line, "TYPE:DATA:") {
		boardID := strings.TrimPrefix(line, "TYPE:DATA:")
		s.registerBoard(boardID , "DATA",conn)
		s.handleDataSocket(conn, boardID)
	} else {
		return fmt.Errorf("invalid message: %s", line)
	}

	return nil
}

func (s *TCPServer) registerBoard(boardID, socketType string, conn net.Conn) error {
    s.BoardsMu.Lock()

    b, exists := s.Boards[boardID]
    if !exists {
        b = &Board{
            ID:          boardID,
            ConnectedAt: time.Now(),
        }
        s.Boards[boardID] = b
    }

    var old net.Conn
    switch socketType {
    case "CMD":
        old = b.RecvSocket
        b.RecvSocket = conn
    case "DATA":
        old = b.DataSocket
        b.DataSocket = conn
    default:
        s.BoardsMu.Unlock()
        _ = conn.Close()
        return fmt.Errorf("invalid socketType: %s", socketType)
    }

    b.LastSeen = time.Now()
    s.BoardsMu.Unlock()

    if old != nil {
        _ = old.Close()
    }
    return nil
}

func (s *TCPServer) handleDataSocket(conn net.Conn, boardID string) error {
	defer conn.Close()

	// Unregister connection when exiting
	defer func() {
		s.BoardsMu.Lock()
		b := s.Boards[boardID]
		if b != nil && b.DataSocket == conn {
			b.DataSocket = nil
		}
		s.BoardsMu.Unlock()
	}()

	reader := bufio.NewReader(conn)

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

		// Update lastSeen
		s.BoardsMu.Lock()
		s.Boards[boardID].LastSeen = time.Now()
		s.BoardsMu.Unlock()

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

		sensorTopic := "fall-detection/board" + boardID + "/sensors"
		alertTopic := "fall-detection/board" + boardID + "/alerts"

		mqtt.Publish(s.Publisher, sensorTopic, line)

		if fields[6] == "1" {
			log.Printf("[TCP Server] Sending alert to topic: %s", alertTopic)
			mqtt.Publish(s.Publisher, alertTopic, line)
		}

	}
}

func (s *TCPServer) handleRecvSocket(conn net.Conn, boardID string) error {
	defer conn.Close()
	fmt.Printf("Recv Socket connected for board%s\n",boardID)

	defer func() {
		s.BoardsMu.Lock()
		b := s.Boards[boardID]
		if b != nil && b.RecvSocket == conn {
			b.RecvSocket = nil
		}
		s.BoardsMu.Unlock()
	}()

	buf := make([]byte,1)
	for {
		conn.SetReadDeadline(time.Now().Add(staleAfter))
		_, err := conn.Read(buf)
		if err != nil {
            if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
                // Just a timeout, connection still alive
                continue
            }

			// Actual disconnect
			fmt.Printf("Recv Socket disconnected for board%s\n", boardID)
			return err
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

func (s *TCPServer) WriteToBoard(rawBoardID string, message string) error {

	boardID := strings.TrimPrefix(rawBoardID, "board")

	s.BoardsMu.RLock()
	board, exists := s.Boards[boardID]
	s.BoardsMu.RUnlock()

	if !exists {
		return fmt.Errorf("board %s not found", boardID)
	}

	if board.RecvSocket == nil {
		return fmt.Errorf("Recv Socket Connection for board %s not found", boardID)
	}

	_, err := board.RecvSocket.Write([]byte(message))
	return err
}