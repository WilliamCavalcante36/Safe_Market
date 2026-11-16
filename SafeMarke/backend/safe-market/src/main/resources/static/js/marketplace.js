
/* ==========================================================
   SAFEMARKET — MARKETPLACE
   Arquivo: js/marketplace.js
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* ======================================================
       01. ELEMENTOS HTML
    ====================================================== */

    const formulario = document.getElementById("form-pesquisa");

    const campoPesquisa = document.getElementById(
        "pesquisa-produto"
    );

    const botoesCategorias = document.querySelectorAll(
        ".categoria-item"
    );

    const campoOrdenacao = document.getElementById(
        "ordenacao"
    );

    const listaProdutos = document.getElementById(
        "lista-produtos"
    );

    const estadoVazio = document.getElementById(
        "estado-vazio"
    );

    const textoResultados = document.getElementById(
        "texto-resultados"
    );

    const carregando = document.getElementById(
        "carregando"
    );

    const mensagemErro = document.getElementById(
        "mensagem-erro"
    );

    const botaoPublicar = document.querySelector(
        ".botao-publicar"
    );


    /* ======================================================
       02. VERIFICAÇÃO DOS ELEMENTOS
    ====================================================== */

    if (!listaProdutos || !estadoVazio) {

        console.error(
            "SafeMarket: elementos principais do Marketplace não encontrados."
        );

        return;

    }


    /* ======================================================
       03. ESTADO DA APLICAÇÃO
    ====================================================== */

    let categoriaSelecionada = "todos";

    let termoPesquisa = "";

    let ordenacaoSelecionada = campoOrdenacao
        ? campoOrdenacao.value
        : "recentes";

    /*
       Os produtos serão recebidos do backend.

       Estrutura esperada de cada produto:

       {
           id: 1,
           titulo: "Notebook",
           categoria: "informatica",
           preco: 2500,
           imagem: "caminho/imagem.jpg",
           localizacao: "Brasília - DF",
           criadoEm: "2026-11-10"
       }
    */

    let produtos = [];


    /* ======================================================
       04. FUNÇÕES AUXILIARES
    ====================================================== */

    function normalizarTexto(texto) {

        return String(texto ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    function obterTitulo(produto) {

        return produto.titulo ||
            produto.nome ||
            "Produto sem título";

    }


    function obterCategoria(produto) {

        return produto.categoria ||
            "Sem categoria";

    }


    function obterImagem(produto) {

        return produto.imagem ||
            produto.url_imagem ||
            produto.imagem_url ||
            "";

    }


    function obterLocalizacao(produto) {

        return produto.localizacao ||
            produto.cidade ||
            "Localização não informada";

    }


    function formatarPreco(preco) {

        if (preco === null || preco === undefined || preco === "") {
            return "Preço não informado";
        }

        const numero = obterPrecoNumerico(preco);

        return numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    }


    function obterPrecoNumerico(preco) {

        if (typeof preco === "number") {

            return Number.isFinite(preco) ? preco : 0;

        }

        /*
           Aceita valores como:
           2500
           "2500"
           "2500,50"
           "R$ 2.500,50"
        */

        let valor = String(preco ?? "")
            .replace(/[^\d,.-]/g, "");

        if (valor.includes(",")) {

            valor = valor
                .replace(/\./g, "")
                .replace(",", ".");

        }

        const numero = Number(valor);

        return Number.isFinite(numero) ? numero : 0;

    }


    function mostrarCarregamento(exibir) {

        if (!carregando) return;

        carregando.style.display = exibir
            ? "flex"
            : "none";

    }


    function mostrarErro(mensagem = "") {

        if (!mensagemErro) return;

        mensagemErro.textContent = mensagem;

        mensagemErro.style.display = mensagem
            ? "block"
            : "none";

    }


    /* ======================================================
       05. FILTRAR PRODUTOS
    ====================================================== */

    function filtrarProdutos() {

        return produtos.filter(produto => {

            const titulo = normalizarTexto(
                obterTitulo(produto)
            );

            const categoria = normalizarTexto(
                obterCategoria(produto)
            );

            const pesquisaNormalizada = normalizarTexto(
                termoPesquisa
            );

            const correspondePesquisa =
                titulo.includes(pesquisaNormalizada);

            const correspondeCategoria =
                categoriaSelecionada === "todos" ||
                categoria === normalizarTexto(
                    categoriaSelecionada
                );

            return correspondePesquisa &&
                correspondeCategoria;

        });

    }


    /* ======================================================
       06. ORDENAR PRODUTOS
    ====================================================== */

    function ordenarProdutos(lista) {

        const produtosOrdenados = [...lista];

        switch (ordenacaoSelecionada) {

            case "menor-preco":

                produtosOrdenados.sort((a, b) => {

                    return obterPrecoNumerico(a.preco) -
                        obterPrecoNumerico(b.preco);

                });

                break;


            case "maior-preco":

                produtosOrdenados.sort((a, b) => {

                    return obterPrecoNumerico(b.preco) -
                        obterPrecoNumerico(a.preco);

                });

                break;


            case "recentes":

            default:

                produtosOrdenados.sort((a, b) => {

                    const dataA = new Date(
                        a.criadoEm || a.created_at || 0
                    ).getTime();

                    const dataB = new Date(
                        b.criadoEm || b.created_at || 0
                    ).getTime();

                    return dataB - dataA;

                });

                break;

        }

        return produtosOrdenados;

    }


    /* ======================================================
       07. CRIAR CARD DO PRODUTO
    ====================================================== */

    function criarCardProduto(produto) {

        const card = document.createElement("article");

        card.className = "produto-card";


        /* ÁREA DA IMAGEM */

        const areaImagem = document.createElement("div");

        areaImagem.className = "produto-imagem";


        const imagem = document.createElement("img");

        const caminhoImagem = obterImagem(produto);

        imagem.alt = `Imagem de ${obterTitulo(produto)}`;

        imagem.loading = "lazy";


        if (caminhoImagem) {

            imagem.src = caminhoImagem;

        } else {

            areaImagem.classList.add("sem-imagem");

        }


        imagem.addEventListener("error", () => {

            imagem.removeAttribute("src");

            imagem.alt = "Imagem indisponível";

            areaImagem.classList.add("sem-imagem");

        });


        if (caminhoImagem) {

            areaImagem.appendChild(imagem);

        }


        /* INFORMAÇÕES DO PRODUTO */

        const informacoes = document.createElement("div");

        informacoes.className = "produto-info";


        /* CATEGORIA */

        const categoria = document.createElement("span");

        categoria.className = "produto-categoria";

        categoria.textContent = obterCategoria(produto);


        /* TÍTULO */

        const titulo = document.createElement("h3");

        titulo.textContent = obterTitulo(produto);


        /* PREÇO */

        const preco = document.createElement("p");

        preco.className = "produto-preco";

        preco.textContent = formatarPreco(produto.preco);


        /* LOCALIZAÇÃO */

        const localizacao = document.createElement("span");

        localizacao.className = "produto-localizacao";

        localizacao.textContent = obterLocalizacao(produto);


        /* MONTAGEM */

        informacoes.append(
            categoria,
            titulo,
            preco,
            localizacao
        );
        if (produto.id != null) {
            const botaoCarrinho = document.createElement("button");
            botaoCarrinho.type = "button";
            botaoCarrinho.textContent = "Adicionar ao carrinho";
            botaoCarrinho.addEventListener("click", () => window.adicionarAoCarrinho(produto.id, 1));
            informacoes.appendChild(botaoCarrinho);
        }


        card.append(
            areaImagem,
            informacoes
        );


        return card;

    }


    /* ======================================================
       08. ATUALIZAR ESTADO VAZIO
    ====================================================== */

    function atualizarEstadoVazio(quantidade) {

        if (quantidade === 0) {

            estadoVazio.style.display = "flex";

            if (textoResultados) {

                if (termoPesquisa) {

                    textoResultados.textContent =
                        "Nenhum produto corresponde à sua pesquisa.";

                } else if (categoriaSelecionada !== "todos") {

                    textoResultados.textContent =
                        "Nenhum produto encontrado nesta categoria.";

                } else {

                    textoResultados.textContent =
                        "Ainda não existem anúncios publicados.";

                }

            }

            return;

        }


        estadoVazio.style.display = "none";

        if (textoResultados) {

            textoResultados.textContent =
                `${quantidade} produto(s) encontrado(s).`;

        }

    }


    /* ======================================================
       09. RENDERIZAR PRODUTOS
    ====================================================== */

    function renderizarProdutos() {

        const produtosFiltrados = filtrarProdutos();

        const produtosOrdenados = ordenarProdutos(
            produtosFiltrados
        );


        listaProdutos.innerHTML = "";


        atualizarEstadoVazio(
            produtosOrdenados.length
        );


        if (produtosOrdenados.length === 0) {

            return;

        }


        const fragmento = document.createDocumentFragment();


        produtosOrdenados.forEach(produto => {

            const card = criarCardProduto(produto);

            fragmento.appendChild(card);

        });


        listaProdutos.appendChild(fragmento);

    }


    /* ======================================================
       10. PESQUISA
    ====================================================== */

    if (formulario && campoPesquisa) {

        formulario.addEventListener("submit", evento => {

            evento.preventDefault();

            termoPesquisa = campoPesquisa.value.trim();

            renderizarProdutos();

        });


        campoPesquisa.addEventListener("input", () => {

            termoPesquisa = campoPesquisa.value.trim();

            renderizarProdutos();

        });

    }


    /* ======================================================
       11. FILTRO POR CATEGORIA
    ====================================================== */

    botoesCategorias.forEach(botao => {

        botao.addEventListener("click", () => {

            botoesCategorias.forEach(item => {

                item.classList.remove("ativo");

                item.setAttribute(
                    "aria-pressed",
                    "false"
                );

            });


            botao.classList.add("ativo");

            botao.setAttribute(
                "aria-pressed",
                "true"
            );


            categoriaSelecionada =
                botao.dataset.categoria || "todos";


            renderizarProdutos();

        });

    });


    /* ======================================================
       12. ORDENAÇÃO
    ====================================================== */

    if (campoOrdenacao) {

        campoOrdenacao.addEventListener("change", () => {

            ordenacaoSelecionada = campoOrdenacao.value;

            renderizarProdutos();

        });

    }


    /* ======================================================
       13. EFEITO DE LUZ DO CURSOR
       BOTÃO PUBLICAR ANÚNCIO
    ====================================================== */

    if (botaoPublicar) {

        botaoPublicar.addEventListener(
            "mousemove",
            evento => {

                const retangulo =
                    botaoPublicar.getBoundingClientRect();

                const x = evento.clientX - retangulo.left;

                const y = evento.clientY - retangulo.top;


                botaoPublicar.style.setProperty(
                    "--mouse-x",
                    `${x}px`
                );

                botaoPublicar.style.setProperty(
                    "--mouse-y",
                    `${y}px`
                );

            }
        );


        botaoPublicar.addEventListener(
            "mouseleave",
            () => {

                botaoPublicar.style.removeProperty("--mouse-x");

                botaoPublicar.style.removeProperty("--mouse-y");

            }
        );

    }


    /* ======================================================
       14. CARREGAR PRODUTOS DA API
    ====================================================== */

    async function carregarProdutos() {

        mostrarCarregamento(true);

        mostrarErro();


        try {

            /*
               Endpoint esperado:

               GET http://localhost:3000/api/produtos

               A função requisicaoAPI está no arquivo api.js.
            */


            if (typeof requisicaoAPI !== "function") {

                throw new Error(
                    "A função requisicaoAPI não foi encontrada. Verifique se api.js foi carregado."
                );

            }


            const resposta = await requisicaoAPI("/produtos");


            if (!resposta) {

                throw new Error(
                    "O servidor não retornou uma resposta válida."
                );

            }


            /*
               Aceita dois formatos:

               Formato 1:
               [ { produto }, { produto } ]

               Formato 2:
               { produtos: [ { produto }, { produto } ] }
            */

            const listaRecebida = Array.isArray(resposta)
                ? resposta
                : resposta.produtos;


            if (!Array.isArray(listaRecebida)) {

                throw new Error(
                    "O formato dos produtos recebido do servidor é inválido."
                );

            }


            produtos = listaRecebida;

            renderizarProdutos();


        } catch (erro) {

            console.error(
                "SafeMarket: erro ao carregar produtos.",
                erro
            );


            produtos = [];

            renderizarProdutos();


            mostrarErro(
                "Não foi possível carregar os produtos. Verifique se o servidor está funcionando."
            );


        } finally {

            mostrarCarregamento(false);

        }

    }


    /* ======================================================
       15. INICIALIZAÇÃO
    ====================================================== */

    async function iniciarMarketplace() {

        mostrarCarregamento(true);

        await carregarProdutos();

    }


    iniciarMarketplace();


    /* ======================================================
       16. ATUALIZAÇÃO EXTERNA DOS PRODUTOS
    ====================================================== */

    window.atualizarMarketplace = function (novosProdutos) {

        if (!Array.isArray(novosProdutos)) {

            console.error(
                "SafeMarket: a lista recebida não é válida."
            );

            return;

        }


        produtos = novosProdutos;

        mostrarErro();

        renderizarProdutos();

    };


    /* ======================================================
       17. CONFIRMAÇÃO
    ====================================================== */

    console.log(
        "SafeMarket Marketplace inicializado."
    );

});

window.adicionarAoCarrinho=async function(produtoId,quantidade=1){try{await requisicaoAPI('/carrinho',{method:'POST',body:JSON.stringify({produtoId:Number(produtoId),quantidade:Number(quantidade)})});alert('Produto adicionado ao carrinho!');}catch(e){alert(e.message);}};
