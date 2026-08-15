// aqui no arquivo de domínio, eu defini a estrutura do produto, com os campos necessários para o sistema de estoque funcionar coretamente.

package domain

import (
	"time"

	"gorm.io/gorm"
)

// aqui defini a estrutura do produto, com os campos necessários para o sistema de estoque funcionar coretamente
type Produto struct {
	ID        uint           `json:"id"         gorm:"primarykey"`
	Codigo    string         `json:"codigo"     gorm:"not null;size:50;index:idx_produto_codigo_ativo,unique,where:deleted_at IS NULL"`
	Descricao string         `json:"descricao"  gorm:"not null;size:200"`
	Saldo     int            `json:"saldo"      gorm:"not null;default:0;check:saldo >= 0"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-"          gorm:"index"`
}
