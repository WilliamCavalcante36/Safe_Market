
/* ==========================================================
   SAFEMARKET - PUBLICAR ANÚNCIO
   Integração com Spring Boot + MySQL

   FRONTEND: Live Server (5500)
   BACKEND: Spring Boot (8080)
   API: js/api.js

   FUNCIONALIDADES:
   - Validação dos campos
   - Preview de imagens
   - Autenticação por sessão HTTP
   - CSRF centralizado no api.js
   - Cadastro de produtos
   - Upload multipart de imagens
   - Proteção contra publicação duplicada
   - Recuperação de publicação pendente
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    // =====================================================
    // 1. ELEMENTOS HTML
    // =====================================================

    const formulario = document.getElementById(
        "form-publicar-anuncio"
    );

    const campoTitulo = document.getElementById("titulo");
    const campoDescricao = document.getElementById("descricao");
    const campoCategoria = document.getElementById("categoria");
    const campoPreco = document.getElementById("preco");
    const campoLocalizacao = document.getElementById("localizacao");
    const campoImagem = document.getElementById("imagem");

    const contadorDescricao = document.getElementById(
        "contador-descricao"
    );

    const previewImagem = document.getElementById("preview-imagem");

    const imagemSelecionada = document.getElementById(
        "imagem-selecionada"
    );

    const botaoRemoverImagem = document.getElementById(
        "remover-imagem"
    );

    const mensagem = document.getElementById(
        "mensagem-publicacao"
    );

    const botaoPublicar = document.getElementById(
        "botao-publicar"
    );

    // =====================================================
    // 2. VERIFICAR ELEMENTOS
    // =====================================================

    if (!formulario) {
        console.error(
            "SafeMarket: formulário de publicação não encontrado."
        );
        return;
    }

    const elementosObrigatorios = [
        campoTitulo,
        campoDescricao,
        campoCategoria,
        campoPreco,
        campoLocalizacao,
        campoImagem,
        mensagem,
        botaoPublicar
    ];

    if (elementosObrigatorios.some(elemento => !elemento)) {
        console.error(
            "SafeMarket: existem elementos obrigatórios ausentes no HTML."
        );
        return;
    }

    // =====================================================
    // 3. INTEGRAÇÃO COM API.JS
    // =====================================================

    /*
       api.js deve ser carregado antes deste arquivo.

       Ele centraliza:
       - URL da API;
       - envio de cookies;
       - token CSRF;
       - cabeçalho X-XSRF-TOKEN;
       - tratamento das respostas e erros.

       Este arquivo não utiliza fetch diretamente.
    */

    const chamarAPI =
        typeof window.requisicaoAPI === "function"
            ? window.requisicaoAPI.bind(window)
            : null;

    if (!chamarAPI) {

        console.error(
            "SafeMarket: requisicaoAPI não está disponível."
        );

        mensagem.textContent =
            "Erro de configuração: não foi possível carregar a comunicação com o servidor.";

        mensagem.className = "mensagem-publicacao erro";
        mensagem.hidden = false;

        botaoPublicar.disabled = true;

        return;
    }

    // =====================================================
    // 4. CONFIGURAÇÕES
    // =====================================================

    const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

    const FORMATOS_PERMITIDOS = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const TAMANHO_MINIMO_TITULO = 5;
    const TAMANHO_MAXIMO_TITULO = 120;

    const TAMANHO_MINIMO_DESCRICAO = 15;
    const TAMANHO_MAXIMO_DESCRICAO = 1000;

    const TAMANHO_MAXIMO_CATEGORIA = 80;
    const TAMANHO_MAXIMO_LOCALIZACAO = 160;

    const PRECO_MAXIMO = 99999999.99;

    const CHAVE_PUBLICACAO_PENDENTE =
        "safemarket_publicacao_pendente";

    let urlImagemAtual = null;

    let publicacaoEmAndamento = false;

    let produtoPendenteImagem = recuperarPublicacaoPendente();

    // =====================================================
    // 5. MENSAGENS
    // =====================================================

    function exibirMensagem(texto, tipo = "aviso") {

        mensagem.textContent = texto;

        mensagem.className =
            `mensagem-publicacao ${tipo}`;

        mensagem.hidden = false;
    }

    function limparMensagem() {

        mensagem.textContent = "";

        mensagem.className = "mensagem-publicacao";

        mensagem.hidden = true;
    }

    // =====================================================
    // 6. VALIDAÇÃO VISUAL
    // =====================================================

    function marcarCampo(campo, invalido) {

        if (!campo) return;

        if (invalido) {
            campo.setAttribute("aria-invalid", "true");
        } else {
            campo.removeAttribute("aria-invalid");
        }
    }

    function limparValidacao(campo) {
        marcarCampo(campo, false);
    }

    // =====================================================
    // 7. CONTADOR DE DESCRIÇÃO
    // =====================================================

    function atualizarContadorDescricao() {

        if (!contadorDescricao) return;

        const quantidade = campoDescricao.value.length;

        contadorDescricao.textContent =
            `${quantidade}/${TAMANHO_MAXIMO_DESCRICAO}`;
    }

    campoDescricao.maxLength = TAMANHO_MAXIMO_DESCRICAO;
    campoTitulo.maxLength = TAMANHO_MAXIMO_TITULO;

    campoDescricao.addEventListener(
        "input",
        atualizarContadorDescricao
    );

    atualizarContadorDescricao();

    // =====================================================
    // 8. GERENCIAMENTO DE IMAGENS
    // =====================================================

    function liberarUrlImagem() {

        if (!urlImagemAtual) return;

        URL.revokeObjectURL(urlImagemAtual);

        urlImagemAtual = null;
    }

    function removerImagem() {

        campoImagem.value = "";

        liberarUrlImagem();

        if (imagemSelecionada) {
            imagemSelecionada.removeAttribute("src");
        }

        if (previewImagem) {
            previewImagem.hidden = true;
        }
    }

    function exibirPreviewImagem(arquivo) {

        if (!previewImagem || !imagemSelecionada) return;

        liberarUrlImagem();

        urlImagemAtual = URL.createObjectURL(arquivo);

        imagemSelecionada.src = urlImagemAtual;

        previewImagem.hidden = false;
    }

    // =====================================================
    // 9. VALIDAÇÃO DE IMAGEM
    // =====================================================

    function validarImagem(arquivo) {

        if (!arquivo) return true;

        if (!FORMATOS_PERMITIDOS.includes(arquivo.type)) {

            exibirMensagem(
                "Formato inválido. Utilize JPG, PNG ou WEBP.",
                "erro"
            );

            marcarCampo(campoImagem, true);

            return false;
        }

        if (arquivo.size === 0) {

            exibirMensagem(
                "O arquivo selecionado está vazio.",
                "erro"
            );

            marcarCampo(campoImagem, true);

            return false;
        }

        if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {

            exibirMensagem(
                "A imagem deve ter no máximo 5 MB.",
                "erro"
            );

            marcarCampo(campoImagem, true);

            return false;
        }

        limparValidacao(campoImagem);

        return true;
    }

    // =====================================================
    // 10. SELEÇÃO DE IMAGEM
    // =====================================================

    campoImagem.addEventListener("change", () => {

        limparMensagem();

        const arquivo = campoImagem.files[0];

        if (!arquivo) {
            removerImagem();
            return;
        }

        if (!validarImagem(arquivo)) {

            removerImagem();

            marcarCampo(campoImagem, true);

            campoImagem.focus();

            return;
        }

        exibirPreviewImagem(arquivo);
    });

    // =====================================================
    // 11. REMOVER IMAGEM
    // =====================================================

    if (botaoRemoverImagem) {

        botaoRemoverImagem.addEventListener("click", () => {

            if (produtoPendenteImagem) {

                exibirMensagem(
                    "Existe um produto cadastrado aguardando o envio da imagem. Conclua essa publicação antes de remover o arquivo.",
                    "aviso"
                );

                return;
            }

            removerImagem();

            limparMensagem();

            limparValidacao(campoImagem);
        });
    }

    // =====================================================
    // 12. VALIDAR TÍTULO
    // =====================================================

    function validarTitulo() {

        const titulo = campoTitulo.value.trim();

        if (!titulo) {

            marcarCampo(campoTitulo, true);

            exibirMensagem(
                "Informe o título do anúncio.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }

        if (titulo.length < TAMANHO_MINIMO_TITULO) {

            marcarCampo(campoTitulo, true);

            exibirMensagem(
                "O título precisa ter pelo menos 5 caracteres.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }

        if (titulo.length > TAMANHO_MAXIMO_TITULO) {

            marcarCampo(campoTitulo, true);

            exibirMensagem(
                "O título não pode ultrapassar 120 caracteres.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }

        limparValidacao(campoTitulo);

        return true;
    }

    // =====================================================
    // 13. VALIDAR DESCRIÇÃO
    // =====================================================

    function validarDescricao() {

        const descricao = campoDescricao.value.trim();

        if (!descricao) {

            marcarCampo(campoDescricao, true);

            exibirMensagem(
                "Informe a descrição do produto.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }

        if (descricao.length < TAMANHO_MINIMO_DESCRICAO) {

            marcarCampo(campoDescricao, true);

            exibirMensagem(
                "A descrição precisa ter pelo menos 15 caracteres.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }

        if (descricao.length > TAMANHO_MAXIMO_DESCRICAO) {

            marcarCampo(campoDescricao, true);

            exibirMensagem(
                "A descrição não pode ultrapassar 1.000 caracteres.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }

        limparValidacao(campoDescricao);

        return true;
    }

    // =====================================================
    // 14. VALIDAR CATEGORIA
    // =====================================================

    function validarCategoria() {

        const categoria = campoCategoria.value.trim();

        if (!categoria) {

            marcarCampo(campoCategoria, true);

            exibirMensagem(
                "Selecione uma categoria para o produto.",
                "erro"
            );

            campoCategoria.focus();

            return false;
        }

        if (categoria.length > TAMANHO_MAXIMO_CATEGORIA) {

            marcarCampo(campoCategoria, true);

            exibirMensagem(
                "A categoria ultrapassou 80 caracteres.",
                "erro"
            );

            campoCategoria.focus();

            return false;
        }

        limparValidacao(campoCategoria);

        return true;
    }

    // =====================================================
    // 15. VALIDAR PREÇO
    // =====================================================

    function validarPreco() {

        const precoTexto = campoPreco.value.trim();

        if (!precoTexto) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "Informe o preço do produto.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(precoTexto)) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "Informe um preço válido com até duas casas decimais.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        const preco = Number(precoTexto);

        if (!Number.isFinite(preco) || preco <= 0) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "O preço precisa ser maior que zero.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        if (preco > PRECO_MAXIMO) {

            marcarCampo(campoPreco, true);

            exibirMensagem(
                "O preço ultrapassa o limite permitido.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }

        limparValidacao(campoPreco);

        return true;
    }

    // =====================================================
    // 16. VALIDAR LOCALIZAÇÃO
    // =====================================================

    function validarLocalizacao() {

        const localizacao = campoLocalizacao.value.trim();

        // A localização é opcional.
        if (!localizacao) {

            limparValidacao(campoLocalizacao);

            return true;
        }

        if (localizacao.length > TAMANHO_MAXIMO_LOCALIZACAO) {

            marcarCampo(campoLocalizacao, true);

            exibirMensagem(
                "A localização não pode ultrapassar 160 caracteres.",
                "erro"
            );

            campoLocalizacao.focus();

            return false;
        }

        limparValidacao(campoLocalizacao);

        return true;
    }

    // =====================================================
    // 17. VALIDAÇÃO GERAL
    // =====================================================

    function validarFormulario() {

        if (!validarTitulo()) return false;

        if (!validarDescricao()) return false;

        if (!validarCategoria()) return false;

        if (!validarPreco()) return false;

        if (!validarLocalizacao()) return false;

        const arquivo = campoImagem.files[0];

        if (!validarImagem(arquivo)) {

            campoImagem.focus();

            return false;
        }

        return true;
    }

    // =====================================================
    // 18. COLETAR DADOS DO ANÚNCIO
    // =====================================================

    function obterDadosAnuncio() {

        return {

            titulo: campoTitulo.value.trim(),

            descricao: campoDescricao.value.trim(),

            categoria: campoCategoria.value.trim(),

            preco: Number(campoPreco.value),

            localizacao: campoLocalizacao.value.trim() || null,

            imagem: campoImagem.files[0] || null
        };
    }

    // =====================================================
    // 19. PUBLICAÇÃO PENDENTE
    // =====================================================

    /*
       Guardamos somente o ID do produto.

       Não precisamos armazenar usuarioId no navegador:
       o backend verifica o proprietário pelo Principal
       quando recebe o upload da imagem.

       O arquivo não sobrevive a uma atualização da página.
       Nesse caso, o usuário seleciona a imagem novamente.
    */

    function recuperarPublicacaoPendente() {

        try {

            const registro = sessionStorage.getItem(
                CHAVE_PUBLICACAO_PENDENTE
            );

            if (!registro) return null;

            const dados = JSON.parse(registro);

            if (
                !dados ||
                dados.id == null ||
                dados.aguardandoImagem !== true
            ) {

                sessionStorage.removeItem(
                    CHAVE_PUBLICACAO_PENDENTE
                );

                return null;
            }

            return {

                id: dados.id,

                imagem: null,

                aguardandoImagem: true
            };

        } catch (erro) {

            console.error(
                "SafeMarket: erro ao recuperar publicação pendente.",
                erro
            );

            return null;
        }
    }

    function salvarPublicacaoPendente(produto) {

        produtoPendenteImagem = produto;

        try {

            sessionStorage.setItem(
                CHAVE_PUBLICACAO_PENDENTE,

                JSON.stringify({

                    id: produto.id,

                    aguardandoImagem: true
                })
            );

        } catch (erro) {

            console.error(
                "SafeMarket: não foi possível salvar a publicação pendente.",
                erro
            );

            exibirMensagem(
                "O produto foi cadastrado, mas não foi possível salvar o controle de recuperação desta publicação no navegador. Não atualize a página antes de concluir o envio da imagem.",
                "aviso"
            );
        }
    }

    function limparPublicacaoPendente() {

        produtoPendenteImagem = null;

        try {

            sessionStorage.removeItem(
                CHAVE_PUBLICACAO_PENDENTE
            );

        } catch (erro) {

            console.error(
                "SafeMarket: erro ao limpar publicação pendente.",
                erro
            );
        }
    }

    // =====================================================
    // 20. CADASTRAR PRODUTO
    // =====================================================

    async function cadastrarProduto(dadosAnuncio) {

        const produto = await chamarAPI(
            "/produtos",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    titulo: dadosAnuncio.titulo,

                    descricao: dadosAnuncio.descricao,

                    categoria: dadosAnuncio.categoria,

                    preco: dadosAnuncio.preco,

                    localizacao: dadosAnuncio.localizacao,

                    estoque: 1
                })
            }
        );

        if (!produto || produto.id == null) {

            throw new Error(
                "O servidor não retornou o ID do produto cadastrado."
            );
        }

        return produto;
    }

    // =====================================================
    // 21. ENVIAR IMAGEM
    // =====================================================

    async function enviarImagem(produtoId, arquivo) {

        if (!arquivo) {

            throw new Error(
                "Selecione uma imagem para concluir a publicação."
            );
        }

        const dados = new FormData();

        dados.append("imagem", arquivo);

        /*
           Não configurar Content-Type manualmente.

           O navegador gera o multipart/form-data
           com o boundary necessário.
        */

        return await chamarAPI(
            `/produtos/${encodeURIComponent(produtoId)}/imagem`,
            {
                method: "POST",
                body: dados
            }
        );
    }

    // =====================================================
    // 22. FINALIZAR PUBLICAÇÃO
    // =====================================================

    function finalizarPublicacao() {

        limparPublicacaoPendente();

        formulario.reset();

        atualizarContadorDescricao();

        removerImagem();

        formulario.querySelectorAll(
            '[aria-invalid="true"]'
        ).forEach(campo => {

            campo.removeAttribute("aria-invalid");
        });

        exibirMensagem(
            "Anúncio publicado com sucesso!",
            "sucesso"
        );

        botaoPublicar.textContent = "Publicar anúncio";
    }

    // =====================================================
    // 23. PROCESSAR PUBLICAÇÃO
    // =====================================================

    async function processarPublicacao() {

        // ---------------------------------------------
        // ETAPA 1: VERIFICAR PUBLICAÇÃO PENDENTE
        // ---------------------------------------------

        if (produtoPendenteImagem) {

            const arquivo = campoImagem.files[0];

            if (!arquivo) {

                exibirMensagem(
                    `O produto ID ${produtoPendenteImagem.id} já foi cadastrado. Selecione novamente a imagem para concluir o envio sem criar outro anúncio.`,
                    "aviso"
                );

                campoImagem.focus();

                return;
            }

            if (!validarImagem(arquivo)) {

                campoImagem.focus();

                return;
            }

            produtoPendenteImagem.imagem = arquivo;

        } else {

            // -----------------------------------------
            // ETAPA 2: VALIDAR FORMULÁRIO
            // -----------------------------------------

            if (!validarFormulario()) return;

            const dadosAnuncio = obterDadosAnuncio();

            // -----------------------------------------
            // ETAPA 3: CADASTRAR PRODUTO
            // -----------------------------------------

            exibirMensagem(
                "Enviando anúncio para o servidor...",
                "aviso"
            );

            const produto = await cadastrarProduto(
                dadosAnuncio
            );

            console.log(
                "SafeMarket: produto cadastrado.",
                produto
            );

            // -----------------------------------------
            // ETAPA 4: PRODUTO SEM IMAGEM
            // -----------------------------------------

            if (!dadosAnuncio.imagem) {

                finalizarPublicacao();

                return;
            }

            // -----------------------------------------
            // ETAPA 5: GUARDAR ID PENDENTE
            // -----------------------------------------

            salvarPublicacaoPendente({

                id: produto.id,

                imagem: dadosAnuncio.imagem,

                aguardandoImagem: true
            });
        }

        // ---------------------------------------------
        // ETAPA 6: ENVIAR IMAGEM
        // ---------------------------------------------

        exibirMensagem(
            "Produto cadastrado. Enviando imagem...",
            "aviso"
        );

        await enviarImagem(
            produtoPendenteImagem.id,
            produtoPendenteImagem.imagem
        );

        console.log(
            "SafeMarket: imagem enviada.",
            produtoPendenteImagem.id
        );

        // ---------------------------------------------
        // ETAPA 7: CONCLUIR
        // ---------------------------------------------

        finalizarPublicacao();

        console.log(
            "SafeMarket: publicação concluída."
        );
    }

    // =====================================================
    // 24. ENVIAR FORMULÁRIO
    // =====================================================

    formulario.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (publicacaoEmAndamento) return;

            limparMensagem();

            publicacaoEmAndamento = true;

            botaoPublicar.disabled = true;

            botaoPublicar.textContent = "Publicando...";

            try {

                await processarPublicacao();

            } catch (erro) {

                console.error(
                    "SafeMarket: falha na publicação.",
                    erro
                );

                const mensagemErro =
                    erro && erro.message
                        ? erro.message
                        : "Não foi possível publicar o anúncio.";

                if (produtoPendenteImagem) {

                    exibirMensagem(
                        `O produto ID ${produtoPendenteImagem.id} já foi cadastrado. O envio da imagem ainda não foi concluído. Tente novamente sem criar outro anúncio. Erro: ${mensagemErro}`,
                        "aviso"
                    );

                } else {

                    exibirMensagem(
                        mensagemErro,
                        "erro"
                    );
                }

            } finally {

                publicacaoEmAndamento = false;

                botaoPublicar.disabled = false;

                botaoPublicar.textContent =
                    produtoPendenteImagem
                        ? "Concluir envio da imagem"
                        : "Publicar anúncio";
            }
        }
    );

    // =====================================================
    // 25. LIMPAR MENSAGENS AO EDITAR
    // =====================================================

    formulario.addEventListener(
        "input",
        (evento) => {

            const campo = evento.target;

            if (
                campo.matches("input, textarea, select")
            ) {

                limparMensagem();

                limparValidacao(campo);
            }
        }
    );

    formulario.addEventListener(
        "change",
        (evento) => {

            const campo = evento.target;

            if (campo !== campoImagem) {

                limparMensagem();

                limparValidacao(campo);
            }
        }
    );

    // =====================================================
    // 26. LIMPEZA DE RECURSOS
    // =====================================================

    window.addEventListener(
        "beforeunload",
        () => {

            liberarUrlImagem();
        }
    );

    // =====================================================
    // 27. INICIALIZAÇÃO
    // =====================================================

    if (produtoPendenteImagem) {

        botaoPublicar.textContent =
            "Concluir envio da imagem";

        exibirMensagem(
            `Foi encontrada uma publicação pendente (ID ${produtoPendenteImagem.id}). Selecione novamente a imagem para concluir o envio.`,
            "aviso"
        );

    } else {

        botaoPublicar.textContent =
            "Publicar anúncio";
    }

    console.log(
        "SafeMarket: módulo de publicação inicializado com api.js."
    );

});
