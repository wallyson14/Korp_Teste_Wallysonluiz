package http

import (
	"net/http"
	"os"

	"faturamento-service/internal/client"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine) {
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))

	// health check reflete a saúde do próprio serviço e a do estoque-service,
	// para dar feedback real ao operar o cenário de falha entre microsserviços.
	r.GET("/health", func(c *gin.Context) {
		estoqueOk := client.VerificarSaude()

		status := http.StatusOK
		if !estoqueOk {
			status = http.StatusServiceUnavailable
		}

		c.JSON(status, gin.H{
			"status":  "ok",
			"service": "faturamento",
			"version": os.Getenv("APP_VERSION"),
			"estoque_service": gin.H{
				"disponivel": estoqueOk,
			},
		})
	})

	api := r.Group("/api/v1")
	{
		notas := api.Group("/notas")
		{
			notas.GET("", ListarNotas)
			notas.GET("/:id", BuscarNota)
			notas.POST("", CriarNota)
			notas.DELETE("/:id", DeletarNota)

			notas.POST("/:id/itens", AdicionarItemNota)
			notas.DELETE("/:id/itens/:itemId", RemoverItemNota)

			notas.POST("/:id/imprimir", Imprimir)
		}
	}
}
