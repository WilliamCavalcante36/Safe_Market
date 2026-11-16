
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const elementos = {
        totalRegistros: document.getElementById("total-registros"),
        totalUsuarios: document.getElementById("total-usuarios"),
        totalAcoes: document.getElementById("total-acoes"),
        totalIps: document.getElementById("total-ips"),

        pesquisa: document.getElementById("pesquisa-caso"),
        usuario: document.getElementById("filtro-usuario"),
        acao: document.getElementById("filtro-acao"),
        ip: document.getElementById("filtro-ip"),
        dataInicio: document.getElementById("data-inicio"),
        dataFim: document.getElementById("data-fim"),

        btnFiltrar: document.getElementById("btn-filtrar"),
        btnLimpar: document.getElementById("btn-limpar-filtros"),

        lista: document.getElementById("lista-investigacoes"),
        semResultados: document.getElementById("sem-resultados"),
        mensagem: document.getElementById("mensagem-pericia"),

        painelDetalhes: document.getElementById("detalhes-investigacao"),
        fecharDetalhes: document.getElementById("fechar-detalhes"),

        detalheId: document.getElementById("detalhe-id"),
        detalheUsuario: document.getElementById("detalhe-usuario"),
        detalheEmail: document.getElementById("detalhe-email"),
        detalheAcao: document.getElementById("detalhe-acao"),
        detalheEntidade: document.getElementById("detalhe-entidade"),
        detalheEntidadeId: document.getElementById("detalhe-entidade-id"),
        detalheIp: document.getElementById("detalhe-ip"),
        detalheData: document.getElementById("detalhe-data"),
        detalheDescricao: document.getElementById("detalhe-descricao")
    };

    let registros = [];

    function mostrarMensagem(texto, tipo = "") {
        elementos.mensagem.textContent = texto;
        elementos.mensagem.className = "mensagem-pericia";

        if (tipo) {
            elementos.mensagem.classList.add(tipo);
        }
    }

    function valorSeguro(valor, alternativa = "Não informado") {
        if (valor === null || valor === undefined || valor === "") {
            return alternativa;
        }

        return String(valor);
    }

    function formatarData(valor) {
        if (!valor) {
            return "Não informada";
        }

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return String(valor);
        }

        return data.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium"
        });
    }

    function normalizar(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        return elemento;
    }

    function atualizarIndicadores(lista) {
        const usuarios = new Set();
        const acoes = new Set();
        const ips = new Set();

        lista.forEach(registro => {
            if (registro.usuarioId !== null && registro.usuarioId !== undefined) {
                usuarios.add(String(registro.usuarioId));
            }

            if (registro.acao) {
                acoes.add(registro.acao);
            }

            if (registro.ipOrigem) {
                ips.add(registro.ipOrigem);
            }
        });

        elementos.totalRegistros.textContent = lista.length;
        elementos.totalUsuarios.textContent = usuarios.size;
        elementos.totalAcoes.textContent = acoes.size;
        elementos.totalIps.textContent = ips.size;
    }

    function limparLista() {
        elementos.lista
            .querySelectorAll(".registro-auditoria")
            .forEach(elemento => elemento.remove());
    }

    function mostrarDetalhes(registro) {
        elementos.detalheId.textContent =
            valorSeguro(registro.id);

        elementos.detalheUsuario.textContent =
            `${valorSeguro(registro.usuarioNome)} (ID: ${valorSeguro(registro.usuarioId)})`;

        elementos.detalheEmail.textContent =
            valorSeguro(registro.usuarioEmail);

        elementos.detalheAcao.textContent =
            valorSeguro(registro.acao);

        elementos.detalheEntidade.textContent =
            valorSeguro(registro.entidade);

        elementos.detalheEntidadeId.textContent =
            valorSeguro(registro.entidadeId);

        elementos.detalheIp.textContent =
            valorSeguro(registro.ipOrigem);

        elementos.detalheData.textContent =
            formatarData(registro.data);

        elementos.detalheDescricao.textContent =
            valorSeguro(registro.detalhes);

        elementos.painelDetalhes.hidden = false;

        elementos.painelDetalhes.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function criarCartaoRegistro(registro) {
        const cartao = criarElemento("article", "registro-auditoria");

        const principal = criarElemento("div", "registro-principal");

        const titulo = criarElemento(
            "h3",
            "",
            `${valorSeguro(registro.acao, "AÇÃO")} — Registro #${valorSeguro(registro.id)}`
        );

        const usuario = criarElemento(
            "p",
            "",
            `Usuário: ${valorSeguro(registro.usuarioNome)} (ID: ${valorSeguro(registro.usuarioId)})`
        );

        const entidade = criarElemento(
            "p",
            "",
            `Entidade: ${valorSeguro(registro.entidade)}`
        );

        const data = criarElemento(
            "p",
            "",
            `Data: ${formatarData(registro.data)}`
        );

        const ip = criarElemento(
            "p",
            "",
            `IP: ${valorSeguro(registro.ipOrigem)}`
        );

        const meta = criarElemento("div", "registro-meta");

        const etiqueta = criarElemento(
            "span",
            "status-caso",
            valorSeguro(registro.acao)
        );

        meta.appendChild(etiqueta);

        principal.append(
            titulo,
            usuario,
            entidade,
            data,
            ip,
            meta
        );

        const botao = criarElemento(
            "button",
            "botao-detalhes",
            "Ver detalhes"
        );

        botao.type = "button";

        botao.addEventListener("click", () => {
            mostrarDetalhes(registro);
        });

        cartao.append(principal, botao);

        return cartao;
    }

    function renderizarRegistros(lista) {
        limparLista();

        elementos.semResultados.hidden = lista.length > 0;

        lista.forEach(registro => {
            elementos.lista.appendChild(
                criarCartaoRegistro(registro)
            );
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function obterParametros() {
        const parametros = new URLSearchParams();

        const usuarioId = elementos.usuario.value.trim();
        const acao = elementos.acao.value;
        const ip = elementos.ip.value.trim();
        const dataInicio = elementos.dataInicio.value;
        const dataFim = elementos.dataFim.value;

        if (usuarioId) {
            parametros.set("usuarioId", usuarioId);
        }

        if (acao) {
            parametros.set("acao", acao);
        }

        if (ip) {
            parametros.set("ip", ip);
        }

        if (dataInicio) {
            parametros.set("dataInicio", dataInicio);
        }

        if (dataFim) {
            parametros.set("dataFim", dataFim);
        }

        return parametros;
    }

    function validarFiltros() {
        const usuarioId = elementos.usuario.value.trim();

        if (usuarioId && (!Number.isInteger(Number(usuarioId)) || Number(usuarioId) <= 0)) {
            mostrarMensagem("Informe um ID de usuário válido.", "erro");
            return false;
        }

        if (
            elementos.dataInicio.value &&
            elementos.dataFim.value &&
            elementos.dataInicio.value > elementos.dataFim.value
        ) {
            mostrarMensagem("A data inicial não pode ser posterior à data final.", "erro");
            return false;
        }

        return true;
    }

    function aplicarPesquisaLocal() {
        const termo = normalizar(elementos.pesquisa.value);

        const filtrados = registros.filter(registro => {
            const conteudo = [
                registro.id,
                registro.usuarioId,
                registro.usuarioNome,
                registro.usuarioEmail,
                registro.acao,
                registro.entidade,
                registro.entidadeId,
                registro.detalhes,
                registro.ipOrigem
            ].join(" ");

            return normalizar(conteudo).includes(termo);
        });

        atualizarIndicadores(registros);
        renderizarRegistros(filtrados);
    }

    async function carregarRegistros() {
        if (!validarFiltros()) {
            return;
        }

        elementos.btnFiltrar.disabled = true;
        elementos.btnFiltrar.textContent = "Consultando...";

        mostrarMensagem("Consultando registros de auditoria...");

        elementos.painelDetalhes.hidden = true;

        try {
            const parametros = obterParametros();

            const query = parametros.toString();

            const endpoint = query
                ? `/admin/pericia?${query}`
                : "/admin/pericia";

            const resposta = await window.requisicaoAPI(endpoint, {
                method: "GET"
            });

            if (!Array.isArray(resposta)) {
                throw new Error("O servidor retornou um formato de dados inesperado.");
            }

            registros = resposta;

            atualizarIndicadores(registros);
            aplicarPesquisaLocal();

            if (registros.length === 0) {
                mostrarMensagem("Nenhum registro encontrado para os filtros informados.");
            } else {
                mostrarMensagem(
                    `${registros.length} registro(s) retornado(s).`,
                    "sucesso"
                );
            }

        } catch (erro) {
            console.error("Erro ao consultar perícia digital:", erro);

            registros = [];

            atualizarIndicadores(registros);
            renderizarRegistros(registros);

            mostrarMensagem(
                erro.message || "Não foi possível carregar os registros de auditoria.",
                "erro"
            );

        } finally {
            elementos.btnFiltrar.disabled = false;
            elementos.btnFiltrar.textContent = "Aplicar filtros";
        }
    }

    function limparFiltros() {
        elementos.pesquisa.value = "";
        elementos.usuario.value = "";
        elementos.acao.value = "";
        elementos.ip.value = "";
        elementos.dataInicio.value = "";
        elementos.dataFim.value = "";

        carregarRegistros();
    }

    elementos.btnFiltrar.addEventListener("click", carregarRegistros);

    elementos.btnLimpar.addEventListener("click", limparFiltros);

    elementos.pesquisa.addEventListener("input", aplicarPesquisaLocal);

    elementos.fecharDetalhes.addEventListener("click", () => {
        elementos.painelDetalhes.hidden = true;
    });

    [
        elementos.usuario,
        elementos.acao,
        elementos.ip,
        elementos.dataInicio,
        elementos.dataFim
    ].forEach(elemento => {
        elemento.addEventListener("keydown", evento => {
            if (evento.key === "Enter") {
                carregarRegistros();
            }
        });
    });

    carregarRegistros();

});
