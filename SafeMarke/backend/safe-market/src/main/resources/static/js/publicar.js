
/* =====================================================
   SAFEMARKET — PUBLICAR ANÚNCIO
   Arquivo: js/publicar.js

   Responsabilidades:
   - Validar informações do anúncio.
   - Contabilizar caracteres.
   - Gerenciar imagens.
   - Exibir mensagens ao usuário.
   - Preparar os dados para integração com a API.
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       1. ELEMENTOS HTML
    ===================================================== */

    const formulario = document.getElementById("form-publicar-anuncio");

    const campoTitulo = document.getElementById("titulo");
    const campoDescricao = document.getElementById("descricao");
    const campoCategoria = document.getElementById("categoria");
    const campoPreco = document.getElementById("preco");
    const campoLocalizacao = document.getElementById("localizacao");
    const campoImagem = document.getElementById("imagem");

    const contadorDescricao = document.getElementById("contador-descricao");

    const previewImagem = document.getElementById("preview-imagem");
    const imagemSelecionada = document.getElementById("imagem-selecionada");
    const botaoRemoverImagem = document.getElementById("remover-imagem");

    const mensagem = document.getElementById("mensagem-publicacao");
    const botaoPublicar = document.getElementById("botao-publicar");


    /* =====================================================
       2. VERIFICAÇÃO DOS ELEMENTOS
    ===================================================== */

    if (!formulario) {
        console.error("SafeMarket: formulário de publicação não encontrado.");
        return;
    }

    if (
        !campoTitulo ||
        !campoDescricao ||
        !campoCategoria ||
        !campoPreco ||
        !campoImagem ||
        !mensagem ||
        !botaoPublicar
    ) {
        console.error(
            "SafeMarket: existem elementos obrigatórios ausentes no HTML."
        );
        return;
    }


    /* =====================================================
       3. CONFIGURAÇÕES
    ===================================================== */

    const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

    const FORMATOS_PERMITIDOS = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const TAMANHO_MINIMO_TITULO = 5;
    const TAMANHO_MAXIMO_TITULO = 100;

    const TAMANHO_MINIMO_DESCRICAO = 15;
    const TAMANHO_MAXIMO_DESCRICAO = 2000;

    const PRECO_MAXIMO = 99999999.99;

    let urlImagemAtual = null;


    /* =====================================================
       4. MENSAGENS DO SISTEMA
    ===================================================== */

    function exibirMensagem(texto, tipo = "aviso") {

        mensagem.textContent = texto;

        mensagem.className = `mensagem-publicacao ${tipo}`;

        mensagem.hidden = false;
    }


    function limparMensagem() {

        mensagem.textContent = "";

        mensagem.className = "mensagem-publicacao";

        mensagem.hidden = true;
    }


    /* =====================================================
       5. CONTADOR DA DESCRIÇÃO
    ===================================================== */

    function atualizarContadorDescricao() {

        const quantidade = campoDescricao.value.length;

        if (!contadorDescricao) return;

        contadorDescricao.textContent =
            `${quantidade}/${TAMANHO_MAXIMO_DESCRICAO}`;
    }


    campoDescricao.addEventListener(
        "input",
        atualizarContadorDescricao
    );

    atualizarContadorDescricao();


    /* =====================================================
       6. CONTROLE DE CAMPOS INVÁLIDOS
    ===================================================== */

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


    /* =====================================================
       7. GERENCIAMENTO DE IMAGENS
    ===================================================== */

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


    /* =====================================================
       8. VALIDAÇÃO DA IMAGEM
    ===================================================== */

    function validarImagem(arquivo) {

        if (!arquivo) return true;

        if (!FORMATOS_PERMITIDOS.includes(arquivo.type)) {

            exibirMensagem(
                "Formato inválido. Utilize uma imagem JPG, PNG ou WEBP.",
                "erro"
            );

            return false;
        }


        if (arquivo.size === 0) {

            exibirMensagem(
                "O arquivo selecionado está vazio.",
                "erro"
            );

            return false;
        }


        if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {

            exibirMensagem(
                "A imagem deve ter no máximo 5 MB.",
                "erro"
            );

            return false;
        }


        return true;
    }


    /* =====================================================
       9. SELEÇÃO DA IMAGEM
    ===================================================== */

    campoImagem.addEventListener("change", () => {

        limparMensagem();

        const arquivo = campoImagem.files[0];

        if (!arquivo) {

            removerImagem();

            return;
        }


        if (!validarImagem(arquivo)) {

            removerImagem();

            campoImagem.focus();

            return;
        }


        exibirPreviewImagem(arquivo);

    });


    /* =====================================================
       10. REMOÇÃO DA IMAGEM
    ===================================================== */

    if (botaoRemoverImagem) {

        botaoRemoverImagem.addEventListener("click", () => {

            removerImagem();

            limparMensagem();

        });

    }


    /* =====================================================
       11. VALIDAÇÃO DO TÍTULO
    ===================================================== */

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
                "O título não pode ultrapassar 100 caracteres.",
                "erro"
            );

            campoTitulo.focus();

            return false;
        }


        limparValidacao(campoTitulo);

        return true;
    }


    /* =====================================================
       12. VALIDAÇÃO DA DESCRIÇÃO
    ===================================================== */

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
                "A descrição ultrapassou o limite de 2000 caracteres.",
                "erro"
            );

            campoDescricao.focus();

            return false;
        }


        limparValidacao(campoDescricao);

        return true;
    }


    /* =====================================================
       13. VALIDAÇÃO DA CATEGORIA
    ===================================================== */

    function validarCategoria() {

        if (!campoCategoria.value) {

            marcarCampo(campoCategoria, true);

            exibirMensagem(
                "Selecione uma categoria para o produto.",
                "erro"
            );

            campoCategoria.focus();

            return false;
        }


        limparValidacao(campoCategoria);

        return true;
    }


    /* =====================================================
       14. VALIDAÇÃO DO PREÇO
    ===================================================== */

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
                "Informe um preço válido, utilizando no máximo duas casas decimais.",
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
                "O preço informado ultrapassa o limite permitido.",
                "erro"
            );

            campoPreco.focus();

            return false;
        }


        limparValidacao(campoPreco);

        return true;
    }


    /* =====================================================
       15. VALIDAÇÃO GERAL
    ===================================================== */

    function validarFormulario() {

        if (!validarTitulo()) return false;

        if (!validarDescricao()) return false;

        if (!validarCategoria()) return false;

        if (!validarPreco()) return false;


        const arquivo = campoImagem.files[0];

        if (!validarImagem(arquivo)) {

            campoImagem.focus();

            return false;
        }


        return true;
    }


    /* =====================================================
       16. COLETA DOS DADOS
    ===================================================== */

    function obterDadosAnuncio() {

        return {

            titulo: campoTitulo.value.trim(),

            descricao: campoDescricao.value.trim(),

            categoria: campoCategoria.value,

            preco: Number(campoPreco.value),

            localizacao: campoLocalizacao
                ? campoLocalizacao.value.trim()
                : "",

            imagem: campoImagem.files[0] || null

        };
    }


    /* =====================================================
       17. ENVIO DO FORMULÁRIO
    ===================================================== */

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        limparMensagem();


        if (!validarFormulario()) return;


        const dadosAnuncio = obterDadosAnuncio();


        botaoPublicar.disabled = true;
        try {
            const produto = await requisicaoAPI("/produtos", {
                method: "POST",
                body: JSON.stringify({
                    titulo: dadosAnuncio.titulo,
                    descricao: dadosAnuncio.descricao.slice(0,1000),
                    categoria: dadosAnuncio.categoria,
                    preco: dadosAnuncio.preco,
                    localizacao: dadosAnuncio.localizacao,
                    estoque: 1
                })
            });
            if (dadosAnuncio.imagem) {
                const dados = new FormData();
                dados.append("imagem", dadosAnuncio.imagem);
                await requisicaoAPI(`/produtos/${produto.id}/imagem`, {method:"POST", body:dados});
            }
            exibirMensagem("Anúncio publicado com sucesso!", "sucesso");
            formulario.reset();
        } catch (erro) {
            exibirMensagem("Falha ao publicar: " + erro.message, "erro");
        } finally {botaoPublicar.disabled = false;}

    });


    /* =====================================================
       18. LIMPAR MENSAGENS AO EDITAR
    ===================================================== */

    formulario.addEventListener("input", (evento) => {

        const campo = evento.target;

        if (campo.matches("input, textarea, select")) {

            limparMensagem();

            limparValidacao(campo);
        }

    });


    formulario.addEventListener("change", (evento) => {

        const campo = evento.target;

        if (campo !== campoImagem) {

            limparMensagem();

            limparValidacao(campo);
        }

    });


    /* =====================================================
       19. LIMPEZA AO SAIR DA PÁGINA
    ===================================================== */

    window.addEventListener("beforeunload", () => {

        liberarUrlImagem();

    });


    /* =====================================================
       20. INICIALIZAÇÃO
    ===================================================== */

    console.log(
        "SafeMarket: módulo de publicação inicializado."
    );

});
