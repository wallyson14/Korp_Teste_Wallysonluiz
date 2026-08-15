//o arquivo connection.go é responsável por estabelecer a conexão com o banco de dados PostgreSQL usando GORM,
// configurar o pool de conexões, realizar a migração automática das tabelas e criar a sequence para o número da nota fiscal.
// Ele também implementa um mecanismo de retry para lidar com falhas temporárias na conexão.

package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"faturamento-service/internal/domain"

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

	// retry de conexão com backoff serve para lidar com falhas temporárias
	for attempt := 1; attempt <= 5; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), gormConfig)
		if err == nil {
			break
		}
		waitSecs := attempt * 2
		log.Printf("Tentativa %d/5 — aguardando banco: %v (retry em %ds)", attempt, err, waitSecs)
		time.Sleep(time.Duration(waitSecs) * time.Second)
	}

	if err != nil {
		log.Fatalf("Falha ao conectar ao banco após 5 tentativas: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Erro ao obter sql.DB: %v", err)
	}

	// pool de conexões configurado para melhorar a performance e estabilidade
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := db.AutoMigrate(&domain.NotaFiscal{}, &domain.ItemNota{}); err != nil {
		log.Fatalf("Erro na AutoMigrate: %v", err)
	}

	// sequence para número da nota, isso evita problemas e garante que cada nota tenha um número único
	err = db.Exec(`
		CREATE SEQUENCE IF NOT EXISTS seq_numero_nota
		START WITH 1
		INCREMENT BY 1
		NO CYCLE;
	`).Error
	if err != nil {
		log.Fatalf("Erro ao criar sequence seq_numero_nota: %v", err)
	}

	DB = db
	log.Println("Banco de dados conectado, tabelas migradas e sequence criada!")
}
