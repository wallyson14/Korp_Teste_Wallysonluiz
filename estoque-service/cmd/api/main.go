// aqui no meu main eu faço a configuração inicial do serviço, como carregar as variáveis de ambiente, configurar o banco de dados e iniciar o servidor HTTP usando o framework Gin.

package main

import (
	"log"
	"os"

	"estoque-service/internal/infra/database"
	httpTransport "estoque-service/internal/transport/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// aqi carrega variáveis do .env, que deifini.
	if err := godotenv.Load(); err != nil {
		log.Println(".env não encontrado, usando variáveis do sistema")
	}

	// modo release, para produção.
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// conexão com banco de dados
	database.ConnectDB()

	r := gin.New()

	// segurança
	r.SetTrustedProxies(nil)

	// middlewares serve para lidar com erros e logar requisições.
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// aqui é onde a gente define as rotas da API, e o http Transport é onde a gente implementa os handlers das rotas.
	httpTransport.Setup(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Estoque-Service iniciado na porta %s", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Falha ao iniciar servidor: %v", err)
	}
}
