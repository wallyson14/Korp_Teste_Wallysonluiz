//aqui o domain da nota fiscal, com os campos necessários para o cabeçalho e os itens da nota.
//ele serve para representar a estrutura de dados da nota fiscal, e é usado para mapear os dados do banco de dados usando o GORM.

package domain

import (
	"time"

	"gorm.io/gorm"
)

type StatusNota string

const (
	StatusAberta  StatusNota = "Aberta"
	StatusFechada StatusNota = "Fechada"
)

// aqui a NotaFiscal representa o cabeçalho da nota, e tem um relacionamento um-para-muitos com os itens da nota
type NotaFiscal struct {
	ID        uint           `json:"id"         gorm:"primarykey"`
	Numero    int            `json:"numero"     gorm:"uniqueIndex;not null"`
	Status    StatusNota     `json:"status"     gorm:"not null;default:'Aberta'"`
	Itens     []ItemNota     `json:"itens"      gorm:"foreignKey:NotaFiscalID"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-"          gorm:"index"`
}

// ItemNota representa um produto dentro da nota fiscal.
// Armazena 'descricao' e 'codigo_produto' localmente para preservar o
// estado histórico da nota se o produto for alterado depois, a nota
// deve refletir o estado no momento da emissão.
type ItemNota struct {
	ID            uint           `json:"id"              gorm:"primarykey"`
	NotaFiscalID  uint           `json:"nota_fiscal_id"  gorm:"not null;index"`
	ProdutoID     uint           `json:"produto_id"      gorm:"not null"`
	CodigoProduto string         `json:"codigo_produto"  gorm:"not null;size:50"`
	Descricao     string         `json:"descricao"       gorm:"not null;size:200"`
	Quantidade    int            `json:"quantidade"      gorm:"not null;check:quantidade > 0"`
	CreatedAt     time.Time      `json:"created_at"`
	DeletedAt     gorm.DeletedAt `json:"-"               gorm:"index"`
}
