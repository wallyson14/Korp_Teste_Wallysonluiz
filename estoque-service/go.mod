// aqui no meu go.mod ele é para o módulo estoque-service, e não server, pois o nome do módulo é o nome do diretório raiz do projeto, e não o nome do pacote principal.
// O pacote principal está dentro de cmd/api, mas o módulo é estoque-service. Por isso, no Dockerfile, a linha de build deve apontar para cmd/api, e não cmd/server.

module estoque-service

go 1.21

require (
	github.com/gin-contrib/cors v1.5.0
	github.com/gin-gonic/gin v1.9.1
	gorm.io/driver/postgres v1.5.4
	gorm.io/gorm v1.25.5
)

require (
	github.com/bytedance/sonic v1.10.1 
	github.com/chenzhuoyu/base64x v0.0.0-20230717121745-296ad89f973d 
	github.com/chenzhuoyu/iasm v0.9.0 
	github.com/gabriel-vasile/mimetype v1.4.2 
	github.com/gin-contrib/sse v0.1.0 
	github.com/go-playground/locales v0.14.1 
	github.com/go-playground/universal-translator v0.18.1 
	github.com/go-playground/validator/v10 v10.15.5
	github.com/goccy/go-json v0.10.2 
	github.com/jackc/pgpassfile v1.0.0
	github.com/jackc/pgservicefile v0.0.0-20221227161230-091c0ba34f0a 
	github.com/jackc/pgx/v5 v5.4.3 
	github.com/jinzhu/inflection v1.0.0
	github.com/jinzhu/now v1.1.5 
	github.com/joho/godotenv v1.5.1
	github.com/json-iterator/go v1.1.12 
	github.com/klauspost/cpuid/v2 v2.2.5
	github.com/kr/text v0.2.0 
	github.com/leodido/go-urn v1.2.4 
    github.com/mattn/go-isatty v0.0.19 
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd 
	github.com/modern-go/reflect2 v1.0.2 
	github.com/pelletier/go-toml/v2 v2.1.0 
	github.com/twitchyliquid64/golang-asm v0.15.1 
	github.com/ugorji/go/codec v1.2.11 
	golang.org/x/arch v0.5.0 
	golang.org/x/crypto v0.14.0 
	golang.org/x/net v0.16.0 
	golang.org/x/sys v0.13.0 
	golang.org/x/text v0.13.0 
	google.golang.org/protobuf v1.31.0 
	gopkg.in/yaml.v3 v3.0.1 
)
