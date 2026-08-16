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
