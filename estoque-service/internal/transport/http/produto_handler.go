// aqui nesse é onde ficam os handlers das rotas de produto, ou seja, as funções que recebem as requisições HTTP,
// processam os dados e chamam as funções do repositório para interagir com o banco de dados.
//  Cada função corresponde a uma rota específica (listar, buscar, criar, atualizar, deletar e baixar saldo)
// e lida com a validação dos dados de entrada, tratamento de erros e formatação da resposta HTTP.

package http

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"estoque-service/internal/domain"
	"estoque-service/internal/repository"

	"github.com/gin-gonic/gin"
)

type criarProdutoRequest struct {
	Codigo    string `json:"codigo" binding:"required,min=1,max=50"`
	Descricao string `json:"descricao" binding:"required,min=1,max=200"`
	Saldo     int    `json:"saldo" binding:"min=0"`
}

type atualizarProdutoRequest struct {
	Descricao string `json:"descricao" binding:"required,min=1,max=200"`
	Saldo     int    `json:"saldo" binding:"min=0"`
}

type baixarSaldoRequest struct {
	Quantidade int `json:"quantidade" binding:"required,min=1"`
}

func ListarProdutos(c *gin.Context) {
	produtos, err := repository.ListarProdutos()
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("Erro ao listar produtos"))
		return
	}
	c.JSON(http.StatusOK, produtos)
}

func BuscarProduto(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	produto, err := repository.BuscarPorID(id)
	if errors.Is(err, repository.ErrProdutoNaoEncontrado) {
		c.JSON(http.StatusNotFound, errResp("Produto não encontrado"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("Erro interno ao buscar produto"))
		return
	}
	c.JSON(http.StatusOK, produto)
}

func CriarProduto(c *gin.Context) {
	var req criarProdutoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("Dados inválidos: "+err.Error()))
		return
	}

	produto := &domain.Produto{
		Codigo:    strings.ToUpper(strings.TrimSpace(req.Codigo)),
		Descricao: strings.TrimSpace(req.Descricao),
		Saldo:     req.Saldo,
	}

	if err := repository.Criar(produto); err != nil {
		if errors.Is(err, repository.ErrCodigoDuplicado) {
			c.JSON(http.StatusConflict, errResp("Já existe um produto com o código: "+req.Codigo))
			return
		}
		c.JSON(http.StatusInternalServerError, errResp("Erro ao criar produto"))
		return
	}

	c.JSON(http.StatusCreated, produto)
}

func AtualizarProduto(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var req atualizarProdutoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("Dados inválidos: "+err.Error()))
		return
	}

	dados := &domain.Produto{
		Descricao: strings.TrimSpace(req.Descricao),
		Saldo:     req.Saldo,
	}

	produto, err := repository.Atualizar(id, dados)
	if errors.Is(err, repository.ErrProdutoNaoEncontrado) {
		c.JSON(http.StatusNotFound, errResp("Produto não encontrado"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("Erro ao atualizar produto"))
		return
	}
	c.JSON(http.StatusOK, produto)
}

func DeletarProduto(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	if err := repository.Deletar(id); err != nil {
		if errors.Is(err, repository.ErrProdutoNaoEncontrado) {
			c.JSON(http.StatusNotFound, errResp("Produto não encontrado"))
			return
		}
		c.JSON(http.StatusInternalServerError, errResp("Erro ao deletar produto"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Produto deletado com sucesso"})
}

func BaixarSaldo(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var req baixarSaldoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errResp("Campo 'quantidade' obrigatório e deve ser >= 1"))
		return
	}

	produto, err := repository.BaixarSaldo(id, req.Quantidade)
	if err != nil {
		if errors.Is(err, repository.ErrProdutoNaoEncontrado) {
			c.JSON(http.StatusNotFound, errResp("Produto não encontrado"))
			return
		}
		if errors.Is(err, repository.ErrSaldoInsuficiente) {
			c.JSON(http.StatusUnprocessableEntity, errResp(err.Error()))
			return
		}
		c.JSON(http.StatusInternalServerError, errResp("Erro ao baixar saldo"))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"produto_id": produto.ID,
		"novo_saldo": produto.Saldo,
	})
}

func parseID(c *gin.Context, param string) (uint, error) {
	raw := c.Param(param)
	val, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || val == 0 {
		invalidErr := fmt.Errorf("parâmetro '%s' inválido: %q", param, raw)
		c.JSON(http.StatusBadRequest, errResp("ID inválido"))
		return 0, invalidErr
	}
	return uint(val), nil
}

func errResp(message string) gin.H {
	return gin.H{"error": message}
}
