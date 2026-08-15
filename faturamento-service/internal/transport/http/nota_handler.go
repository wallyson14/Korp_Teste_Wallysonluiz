package http

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"faturamento-service/internal/client"
	"faturamento-service/internal/domain"
	"faturamento-service/internal/repository"

	"github.com/gin-gonic/gin"
)

func CriarNota(c *gin.Context) {
	nota := &domain.NotaFiscal{
		Status: domain.StatusAberta,
	}

	if err := repository.CriarNota(nota); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("erro ao criar nota"))
		return
	}

	c.JSON(http.StatusCreated, nota)
}

func ListarNotas(c *gin.Context) {
	notas, err := repository.ListarNotas()
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("erro ao listar notas"))
		return
	}

	c.JSON(http.StatusOK, notas)
}

func BuscarNota(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return
	}

	nota, err := repository.BuscarNotaPorID(id)
	if errors.Is(err, repository.ErrNotaNaoEncontrada) {
		c.JSON(http.StatusNotFound, errResp("nota não encontrada"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("erro ao buscar nota"))
		return
	}

	c.JSON(http.StatusOK, nota)
}

func DeletarNota(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return
	}

	if err := repository.DeletarNota(id); err != nil {
		switch {
		case errors.Is(err, repository.ErrNotaNaoEncontrada):
			c.JSON(http.StatusNotFound, errResp("nota não encontrada"))
		case errors.Is(err, repository.ErrNotaJaFechada):
			c.JSON(http.StatusBadRequest, errResp("só é possível excluir notas abertas"))
		default:
			c.JSON(http.StatusInternalServerError, errResp("erro ao excluir nota"))
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "nota excluída com sucesso"})
}

func AdicionarItemNota(c *gin.Context) {
	notaID, err := parseUintParam(c, "id")
	if err != nil {
		return
	}

	var input struct {
		ProdutoID  uint `json:"produto_id" binding:"required"`
		Quantidade int  `json:"quantidade" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errResp("json inválido ou campos obrigatórios ausentes"))
		return
	}

	nota, err := repository.BuscarNotaPorID(notaID)
	if errors.Is(err, repository.ErrNotaNaoEncontrada) {
		c.JSON(http.StatusNotFound, errResp("nota não encontrada"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, errResp("erro ao buscar nota"))
		return
	}
	if nota.Status != domain.StatusAberta {
		c.JSON(http.StatusBadRequest, errResp("só é possível adicionar itens a notas abertas"))
		return
	}

	produto, err := client.BuscarProduto(input.ProdutoID)
	if err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, client.ErrProdutoNaoEncontrado):
			status = http.StatusBadRequest
		case errors.Is(err, client.ErrEstoqueIndisponivel):
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, errResp(err.Error()))
		return
	}

	if produto.Saldo < input.Quantidade {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":            "estoque insuficiente",
			"saldo_disponivel": produto.Saldo,
		})
		return
	}

	item := &domain.ItemNota{
		NotaFiscalID:  notaID,
		ProdutoID:     input.ProdutoID,
		CodigoProduto: produto.Codigo,
		Descricao:     produto.Descricao,
		Quantidade:    input.Quantidade,
	}

	if err := repository.AdicionarItem(item); err != nil {
		c.JSON(http.StatusInternalServerError, errResp("erro ao adicionar item"))
		return
	}

	c.JSON(http.StatusCreated, item)
}

func RemoverItemNota(c *gin.Context) {
	notaID, err := parseUintParam(c, "id")
	if err != nil {
		return
	}
	itemID, err := parseUintParam(c, "itemId")
	if err != nil {
		return
	}

	if err := repository.RemoverItem(notaID, itemID); err != nil {
		switch {
		case errors.Is(err, repository.ErrNotaNaoEncontrada):
			c.JSON(http.StatusNotFound, errResp("nota não encontrada"))
		case errors.Is(err, repository.ErrItemNaoEncontrado):
			c.JSON(http.StatusNotFound, errResp("item não encontrado nesta nota"))
		case errors.Is(err, repository.ErrNotaJaFechada):
			c.JSON(http.StatusBadRequest, errResp("só é possível remover itens de notas abertas"))
		default:
			c.JSON(http.StatusInternalServerError, errResp("erro ao remover item"))
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "item removido com sucesso"})
}

func Imprimir(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return
	}

	nota, err := repository.Imprimir(id, client.BaixarSaldo)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotaNaoEncontrada):
			c.JSON(http.StatusNotFound, errResp("nota não encontrada"))
		case errors.Is(err, repository.ErrNotaSemItens):
			c.JSON(http.StatusBadRequest, errResp("nota não possui itens para imprimir"))
		case errors.Is(err, client.ErrSaldoInsuficiente):
			c.JSON(http.StatusUnprocessableEntity, errResp(err.Error()))
		case errors.Is(err, client.ErrProdutoNaoEncontrado):
			c.JSON(http.StatusUnprocessableEntity, errResp(err.Error()))
		case errors.Is(err, client.ErrEstoqueIndisponivel):
			c.JSON(http.StatusServiceUnavailable, errResp(err.Error()))
		default:
			c.JSON(http.StatusInternalServerError, errResp("erro ao imprimir nota"))
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("NF #%d impressa e fechada com sucesso", nota.Numero),
		"nota":    nota,
	})
}

func parseUintParam(c *gin.Context, param string) (uint, error) {
	raw := c.Param(param)
	val, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		invalidErr := fmt.Errorf("parâmetro '%s' inválido: %q", param, raw)
		c.JSON(http.StatusBadRequest, errResp(fmt.Sprintf("parâmetro '%s' inválido", param)))
		return 0, invalidErr
	}
	return uint(val), nil
}

func errResp(message string) gin.H {
	return gin.H{"error": message}
}
