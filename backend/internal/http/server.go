package http

import (
	"fall-detection/internal/http/handlers"
	"fall-detection/internal/http/routes"
	"fmt"

	"github.com/gin-gonic/gin"
)

type Server struct {
	engine *gin.Engine
	port   string
}

func New(port string, healthHandler handlers.HealthHandler, boardHandler *handlers.BoardHandler) *Server {
	r := gin.Default()

	routes.RegisterHealthRoutes(r, healthHandler)
	routes.RegisterBoardRoutes(r, boardHandler)

	return &Server{
		engine: r,
		port:   port,
	}
}

func (s *Server) Run() error {
	return s.engine.Run(fmt.Sprintf(":%s", s.port))
}

func (s *Server) GetEngine() *gin.Engine {
	return s.engine
}
