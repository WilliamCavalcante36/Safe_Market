
"use strict";

// ==========================================
// ELEMENTOS DA PÁGINA
// ==========================================

const listaAlertas = document.getElementById("lista-alertas");
const mensagemAlertas = document.getElementById("mensagem-alertas");

const totalAlertas = document.getElementById("total-alertas");
const alertasCriticos = document.getElementById("alertas-criticos");
const alertasPendentes = document.getElementById("alertas-pendentes");
const alertasResolvidos = document.getElementById("alertas-resolvidos");

const pesquisaAlertas = document.getElementById("pesquisa-alertas");
const filtroGravidade = document.getElementById("filtro-gravidade");
const filtroStatus = document.getElementById("filtro-status");
const filtroData = document.getElementById("filtro-data");

// ==========================================
// ESTADO
// ==========================================

let alertasOriginais = [];

// ==========================================
// NORMALIZAÇÃO DA SEVERIDADE
// ==========================================

function normalizarSeveridade(valor) {
    const severidade = String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const equivalencias = {
        informativo: "informativo",
        info: "informativo",
        baixo: "baixo",
        baixa: "baixo",
        medio: "medio",
        media: "medio",
        alto: "alto",
        alta: "alto",
        critico: "critico",
        critica: "critico"
    };

    return equivalencias[severidade] || "nao_classificada";
}

// ==========================================
// NORMALIZAÇÃO DO STATUS
// ==========================================

function normalizarStatus(valor) {
    const status = String(valor || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s-]+/g, "_");

    if ([
        "RESOLVIDO",
        "RESOLVIDA",
        "CONCLUIDO",
        "CONCLUIDA",
        "ENCERRADO",
        "ENCERRADA"
    ].includes(status)) {
        return "resolvido";
    }

    if ([
        "EM_ANALISE",
        "EM_ANDAMENTO",
        "ANALISE"
    ].includes(status)) {
        return "em_analise";
    }

    // Contas bloqueadas, denúncias pendentes e
    // ocorrências de moderação não encerradas.
    return "pendente";
}

// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarTexto(valor, padrao = "Não informado") {
    if (valor === null || valor === undefined || valor === "") {
        return padrao;
    }

    return String(valor);
}

function formatarData(valor) {
    if (!valor) {
        return "Data não informada";
    }

    const texto = String(valor);

    // Evita deslocamento de dia ao interpretar
    // datas locais retornadas pelo MySQL.
    const correspondencia = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (correspondencia) {
        const [, ano, mes, dia, hora, minuto] = correspondencia;

        const data = `${dia}/${mes}/${ano}`;

        return hora !== undefined
            ? `${data} às ${hora}:${minuto || "00"}`
            : data;
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return data.toLocaleString("pt-BR");
}

function obterDataFiltro(valor) {
    if (!valor) {
        return "";
    }

    const correspondencia = String(valor).match(
        /^(\d{4}-\d{2}-\d{2})/
    );

    if (correspondencia) {
        return correspondencia[1];
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "";
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

// ==========================================
// PREPARAR ALERTAS RECEBIDOS DO BACKEND
// ==========================================

function prepararAlerta(alerta) {
    const tipo = formatarTexto(alerta.tipo, "OUTRO");

    return {
        ...alerta,
        tipo,
        descricao: formatarTexto(
            alerta.descricao,
            "Alerta sem descrição"
        ),
        severidadeNormalizada: normalizarSeveridade(
            alerta.severidade
        ),
        statusNormalizado: normalizarStatus(
            alerta.status
        ),
        dataFormatada: formatarData(alerta.data),
        dataFiltro: obterDataFiltro(alerta.data)
    };
}

// ==========================================
// INDICADORES
// ==========================================

function atualizarIndicadores(alertas) {
    const total = alertas.length;

    const criticos = alertas.filter(
        alerta => alerta.severidadeNormalizada === "critico"
    ).length;

    const pendentes = alertas.filter(
        alerta =>
            alerta.statusNormalizado === "pendente" ||
            alerta.statusNormalizado === "em_analise"
    ).length;

    const resolvidos = alertas.filter(
        alerta => alerta.statusNormalizado === "resolvido"
    ).length;

    if (totalAlertas) {
        totalAlertas.textContent = total;
    }

    if (alertasCriticos) {
        alertasCriticos.textContent = criticos;
    }

    if (alertasPendentes) {
        alertasPendentes.textContent = pendentes;
    }

    if (alertasResolvidos) {
        alertasResolvidos.textContent = resolvidos;
    }
}

// ==========================================
// RÓTULOS
// ==========================================

function obterRotuloSeveridade(severidade) {
    const rotulos = {
        informativo: "Informativo",
        baixo: "Baixo",
        medio: "Médio",
        alto: "Alto",
        critico: "Crítico",
        nao_classificada: "Não classificada"
    };

    return rotulos[severidade] || "Não classificada";
}

function obterRotuloStatus(status) {
    const rotulos = {
        pendente: "Pendente",
        em_analise: "Em análise",
        resolvido: "Resolvido"
    };

    return rotulos[status] || "Pendente";
}

function obterRotuloTipo(tipo) {
    const rotulos = {
        CONTA: "Conta",
        DENUNCIA: "Denúncia",
        MODERACAO: "Moderação"
    };

    return rotulos[tipo] || tipo;
}

// ==========================================
// CRIAR ELEMENTO DE TEXTO
// ==========================================

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined && texto !== null) {
        elemento.textContent = texto;
    }

    return elemento;
}

// ==========================================
// MONTAR CARTÃO DO ALERTA
// ==========================================

function criarCartaoAlerta(alerta) {
    const cartao = criarElemento("article", "atividade alerta-card");

    // Identificação do alerta.
    // O tipo acompanha o ID para evitar colisões
    // entre registros de tabelas diferentes.

    cartao.dataset.alertaId = formatarTexto(alerta.id, "");
    cartao.dataset.alertaTipo = alerta.tipo;

    const cabecalho = criarElemento(
        "div",
        "alerta-cabecalho"
    );

    const tipo = criarElemento(
        "span",
        "alerta-tipo",
        obterRotuloTipo(alerta.tipo)
    );

    const severidade = criarElemento(
        "span",
        `alerta-severidade severidade-${alerta.severidadeNormalizada}`,
        obterRotuloSeveridade(alerta.severidadeNormalizada)
    );

    cabecalho.append(tipo, severidade);

    const descricao = criarElemento(
        "p",
        "alerta-descricao",
        alerta.descricao
    );

    const rodape = criarElemento(
        "div",
        "alerta-rodape"
    );

    const status = criarElemento(
        "span",
        `alerta-status status-${alerta.statusNormalizado}`,
        `Status: ${obterRotuloStatus(alerta.statusNormalizado)}`
    );

    const data = criarElemento(
        "span",
        "alerta-data",
        alerta.dataFormatada
    );

    rodape.append(status, data);

    cartao.append(cabecalho, descricao, rodape);

    return cartao;
}

// ==========================================
// APLICAR FILTROS
// ==========================================

function obterAlertasFiltrados() {
    const pesquisa = pesquisaAlertas
        ? pesquisaAlertas.value.trim().toLowerCase()
        : "";

    const gravidade = filtroGravidade
        ? filtroGravidade.value
        : "";

    const status = filtroStatus
        ? filtroStatus.value
        : "";

    const data = filtroData
        ? filtroData.value
        : "";

    return alertasOriginais.filter(alerta => {
        const correspondePesquisa =
            !pesquisa ||
            [
                alerta.descricao,
                alerta.tipo,
                alerta.severidade,
                alerta.status,
                alerta.entidadeId
            ]
                .map(valor => String(valor ?? "").toLowerCase())
                .some(valor => valor.includes(pesquisa));

        const correspondeGravidade =
            !gravidade ||
            alerta.severidadeNormalizada === gravidade;

        const correspondeStatus =
            !status ||
            alerta.statusNormalizado === status;

        const correspondeData =
            !data ||
            alerta.dataFiltro === data;

        return (
            correspondePesquisa &&
            correspondeGravidade &&
            correspondeStatus &&
            correspondeData
        );
    });
}

// ==========================================
// RENDERIZAR LISTA
// ==========================================

function renderizarAlertas() {
    if (!listaAlertas) {
        return;
    }

    const alertasFiltrados = obterAlertasFiltrados();

    if (alertasFiltrados.length === 0) {
        const vazio = criarElemento(
            "p",
            "alertas-vazio",
            alertasOriginais.length === 0
                ? "Nenhum alerta registrado no sistema."
                : "Nenhum alerta corresponde aos filtros selecionados."
        );

        listaAlertas.replaceChildren(vazio);
        return;
    }

    const fragmento = document.createDocumentFragment();

    alertasFiltrados.forEach(alerta => {
        fragmento.appendChild(criarCartaoAlerta(alerta));
    });

    listaAlertas.replaceChildren(fragmento);
}

// ==========================================
// ATUALIZAR PAINEL
// ==========================================

function atualizarPainel(alertas) {
    if (!Array.isArray(alertas)) {
        throw new Error("O backend retornou uma lista de alertas inválida.");
    }

    alertasOriginais = alertas.map(prepararAlerta);

    atualizarIndicadores(alertasOriginais);
    renderizarAlertas();

    if (mensagemAlertas) {
        mensagemAlertas.textContent = "";
    }

    if (listaAlertas) {
        listaAlertas.setAttribute("aria-busy", "false");
    }
}

// ==========================================
// MENSAGENS DE ERRO
// ==========================================

function exibirErroAlertas(mensagem) {
    if (mensagemAlertas) {
        mensagemAlertas.textContent =
            mensagem || "Não foi possível carregar os alertas.";
    }

    if (listaAlertas) {
        listaAlertas.setAttribute("aria-busy", "false");
        listaAlertas.replaceChildren(
            criarElemento(
                "p",
                "alertas-erro",
                "Ocorreu um erro ao consultar os alertas. Verifique sua sessão e tente novamente."
            )
        );
    }
}

// ==========================================
// EVENTOS DOS FILTROS
// ==========================================

function configurarFiltros() {
    [
        pesquisaAlertas,
        filtroGravidade,
        filtroStatus,
        filtroData
    ].forEach(elemento => {
        if (!elemento) {
            return;
        }

        elemento.addEventListener("input", renderizarAlertas);
        elemento.addEventListener("change", renderizarAlertas);
    });
}

// ==========================================
// CARREGAR DADOS DO BACKEND
// ==========================================

async function carregarAlertas() {
    try {
        if (listaAlertas) {
            listaAlertas.setAttribute("aria-busy", "true");
        }

        if (mensagemAlertas) {
            mensagemAlertas.textContent = "";
        }

        const resposta = await requisicaoAPI("/admin/alertas");

        atualizarPainel(resposta);

    } catch (erro) {
        console.error("Erro ao carregar alertas:", erro);

        exibirErroAlertas(
            erro?.message || "Não foi possível carregar os alertas."
        );
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

configurarFiltros();

window.alertasSafeMarket = {
    atualizar: atualizarPainel,
    renderizar: renderizarAlertas,
    carregar: carregarAlertas,
    exibirErro: exibirErroAlertas
};

carregarAlertas();
