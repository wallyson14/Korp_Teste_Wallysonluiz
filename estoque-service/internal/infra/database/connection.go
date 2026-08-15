package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"estoque-service/internal/domain"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=America/Sao_Paulo",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	gormConfig := &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Warn),
		PrepareStmt: true,
	}

	var db *gorm.DB
	var err error

	// Retry de conexão é para garantir que o serviço aguarde o banco de dados estar pronto, especialmente útil em ambientes com containers (Docker Compose)
	for attempt := 1; attempt <= 5; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), gormConfig)
		if err == nil {
			break
		}

		waitSecs := attempt * 2
		log.Printf("Tentativa %d/5 — aguardando %ds: %v", attempt, waitSecs, err)
		time.Sleep(time.Duration(waitSecs) * time.Second)
	}

	if err != nil {
		log.Fatalf("Falha ao conectar ao banco: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Erro ao obter sql.DB: %v", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// e o MIGRATION aqui é onde o GORM cria a tabela de produtos.
	if err := db.AutoMigrate(&domain.Produto{}); err != nil {
		log.Fatalf("Erro na AutoMigrate: %v", err)
	}

	DB = db
	log.Println("Banco conectado e migrado")
}
