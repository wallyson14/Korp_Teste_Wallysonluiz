//ja aqui entramos no faturamento-service, entao aqui no main.go configurei o servidor HTTP, que conecta ao banco e iniciar a aplicação.

package main

import (
	"log"
	"os"

	"faturamento-service/internal/infra/database"
	httpTransport "faturamento-service/internal/transport/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// aqui ele carrega as variáveis do .env  quando elas ja existem
	if err := godotenv.Load(); err != nil {
		log.Println(".env não encontrado, usando variáveis do sistema")
	}

	// o modo release é para produção, ele desativa mensagens de debug e otimiza o desempenho da aplicaçao
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// serve para conexão com banco
	database.ConnectDB()

	r := gin.New()

	r.SetTrustedProxies(nil)

	// o middlewares é para lidar com erros e logar as requisiçoes.
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// rotas e handlers do HTTP para o faturamento-service
	httpTransport.Setup(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("faturamento-service iniciado na porta %s", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Falha ao iniciar servidor: %v", err)
	}
}
