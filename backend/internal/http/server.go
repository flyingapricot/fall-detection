package http

import (
	"fall-detection/internal/http/handlers"
	"fall-detection/internal/http/routes"
	"fmt"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Server struct {
	engine *gin.Engine
	port   string
}

func New(port string, healthHandler handlers.HealthHandler, boardHandler *handlers.BoardHandler, subscribersHandler *handlers.SubscribersHandler, fallEventsHandler *handlers.FallEventsHandler) *Server {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type"},
	}))

	routes.RegisterHealthRoutes(r, healthHandler)
	routes.RegisterBoardRoutes(r, boardHandler)
	routes.RegisterSubscribersRoutes(r, subscribersHandler)
	routes.RegisterFallEventsRoutes(r, fallEventsHandler)

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
