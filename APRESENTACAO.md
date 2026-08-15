# Apresentação - Desafio Técnico Korp ERP

**Candidato:** Wallyson Luiz
**Vaga:** Estágio de Desenvolvimento | C# ou Go (Golang) + Angular

## O que é este projeto

Sistema de emissão de notas fiscais com controle de estoque, desenvolvido conforme o desafio técnico da Korp. Arquitetura de dois microsserviços em **Go** (estoque-service e faturamento-service, cada um com seu próprio banco PostgreSQL) e frontend em **Angular 17 + Angular Material**, tudo containerizado com **Docker Compose**.

Documentação técnica completa - arquitetura, endpoints da API, como rodar o projeto  está no [README.md](./README.md).

## Funcionalidades

- Cadastro de produtos (código, descrição, saldo em estoque)
- Cadastro de notas fiscais com numeração sequencial e múltiplos itens
- Impressão de notas: valida e debita o estoque de cada item, fecha a nota (status `Aberta` → `Fechada`), e bloqueia nova impressão de uma nota já fechada
- Tratamento de falha entre os microsserviços com feedback ao usuário
- Controle de concorrência (dois pedidos disputando o mesmo saldo) via `SELECT FOR UPDATE`
- Impressão idempotente: reenviar o pedido de impressão de uma nota já fechada não gera erro nem debita o estoque de novo

## Detalhamento técnico

**Ciclos de vida Angular utilizados**
`ngOnInit` para assinar os `Observable`s de estado e disparar o carregamento inicial dos dados; `ngOnDestroy` para emitir no `Subject` de destruição (`destroy$`) e cancelar todas as subscriptions ativas, evitando memory leak ao trocar de tela.

**Uso de RxJS**
Sim. `BehaviorSubject` para manter o estado reativo das listas de produtos/notas nos services (guarda o último valor emitido, então a tela já mostra dado ao assinar de novo); `switchMap` para encadear a re-listagem depois de criar/editar/excluir sem criar subscriptions órfãs; `takeUntil(destroy$)` para cancelamento automático; `finalize` para sempre desligar indicadores de carregamento, em sucesso ou erro.

**Outras bibliotecas**
RxJS (nativo do Angular) e Angular Material.

**Biblioteca de componentes visuais**
Angular Material — tabelas (`MatTable`), formulários reativos (`MatFormField`, `MatInput`, `MatSelect`), diálogo de confirmação (`MatDialog`), notificações (`MatSnackBar`), painéis expansíveis (`MatExpansionPanel`) na tela de notas.

**Gerenciamento de dependências no Golang**
`go.mod`/`go.sum` (Go Modules), com `go mod download` executado em uma etapa isolada do Dockerfile multi-stage — aproveita cache de camada do Docker, então as dependências só são rebaixadas se `go.mod`/`go.sum` mudarem.

**Frameworks utilizados no Golang**
Gin (roteamento e HTTP) e GORM (ORM sobre PostgreSQL, incluindo migrations automáticas e transações).

**Tratamento de erros e exceções no backend**
Erros sentinela por camada (`errors.New` na camada de repositório/client, verificados com `errors.Is` na camada HTTP), mapeados para o status HTTP apropriado em cada handler (400, 404, 409, 422, 503). `gin.Recovery()` como rede de segurança contra panics inesperados. Timeout explícito (5s) nas chamadas HTTP entre os dois microsserviços, para não deixar uma requisição pendurada se o outro serviço não responder.

**LINQ**
Não se aplica — o backend foi implementado em Go, não em C#.

## Requisitos do desafio

| Requisito | Status |
|---|---|
| Cadastro de Produtos | ✅ |
| Cadastro de Notas Fiscais | ✅ |
| Impressão de Notas Fiscais | ✅ |
| Arquitetura de microsserviços (mín. 2) | ✅ — estoque-service + faturamento-service |
| Tratamento de falhas entre serviços | ✅ |
| Conexão real com banco de dados | ✅ — PostgreSQL |
| Concorrência (opcional) | ✅ — `SELECT FOR UPDATE` |
| Idempotência (opcional) | ✅ |
| Uso de IA (opcional) | Não implementado |
