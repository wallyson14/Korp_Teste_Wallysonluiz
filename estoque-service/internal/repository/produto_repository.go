// aqui no arquivo do repositório, eu implementei as funções de acesso ao banco de dados para o modelo de produto.
// as funções incluem operações básicas de CRUD  e uma função específica para baixar o saldo do produto, garantindo que o estoque não fique negativo.

package repository

import (
	"errors"
	"fmt"
	"strings"

	"estoque-service/internal/domain"
	"estoque-service/internal/infra/database"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrProdutoNaoEncontrado = errors.New("produto não encontrado")
	ErrCodigoDuplicado      = errors.New("já existe um produto com este código")
	ErrSaldoInsuficiente    = errors.New("saldo insuficiente")
)

func ListarProdutos() ([]domain.Produto, error) {
	var produtos []domain.Produto
	if err := database.DB.Order("created_at DESC").Find(&produtos).Error; err != nil {
		return nil, fmt.Errorf("erro ao listar produtos: %w", err)
	}
	return produtos, nil
}

func BuscarPorID(id uint) (*domain.Produto, error) {
	var produto domain.Produto

	err := database.DB.First(&produto, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrProdutoNaoEncontrado
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar produto: %w", err)
	}

	return &produto, nil
}

func Criar(produto *domain.Produto) error {
	if err := database.DB.Create(produto).Error; err != nil {
		if isDuplicateKeyError(err) {
			return ErrCodigoDuplicado
		}
		return fmt.Errorf("erro ao criar produto: %w", err)
	}
	return nil
}

func Atualizar(id uint, dados *domain.Produto) (*domain.Produto, error) {
	produto, err := BuscarPorID(id)
	if err != nil {
		return nil, err
	}

	produto.Descricao = dados.Descricao
	produto.Saldo = dados.Saldo

	if err := database.DB.Save(produto).Error; err != nil {
		return nil, fmt.Errorf("erro ao atualizar produto: %w", err)
	}

	return produto, nil
}

func Deletar(id uint) error {
	result := database.DB.Delete(&domain.Produto{}, id)

	if result.Error != nil {
		return fmt.Errorf("erro ao deletar produto: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrProdutoNaoEncontrado
	}

	return nil
}

func BaixarSaldo(id uint, quantidade int) (*domain.Produto, error) {
	var resultado domain.Produto

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var produto domain.Produto

		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&produto, id).Error; err != nil {

			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrProdutoNaoEncontrado
			}
			return err
		}

		novoSaldo := produto.Saldo - quantidade
		if novoSaldo < 0 {
			return ErrSaldoInsuficiente
		}

		if err := tx.Model(&produto).Update("saldo", novoSaldo).Error; err != nil {
			return err
		}

		produto.Saldo = novoSaldo
		resultado = produto
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &resultado, nil
}

func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "23505") || strings.Contains(msg, "duplicate key")
}
