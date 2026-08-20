# Sistema de Gestão de Notas Fiscais com Arquitetura de Microserviços

Aplicação full stack desenvolvida para simular um cenário real de emissão de notas fiscais e controle de estoque, utilizando arquitetura baseada em microsserviços.
O projeto explora desafios comuns encontrados em sistemas corporativos, como integração entre serviços, persistência de dados, concorrência em operações críticas, tratamento de falhas e sincronização de processos de negócio.
O objetivo foi aplicar boas práticas de engenharia de software na construção de uma solução escalável, desacoplada e próxima de contextos reais de mercado.

---

## Objetivos do Projeto

- Construir APIs REST utilizando Go;
- Aplicar conceitos de microsserviços na separação de domínios;
- Implementar comunicação entre serviços via HTTP;
- Garantir integridade de dados em cenários concorrentes;
- Desenvolver uma interface moderna utilizando Angular;
- Containerizar toda a aplicação utilizando Docker;
- Explorar padrões comuns em sistemas ERP.

## Arquitetura

O sistema é estruturado em **arquitetura de microsserviços**, composta por quatro containers independentes orquestrados via Docker Compose:

```
┌─────────────────────────────────────────────────────────┐ 
│                      Docker Network                     │
│                                                         │
│  ┌──────────────┐    ┌──────────────────┐               │
│  │   Angular    │    │ faturamento-svc  │               │
│  │  (nginx:80)  │───▶│   Gin + GORM     │               │
│  └──────────────┘    │   porta 8082     │               │
│         │            └────────┬─────────┘               │
│         │                     │ HTTP interno             │
│         │            ┌────────▼─────────┐               │
│         └───────────▶│  estoque-svc     │               │
│                      │  Gin + GORM      │               │
│                      │  porta 8081      │               │
│                      └────────┬─────────┘               │
│                               │                         │
│                      ┌────────▼─────────┐               │
│                      │   PostgreSQL 15  │               │
│                      │  estoque_db      │               │
│                      │  faturamento_db  │               │
│                      └──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Angular 17 + Angular Material | Requisito do desafio |
| Backend | Go 1.21 + Gin | Simplicidade, performance e tipagem forte |
| ORM | GORM | Produtividade com PostgreSQL em Go |
| Banco | PostgreSQL 15 | Robusto, suporte nativo a sequences e transações |
| Infra | Docker + Docker Compose | Ambiente reproduzível e isolado |
| Proxy | nginx | Serve o Angular e faz proxy reverso para os serviços |

---
Aspectos Técnicos Implementados:

- Arquitetura baseada em microsserviços;
- API REST desenvolvida em Go;
- Persistência com PostgreSQL utilizando GORM;
- Tratamento estruturado de erros;
- Docker e Docker Compose para ambiente de desenvolvimento;
- Controle de concorrência utilizando transações e bloqueio de registros (SELECT FOR UPDATE);
- Sequenciamento seguro para numeração das notas fiscais;
- Idempotência na impressão da nota: reenviar `POST /notas/:id/imprimir` para uma nota já fechada (retry de rede, duplo clique) retorna 200 com o estado atual, em vez de erro ou baixa duplicada de estoque — o próprio ID da nota funciona como chave de idempotência, sem necessidade de header extra;
- Frontend responsivo desenvolvido com Angular e Angular Material.

Funcionalidades:

- Produtos
- Cadastro de produtos;
- Listagem e consulta de produtos;
- Atualização de informações;
- Exclusão lógica (soft delete);
- Controle de saldo em estoque.
- Notas Fiscais
- Criação de notas fiscais com numeração sequencial;
- Inclusão de múltiplos itens por nota;
- Controle de status (Aberta ou Fechada);
- Impressão de notas fiscais;
- Impedimento de reimpressão de notas já fechadas.

---

### Resiliência e integridade dos dados

- **Tratamento de falhas entre microsserviços**: se o serviço de estoque cair, o de faturamento devolve uma mensagem de erro clara em vez de travar, e volta a funcionar sozinho assim que o estoque volta ao ar — sem precisar reiniciar nada
- **Concorrência**: duas notas disputando o saldo do mesmo produto ao mesmo tempo nunca resultam em saldo negativo — uma delas é bloqueada até a outra terminar (lock a nível de banco de dados)
- **Idempotência na impressão**: reenviar o pedido de impressão de uma nota que já foi impressa (por exemplo, por uma falha de rede que fez o cliente tentar de novo) não gera erro nem debita o estoque uma segunda vez

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
---

## Como executar

### Pré-requisitos
- Docker Desktop instalado e rodando
- Git

### Passo a passo

```bash
git clone https://github.com/wallyson14/Sistema-Gestao-Fiscal.git
cd Sistema-Gestao-Fiscal

chmod +x init-db.sh

cd frontend
npm install --legacy-peer-deps
cd ..

docker-compose up --build
```

> **Usuários Windows/WSL2:** se o `localhost` não responder nas portas 8081/8082 após o build, execute no PowerShell como Administrador: `netsh interface portproxy reset` e reinicie o terminal WSL.

> **Usuários Fedora/RHEL/CentOS (SELinux):** o volume do `init-db.sh` já está montado com o sufixo `:z` no `docker-compose.yml` para evitar `Permission denied` ao ler o script dentro do container — necessário porque o SELinux, ativo por padrão nessas distros, bloqueia containers de acessar arquivos do host sem o rótulo compartilhado.

Após o build (primeira vez ~3 minutos), acesse:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:4200 |
| Estoque API | http://localhost:8081 |
| Faturamento API | http://localhost:8082 |

---

## Endpoints da API

### estoque-service (`localhost:8081`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/produtos` | Lista todos os produtos |
| `POST` | `/api/v1/produtos` | Cria um produto |
| `PUT` | `/api/v1/produtos/:id` | Atualiza descrição e saldo |
| `DELETE` | `/api/v1/produtos/:id` | Remove produto (soft delete) |
| `PATCH` | `/api/v1/produtos/:id/saldo` | Deduz saldo (uso interno) |
| `GET` | `/health` | Health check |

### faturamento-service (`localhost:8082`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/notas` | Lista todas as notas |
| `GET` | `/api/v1/notas/:id` | Busca uma nota por ID |
| `POST` | `/api/v1/notas` | Cria nova nota (número automático via sequence) |
| `DELETE` | `/api/v1/notas/:id` | Remove nota aberta (notas fechadas não podem ser excluídas) |
| `POST` | `/api/v1/notas/:id/itens` | Adiciona produto à nota (valida saldo no estoque-service, sem debitar ainda) |
| `DELETE` | `/api/v1/notas/:id/itens/:itemId` | Remove item de uma nota aberta |
| `POST` | `/api/v1/notas/:id/imprimir` | **Imprime: baixa o saldo de cada item no estoque-service e fecha a nota** |
| `GET` | `/health` | Health check do serviço + verificação ativa do estoque-service |

> A baixa de saldo acontece na **impressão**, não ao adicionar o item — assim é possível remover itens ou excluir a nota livremente enquanto ela está Aberta, sem precisar estornar estoque.
