
/* ==========================================================
   SAFEMARKET — AUDITORIA E LOGS
   Arquivo: js/auditoria.js

   INTEGRAÇÃO:
   GET /api/admin/auditoria

   Backend:
   Spring Boot + MySQL

   FUNCIONALIDADES:
   - Consulta dos registros reais
   - Indicadores dinâmicos
   - Pesquisa textual
   - Filtros por ação, grupo e data
   - Atualização dos registros
   - Formatação de datas
   - Tratamento de erros
   ========================================================== */

(() => {
    "use strict";

    const API_URL = "http://127.0.0.1:8080/api/admin/auditoria";

    const elementos = {
        totalRegistros: document.getElementById("total-registros"),
        totalAcessos: document.getElementById("total-acessos"),
        totalAlteracoes: document.getElementById("total-alteracoes"),
        totalOperacoes: document.getElementById("total-operacoes"),

        pesquisa: document.getElementById("pesquisa-auditoria"),
        filtroTipo: document.getElementById("filtro-tipo"),
        filtroGrupo: document.getElementById("filtro-status"),
        filtroData: document.getElementById("filtro-data"),

        limparFiltros: document.getElementById("limpar-filtros"),
        atualizar: document.getElementById("atualizar-auditoria"),

        quantidade: document.getElementById("quantidade-registros"),
        lista: document.getElementById("lista-auditoria"),
        mensagem: document.getElementById("mensagem-auditoria")
    };

    let registros = [];
    let carregando = false;

    const GRUPOS = {
        LOGIN: "ACESSO",
        LOGOUT: "ACESSO",

        CADASTRAR: "ALTERACAO",
        ATUALIZAR: "ALTERACAO",
        EXCLUIR: "ALTERACAO",

        CONSULTAR: "OPERACAO",
        MOVIMENTAR_ESTOQUE: "OPERACAO"
    };

    const NOMES_ACOES = {
        LOGIN: "Login",
        LOGOUT: "Logout",
        CADASTRAR: "Cadastro",
        ATUALIZAR: "Atualização",
        EXCLUIR: "Exclusão",
        CONSULTAR: "Consulta",
        MOVIMENTAR_ESTOQUE: "Movimentação de estoque"
    };

    /* ======================================================
       UTILITÁRIOS
    ====================================================== */

    function obterDescricao(registro) {
        const descricao = registro.descricao;

        if (!descricao) {
            return "Sem detalhes adicionais";
        }

        if (typeof descricao === "object") {
            return descricao.mensagem ||
                JSON.stringify(descricao);
        }

        try {
            const objeto = JSON.parse(descricao);

            if (objeto && typeof objeto === "object") {
                return objeto.mensagem ||
                    JSON.stringify(objeto);
            }
        } catch {
            // Descrição já está em texto simples.
        }

        return String(descricao);
    }

    function formatarData(valor) {
        if (!valor) return "Data não informada";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Data inválida";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(data);
    }

    function normalizarRegistros(resposta) {
        if (Array.isArray(resposta)) {
            return resposta;
        }

        if (Array.isArray(resposta.registros)) {
            return resposta.registros;
        }

        if (Array.isArray(resposta.content)) {
            return resposta.content;
        }

        if (Array.isArray(resposta.auditoria)) {
            return resposta.auditoria;
        }

        return [];
    }

    function mostrarMensagem(texto, tipo = "info") {
        if (!elementos.mensagem) return;

        elementos.mensagem.textContent = texto;
        elementos.mensagem.dataset.tipo = tipo;
        elementos.mensagem.classList.add("visivel");
    }

    function limparMensagem() {
        if (!elementos.mensagem) return;

        elementos.mensagem.textContent = "";
        elementos.mensagem.classList.remove("visivel");
        delete elementos.mensagem.dataset.tipo;
    }

    /* ======================================================
       CONSULTA AO BACKEND
    ====================================================== */

    async function carregarAuditoria() {
        if (carregando) return;

        carregando = true;

        limparMensagem();

        elementos.atualizar.disabled = true;
        elementos.quantidade.textContent =
            "Consultando registros...";

        elementos.lista.innerHTML = `
            <div class="estado-carregamento">
                <i data-lucide="loader-circle"></i>
                <p>Consultando banco de dados...</p>
            </div>
        `;

        atualizarIcones();

        try {
            const resposta = await fetch(API_URL, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (resposta.status === 401) {
                throw new Error(
                    "Sua sessão expirou. Entre novamente no sistema."
                );
            }

            if (resposta.status === 403) {
                throw new Error(
                    "Acesso negado. Verifique sua permissão de administrador."
                );
            }

            if (!resposta.ok) {
                throw new Error(
                    `Erro ao consultar auditoria: HTTP ${resposta.status}`
                );
            }

            const dados = await resposta.json();

            registros = normalizarRegistros(dados);

            atualizarIndicadores();
            aplicarFiltros();

        } catch (erro) {
            console.error(
                "[SafeMarket] Erro na auditoria:",
                erro
            );

            registros = [];

            atualizarIndicadores();

            elementos.lista.innerHTML = `
                <div class="estado-vazio">
                    <i data-lucide="alert-circle"></i>
                    <h3>Não foi possível carregar os registros</h3>
                    <p>${escaparHTML(erro.message)}</p>
                </div>
            `;

            elementos.quantidade.textContent =
                "Falha na consulta";

            mostrarMensagem(erro.message, "erro");

            atualizarIcones();

        } finally {
            carregando = false;
            elementos.atualizar.disabled = false;
        }
    }

    /* ======================================================
       INDICADORES
    ====================================================== */

    function atualizarIndicadores() {
        const total = registros.length;

        const acessos = registros.filter(registro =>
            ["LOGIN", "LOGOUT"].includes(registro.acao)
        ).length;

        const alteracoes = registros.filter(registro =>
            ["CADASTRAR", "ATUALIZAR", "EXCLUIR"]
                .includes(registro.acao)
        ).length;

        const operacoes = registros.filter(registro =>
            ["CONSULTAR", "MOVIMENTAR_ESTOQUE"]
                .includes(registro.acao)
        ).length;

        elementos.totalRegistros.textContent = total;
        elementos.totalAcessos.textContent = acessos;
        elementos.totalAlteracoes.textContent = alteracoes;
        elementos.totalOperacoes.textContent = operacoes;
    }

    /* ======================================================
       SEGURANÇA CONTRA HTML INJETADO
    ====================================================== */

    function escaparHTML(valor) {
        return String(valor ?? "").replace(
            /[&<>"']/g,
            caractere => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[caractere]
        );
    }

    /* ======================================================
       FILTROS
    ====================================================== */

    function aplicarFiltros() {
        const pesquisa = elementos.pesquisa.value
            .trim()
            .toLowerCase();

        const tipo = elementos.filtroTipo.value;
        const grupo = elementos.filtroGrupo.value;
        const dataFiltro = elementos.filtroData.value;

        const filtrados = registros.filter(registro => {

            const descricao = obterDescricao(registro);

            const texto = [
                registro.id,
                registro.usuarioId,
                registro.acao,
                registro.entidade,
                registro.entidadeId,
                descricao
            ].join(" ").toLowerCase();

            const correspondePesquisa =
                !pesquisa || texto.includes(pesquisa);

            const correspondeTipo =
                !tipo || registro.acao === tipo;

            const correspondeGrupo =
                !grupo || GRUPOS[registro.acao] === grupo;

            const dataRegistro = registro.data
                ? String(registro.data).substring(0, 10)
                : "";

            const correspondeData =
                !dataFiltro || dataRegistro === dataFiltro;

            return (
                correspondePesquisa &&
                correspondeTipo &&
                correspondeGrupo &&
                correspondeData
            );
        });

        renderizarRegistros(filtrados);
    }

    /* ======================================================
       RENDERIZAÇÃO
    ====================================================== */

    function renderizarRegistros(lista) {
        elementos.lista.innerHTML = "";

        elementos.quantidade.textContent =
            `${lista.length} registro(s) encontrado(s)`;

        if (lista.length === 0) {
            elementos.lista.innerHTML = `
                <div class="estado-vazio">
                    <i data-lucide="search-x"></i>
                    <h3>Nenhum registro encontrado</h3>
                    <p>
                        Não existem atividades correspondentes
                        aos filtros selecionados.
                    </p>
                </div>
            `;

            atualizarIcones();
            return;
        }

        const fragmento = document.createDocumentFragment();

        lista.forEach(registro => {

            const acao = escaparHTML(
                NOMES_ACOES[registro.acao] ||
                registro.acao ||
                "Não identificada"
            );

            const usuario = registro.usuarioId != null
                ? `Usuário #${escaparHTML(registro.usuarioId)}`
                : "Usuário não identificado";

            const entidade = escaparHTML(
                registro.entidade || "Não informada"
            );

            const descricao = escaparHTML(
                obterDescricao(registro)
            );

            const data = escaparHTML(
                formatarData(registro.data)
            );

            const id = escaparHTML(registro.id);

            const item = document.createElement("article");

            item.className = "item-auditoria";

            item.innerHTML = `
                <div class="icone-registro">
                    <i data-lucide="${iconeAcao(registro.acao)}"></i>
                </div>

                <div class="informacoes-registro">

                    <div class="topo-registro">
                        <h3>${acao}</h3>
                        <span class="identificador-registro">
                            #${id}
                        </span>
                    </div>

                    <p class="descricao-registro">
                        ${descricao}
                    </p>

                    <div class="detalhes-registro">

                        <span>
                            <i data-lucide="user"></i>
                            ${usuario}
                        </span>

                        <span>
                            <i data-lucide="database"></i>
                            ${entidade}
                        </span>

                        <span>
                            <i data-lucide="calendar-clock"></i>
                            ${data}
                        </span>

                    </div>

                </div>
            `;

            fragmento.appendChild(item);
        });

        elementos.lista.appendChild(fragmento);

        atualizarIcones();
    }

    /* ======================================================
       ÍCONES
    ====================================================== */

    function iconeAcao(acao) {
        const icones = {
            LOGIN: "log-in",
            LOGOUT: "log-out",
            CADASTRAR: "user-plus",
            ATUALIZAR: "file-pen-line",
            EXCLUIR: "trash-2",
            CONSULTAR: "search",
            MOVIMENTAR_ESTOQUE: "package"
        };

        return icones[acao] || "activity";
    }

    function atualizarIcones() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /* ======================================================
       EVENTOS
    ====================================================== */

    function registrarEventos() {

        elementos.pesquisa.addEventListener(
            "input",
            aplicarFiltros
        );

        elementos.filtroTipo.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.filtroGrupo.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.filtroData.addEventListener(
            "change",
            aplicarFiltros
        );

        elementos.limparFiltros.addEventListener(
            "click",
            () => {

                elementos.pesquisa.value = "";
                elementos.filtroTipo.value = "";
                elementos.filtroGrupo.value = "";
                elementos.filtroData.value = "";

                limparMensagem();
                aplicarFiltros();
            }
        );

        elementos.atualizar.addEventListener(
            "click",
            carregarAuditoria
        );
    }

    /* ======================================================
       INICIALIZAÇÃO
    ====================================================== */

    function iniciar() {

        registrarEventos();
        atualizarIcones();

        carregarAuditoria();

    }

    document.addEventListener(
        "DOMContentLoaded",
        iniciar,
        { once: true }
    );

})();
