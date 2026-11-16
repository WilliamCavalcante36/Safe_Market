
"use strict";

// ==========================================
// ELEMENTOS DO DASHBOARD
// ==========================================

const elementosDashboard = {
    usuariosConectados: document.getElementById("usuarios-conectados"),
    totalAlertas: document.getElementById("total-alertas"),
    nivelSeguranca: document.getElementById("nivel-seguranca"),
    totalAuditorias: document.getElementById("total-auditorias"),

    // Novo indicador de segurança.
    totalLoginsFalhos: document.getElementById("total-logins-falhos"),

    estadoAlertas: document.getElementById("estado-alertas"),
    estadoSeguranca: document.getElementById("estado-seguranca"),

    statusSistema: document.getElementById("status-sistema-operacional"),
    statusBanco: document.getElementById("status-banco-dados"),
    statusMonitoramento: document.getElementById("status-monitoramento"),

    listaAtividades: document.getElementById("lista-atividades"),
    mensagem: document.getElementById("mensagem-dashboard")
};

// ==========================================
// ATUALIZAR TEXTO
// ==========================================

function atualizarTexto(elemento, valor) {
    if (elemento) {
        elemento.textContent = valor ?? "—";
    }
}

// ==========================================
// ATUALIZAR INDICADORES
// ==========================================

function atualizarIndicadores(dados) {

    if (!dados || typeof dados !== "object") {
        throw new Error("Os dados dos indicadores são inválidos.");
    }

    atualizarTexto(
        elementosDashboard.usuariosConectados,
        dados.usuariosAtivos
    );

    atualizarTexto(
        elementosDashboard.totalAlertas,
        dados.totalAlertas
    );

    atualizarTexto(
        elementosDashboard.nivelSeguranca,
        dados.nivelSeguranca
    );

    atualizarTexto(
        elementosDashboard.totalAuditorias,
        dados.totalAuditorias
    );

    // Total real de tentativas de login malsucedidas.
    atualizarTexto(
        elementosDashboard.totalLoginsFalhos,
        dados.totalLoginsFalhos
    );
}

// ==========================================
// ATUALIZAR STATUS DO SISTEMA
// ==========================================

function atualizarStatus(status) {

    if (!status || typeof status !== "object") {
        throw new Error("Os dados de status são inválidos.");
    }

    atualizarTexto(
        elementosDashboard.statusSistema,
        status.sistemaOperacional
    );

    atualizarTexto(
        elementosDashboard.statusBanco,
        status.bancoDados
    );

    atualizarTexto(
        elementosDashboard.statusMonitoramento,
        status.monitoramento
    );
}

// ==========================================
// ATUALIZAR ATIVIDADES
// ==========================================

function atualizarAtividades(atividades) {

    const lista = elementosDashboard.listaAtividades;

    if (!lista) return;

    lista.replaceChildren();

    if (!Array.isArray(atividades) || atividades.length === 0) {

        const vazio = document.createElement("p");

        vazio.textContent = "Nenhuma atividade encontrada.";

        lista.appendChild(vazio);

        return;
    }

    atividades.forEach((atividade) => {

        const item = document.createElement("div");

        item.className = "atividade";

        const descricao = document.createElement("p");

        descricao.textContent =
            atividade.descricao ?? "Atividade sem descrição";

        item.appendChild(descricao);

        if (atividade.data) {

            const data = document.createElement("span");

            data.textContent = atividade.data;

            item.appendChild(data);
        }

        lista.appendChild(item);
    });
}

// ==========================================
// EXIBIR ERROS
// ==========================================

function exibirErroDashboard(mensagem) {

    atualizarTexto(
        elementosDashboard.mensagem,
        mensagem || "Não foi possível carregar os dados do dashboard."
    );
}

// ==========================================
// DISPONIBILIZAR FUNÇÕES
// ==========================================

window.dashboardSafeMarket = {

    atualizarIndicadores,
    atualizarStatus,
    atualizarAtividades,

    exibirErro: exibirErroDashboard
};

// ==========================================
// CARREGAR DADOS DA API
// ==========================================

(async function carregarDashboard() {

    try {

        if (typeof requisicaoAPI !== "function") {
            throw new Error(
                "A função requisicaoAPI não foi encontrada. Verifique o carregamento de api.js."
            );
        }

        const dados = await requisicaoAPI("/admin/dashboard");

        window.dashboardSafeMarket.atualizarIndicadores(dados);

        window.dashboardSafeMarket.atualizarStatus(dados.status);

        window.dashboardSafeMarket.atualizarAtividades(dados.atividades);

    } catch (erro) {

        console.error(
            "Erro ao carregar dashboard:",
            erro
        );

        window.dashboardSafeMarket.exibirErro(
            erro.message
        );
    }

})();
