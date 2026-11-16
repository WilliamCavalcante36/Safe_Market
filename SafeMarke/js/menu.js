
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // 1. ELEMENTOS DO MENU
    // =====================================================

    const menuLateral = document.getElementById("menu-lateral");
    const navegacao = document.getElementById("menu-navegacao");
    const botaoMenu = document.getElementById("alternar-menu");

    if (!menuLateral || !navegacao || !botaoMenu) {
        console.error("SafeMarket: elementos do menu não encontrados.");
        return;
    }

    const iconeMenu = botaoMenu.querySelector("i");


    // =====================================================
    // 2. GARANTIR QUE A NAVEGAÇÃO NÃO SEJA REORDENADA
    // =====================================================

    navegacao.style.display = "flex";
    navegacao.style.flexDirection = "column";
    navegacao.style.justifyContent = "flex-start";


    // =====================================================
    // 3. IDENTIFICAR A PÁGINA ATUAL
    // =====================================================

    function atualizarPaginaAtiva() {

        const caminhoAtual = window.location.pathname;
        const paginaAtual = caminhoAtual
            .split("/")
            .pop()
            .toLowerCase();

        const links = navegacao.querySelectorAll(":scope > a");

        links.forEach((link) => {

            const destino = link.getAttribute("href");

            if (!destino) {
                return;
            }

            const paginaDestino = destino
                .split("/")
                .pop()
                .toLowerCase();

            const ativo = paginaDestino === paginaAtual;

            link.classList.toggle("ativo", ativo);

            if (ativo) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }

        });

    }


    // =====================================================
    // 4. ATUALIZAR ESTADO DO MENU
    // =====================================================

    function atualizarMenu(recolhido) {

        document.body.classList.toggle(
            "menu-recolhido",
            recolhido
        );

        botaoMenu.setAttribute(
            "aria-expanded",
            String(!recolhido)
        );

        const descricao = recolhido
            ? "Expandir menu"
            : "Recolher menu";

        botaoMenu.setAttribute("aria-label", descricao);
        botaoMenu.setAttribute("title", descricao);


        // Atualizar ícone sem recriar a navegação

        if (iconeMenu) {

            const novoIcone = recolhido
                ? "panel-left-open"
                : "panel-left-close";

            if (
                iconeMenu.getAttribute("data-lucide") !== novoIcone
            ) {

                iconeMenu.setAttribute(
                    "data-lucide",
                    novoIcone
                );

                if (window.lucide) {
                    window.lucide.createIcons({
                        root: botaoMenu
                    });
                }

            }

        }

    }


    // =====================================================
    // 5. EVENTO DO BOTÃO
    // =====================================================

    botaoMenu.addEventListener("click", () => {

        const recolhido =
            document.body.classList.contains("menu-recolhido");

        atualizarMenu(!recolhido);

    });


    // =====================================================
    // 6. ESTADO INICIAL
    // =====================================================

    const menuInicial =
        document.body.classList.contains("menu-recolhido");

    atualizarPaginaAtiva();
    atualizarMenu(menuInicial);


    // =====================================================
    // 7. VERIFICAÇÃO DA NAVEGAÇÃO
    // =====================================================

    const ordemEsperada = [
        "dashboard.html",
        "usuarios.html",
        "auditoria.html",
        "monitoramento.html",
        "alertas.html",
        "pericia.html",
        "configuracoes.html"
    ];

    const linksMenu = Array.from(
        navegacao.querySelectorAll(":scope > a")
    );

    const ordemAtual = linksMenu.map((link) => {
        return link.getAttribute("href")
            ?.split("/")
            .pop()
            .toLowerCase();
    });

    const ordemCorreta =
        ordemAtual.length === ordemEsperada.length &&
        ordemAtual.every((pagina, indice) => {
            return pagina === ordemEsperada[indice];
        });

    if (!ordemCorreta) {
        console.error(
            "SafeMarket: ordem incorreta no menu.",
            {
                esperado: ordemEsperada,
                encontrado: ordemAtual
            }
        );
    }

});
