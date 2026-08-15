// Client HTTP para o estoque-service: encapsula as chamadas entre os
// dois microsserviços, incluindo timeout e mapeamento de erros HTTP
// para erros sentinela que o restante da aplicação pode checar com errors.Is.
package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"
)

var httpClient = &http.Client{
	Timeout: 5 * time.Second,
}

var (
	ErrEstoqueIndisponivel  = errors.New("serviço de estoque indisponível")
	ErrProdutoNaoEncontrado = errors.New("produto não encontrado no serviço de estoque")
	ErrSaldoInsuficiente    = errors.New("saldo insuficiente no estoque")
)

// ProdutoEstoque é mantido separado do domain.ItemNota de propósito:
// acoplar os dois faria o faturamento-service quebrar toda vez que o
// modelo interno do estoque-service mudasse.
type ProdutoEstoque struct {
	ID        uint   `json:"id"`
	Codigo    string `json:"codigo"`
	Descricao string `json:"descricao"`
	Saldo     int    `json:"saldo"`
}

func estoqueURL() string {
	url := os.Getenv("ESTOQUE_URL")
	if url == "" {
		url = "http://estoque-service:8081"
	}
	return url
}

// BuscarProduto consulta o estoque-service pelo ID do produto.
func BuscarProduto(produtoID uint) (*ProdutoEstoque, error) {
	url := fmt.Sprintf("%s/api/v1/produtos/%d", estoqueURL(), produtoID)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, ErrEstoqueIndisponivel
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
	case http.StatusNotFound:
		return nil, ErrProdutoNaoEncontrado
	default:
		return nil, fmt.Errorf("resposta inesperada do estoque-service: HTTP %d", resp.StatusCode)
	}

	var produto ProdutoEstoque
	if err := json.NewDecoder(resp.Body).Decode(&produto); err != nil {
		return nil, fmt.Errorf("erro ao deserializar resposta do estoque-service: %w", err)
	}
	return &produto, nil
}

// BaixarSaldo pede ao estoque-service para debitar a quantidade informada.
// A validação de saldo suficiente (e o lock de concorrência) acontece do
// lado do estoque-service, que é o dono desse dado.
func BaixarSaldo(produtoID uint, quantidade int) error {
	url := fmt.Sprintf("%s/api/v1/produtos/%d/saldo", estoqueURL(), produtoID)

	payload, _ := json.Marshal(map[string]int{"quantidade": quantidade})

	req, err := http.NewRequest(http.MethodPatch, url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("erro ao montar request para estoque-service: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return ErrEstoqueIndisponivel
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		return nil
	case http.StatusUnprocessableEntity:
		return ErrSaldoInsuficiente
	case http.StatusNotFound:
		return ErrProdutoNaoEncontrado
	default:
		return fmt.Errorf("erro inesperado ao baixar saldo: HTTP %d", resp.StatusCode)
	}
}

// VerificarSaude checa se o estoque-service está respondendo — usado no
// health check do faturamento-service para expor o cenário de falha do
// requisito de "Tratamento de Falhas".
func VerificarSaude() bool {
	resp, err := httpClient.Get(estoqueURL() + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
