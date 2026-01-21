# Roteiro de Desenvolvimento e Conexão (Hostinger MySQL)

Este documento detalha o processo de configuração do aplicativo de gestão escolar e sua conexão com o banco de dados MySQL hospedado na Hostinger.

## 1. Configuração do Banco de Dados (MySQL)

**Objetivo:** Preparar a estrutura de dados na Hostinger.

1.  Acesse o painel da Hostinger -> **Banco de Dados MySQL**.
2.  Verifique se o banco `u850687847_database` e o usuário `u850687847_usuario` existem. Defina uma senha forte.
3.  Acesse o **phpMyAdmin** através do painel.
4.  Selecione o banco `u850687847_database`.
5.  Vá na aba **Importar** ou **SQL** e execute o conteúdo do arquivo `hostinger_schema.sql` (incluído neste projeto).

## 2. Configuração do Back-end (API PHP)

**Objetivo:** Criar a ponte entre o React e o MySQL.

1.  Abra o arquivo `api.php` incluído neste projeto.
2.  Edite a linha `$password = 'SUA_SENHA_AQUI';` colocando a senha real do seu banco de dados.
3.  Acesse o **Gerenciador de Arquivos** da Hostinger.
4.  Navegue até a pasta `public_html`.
5.  Faça o upload do arquivo `api.php`.
6.  Teste o acesso pelo navegador: `https://seu-dominio.com/api.php`.
    *   *Sucesso:* Deve retornar `{"message": "API Online..."}`.
    *   *Erro:* Se aparecer erro de conexão, verifique a senha no arquivo PHP.

## 3. Configuração do Front-end (React)

**Objetivo:** Conectar o aplicativo visual à API.

1.  O arquivo `supabaseClient.ts` já foi configurado para apontar para sua API.
2.  Verifique a constante `API_URL` em `supabaseClient.ts` e certifique-se de que está apontando para o seu domínio correto (atualmente `https://lightblue-boar-874757.hostingersite.com/api.php`).
3.  O sistema inclui um verificador de conexão no rodapé do menu lateral para facilitar o diagnóstico.

## 4. Estrutura do Sistema

*   **Turmas (`classes`)**: Gerenciamento de salas, turnos e vínculo com professores.
*   **Alunos (`students`)**: Cadastro completo, fotos e status.
*   **Habilidades (`skills`)**: Base da BNCC para avaliações.
*   **Avaliações (`assessments`)**: Registro de desempenho, comportamento e notas.
*   **Reforço (`classes` com flag `is_remediation`)**: Módulo automático para alunos em risco.
*   **Diário (`class_daily_logs`)**: Registro de frequência e conteúdo.

## 5. Próximos Passos Sugeridos

*   Implementar autenticação JWT no PHP para maior segurança (atualmente usa verificação simples).
*   Adicionar relatórios em PDF (usando bibliotecas como `jspdf` no React).
*   Criar área do responsável (acesso limitado para pais verem notas).
