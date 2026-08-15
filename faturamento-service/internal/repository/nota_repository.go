// Acesso ao banco de dados para a entidade NotaFiscal: criação com
// numeração sequencial, listagem, busca, impressão (com lock de
// concorrência), remoção de item e exclusão de nota.
package repository

import (
	"errors"
	"fmt"

	"faturamento-service/internal/domain"
	"faturamento-service/internal/infra/database"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrNotaNaoEncontrada = errors.New("nota não encontrada")
	ErrNotaJaFechada     = errors.New("nota não está aberta")
	ErrNotaSemItens      = errors.New("nota não possui itens para imprimir")
	ErrItemNaoEncontrado = errors.New("item não encontrado nesta nota")
)

func CriarNota(nota *domain.NotaFiscal) error {
	var numero int

	err := database.DB.Raw("SELECT nextval('seq_numero_nota')").Scan(&numero).Error
	if err != nil {
		return fmt.Errorf("erro ao gerar número da nota: %w", err)
	}

	nota.Numero = numero

	return database.DB.Create(nota).Error
}

func ListarNotas() ([]domain.NotaFiscal, error) {
	var notas []domain.NotaFiscal

	err := database.DB.Preload("Itens").Order("created_at DESC").Find(&notas).Error
	return notas, err
}

func BuscarNotaPorID(id uint) (*domain.NotaFiscal, error) {
	var nota domain.NotaFiscal

	err := database.DB.Preload("Itens").First(&nota, id).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotaNaoEncontrada
	}

	return &nota, err
}

func AdicionarItem(item *domain.ItemNota) error {
	return database.DB.Create(item).Error
}

// RemoverItem exclui um item de uma nota aberta. Bloqueia a nota
// (SELECT FOR UPDATE) para impedir que o item seja removido no meio
// de uma impressão em andamento.
func RemoverItem(notaID, itemID uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var nota domain.NotaFiscal
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&nota, notaID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotaNaoEncontrada
			}
			return err
		}

		if nota.Status != domain.StatusAberta {
			return ErrNotaJaFechada
		}

		result := tx.Where("id = ? AND nota_fiscal_id = ?", itemID, notaID).Delete(&domain.ItemNota{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrItemNaoEncontrado
		}
		return nil
	})
}

// DeletarNota exclui uma nota aberta e seus itens. Notas fechadas não
// podem ser excluídas — o estoque já foi debitado e a nota vira registro
// histórico.
func DeletarNota(id uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var nota domain.NotaFiscal
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&nota, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotaNaoEncontrada
			}
			return err
		}

		if nota.Status != domain.StatusAberta {
			return ErrNotaJaFechada
		}

		if err := tx.Where("nota_fiscal_id = ?", nota.ID).Delete(&domain.ItemNota{}).Error; err != nil {
			return err
		}
		return tx.Delete(&nota).Error
	})
}

// Imprimir fecha a nota e baixa o estoque de cada item, tudo dentro de
// uma transação com lock na linha da nota (SELECT FOR UPDATE). O lock
// serializa impressões concorrentes da MESMA nota: uma segunda tentativa
// de imprimir a mesma nota espera a primeira terminar antes de checar o
// status.
//
// Idempotente por natureza do domínio: imprimir é uma operação que só faz
// sentido acontecer uma vez por nota. Se a nota já está Fechada, a função
// não trata isso como erro — devolve o estado atual sem tocar no estoque
// de novo. Isso cobre retry de rede e duplo clique sem exigir um header
// de Idempotency-Key: o próprio ID da nota já é a chave de idempotência.
//
// baixarSaldo é injetado pelo chamador (o client HTTP do estoque-service)
// para manter este pacote livre de dependência de transporte HTTP.
//
// Limitação assumida: a baixa de estoque é uma chamada HTTP para outro
// serviço, não participa da transação local. Se o item N de M falhar, a
// transação é desfeita (a nota continua Aberta) mas os itens 1..N-1 já
// tiveram o saldo debitado no estoque-service — não há um saga/compensação
// automática. Para o escopo deste projeto o erro retornado identifica o
// item que falhou, permitindo investigação manual.
func Imprimir(id uint, baixarSaldo func(produtoID uint, quantidade int) error) (*domain.NotaFiscal, error) {
	var nota domain.NotaFiscal

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&nota, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotaNaoEncontrada
			}
			return err
		}

		if err := tx.Where("nota_fiscal_id = ?", nota.ID).Find(&nota.Itens).Error; err != nil {
			return err
		}

		if nota.Status == domain.StatusFechada {
			// já impressa — replay idempotente, nada a fazer
			return nil
		}

		if len(nota.Itens) == 0 {
			return ErrNotaSemItens
		}

		for _, item := range nota.Itens {
			if err := baixarSaldo(item.ProdutoID, item.Quantidade); err != nil {
				return fmt.Errorf("item %s: %w", item.CodigoProduto, err)
			}
		}

		// Update direcionado ao campo status: Save(&nota) tentaria fazer
		// upsert também da associação Itens carregada acima, gerando
		// updates desnecessários nos itens.
		if err := tx.Model(&domain.NotaFiscal{}).Where("id = ?", nota.ID).
			Update("status", domain.StatusFechada).Error; err != nil {
			return err
		}
		nota.Status = domain.StatusFechada
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &nota, nil
}
