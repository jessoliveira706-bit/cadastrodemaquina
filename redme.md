# Sistema de Cadastro de Máquinas Alocadas


Sistema web para gerenciamento de equipamentos alocados em departamentos municipais, com controle de fila de atendimento, cadastro de máquinas, gestão de unidades e setores.


## Funcionalidades


- **Dashboard** — Painel com contadores em tempo real de chamados abertos, aguardando e entregues
- **Fila de Atendimento** — Kanban com três colunas: Aguardando, Em Manutenção e Entregue
- **Máquinas Alocadas** — Cadastro de equipamentos com patrimônio, modelo, serial, responsável e status
- **Departamentos** — Cadastro de setores com endereço, responsável e matrícula
- **Unidades** — Gerenciamento de unidades de atendimento com endereço, CEP e telefone
- **Importação/Exportação CSV** — Importar e exportar dados de máquinas e departamentos


## Tecnologias


- HTML5, CSS3, JavaScript (Vanilla ES6+)
- `localStorage` para persistência de dados no navegador
- Sem dependências externas ou servidor backend


## Estrutura de Arquivos


```
├── index.html          # Dashboard principal
├── fila.html           # Fila de atendimento (kanban)
├── machines.html       # Cadastro de máquinas
├── departments.html    # Cadastro de departamentos
├── unidades.html       # Gerenciamento de unidades
├── styles.css          # Estilos globais
└── logo.png            # Logo exibida na sidebar
```


## Como Usar


Por ser uma aplicação estática, não requer instalação ou servidor:


1. Clone ou baixe os arquivos do projeto
2. Abra o arquivo `index.html` diretamente no navegador **ou** sirva via qualquer servidor HTTP estático
3. Todos os dados são salvos automaticamente no `localStorage` do navegador


> Os dados persistem entre sessões no mesmo navegador. Para exportar ou fazer backup, use a função de exportação CSV disponível nas páginas de Máquinas e Departamentos.


## Chaves de Armazenamento (localStorage)


| Chave               | Conteúdo                        |
|---------------------|---------------------------------|
| `calls_v1`          | Chamados da fila de atendimento |
| `machines_alocadas_v1` | Inventário de máquinas       |
| `departments_v1`    | Cadastro de departamentos       |
| `units_list_v1`     | Lista de unidades               |
| `selected_unit`     | Unidade selecionada no momento  |


## Responsividade


A interface é responsiva. Em telas menores que 640px, a sidebar lateral é recolhida automaticamente.


## Segurança


- Dados tratados com escape de HTML para prevenir XSS
- Sem comunicação com servidores externos — todos os dados ficam localmente no dispositivo
