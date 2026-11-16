
/* =====================================================
   SAFEMARKET — API
   Comunicação entre frontend e backend
===================================================== */

"use strict";

const API_URL = "/api";
let csrfTokenCache = null;
async function obterCsrf() {
  if (!csrfTokenCache) {
    const r = await fetch(`${API_URL}/auth/csrf`, { credentials: "same-origin" });
    if (!r.ok) throw new Error("Não foi possível obter token de segurança.");
    csrfTokenCache = (await r.json()).token;
  }
  return csrfTokenCache;
}

/**
 * Realiza requisições HTTP para o backend.
 *
 * @param {string} endpoint - Rota da API.
 * @param {object} opcoes - Configurações do fetch.
 * @returns {Promise<any>}
 */
async function requisicaoAPI(endpoint, opcoes = {}) {

    if (typeof endpoint !== "string" || !endpoint.trim()) {
        throw new Error("O endpoint da API não foi informado.");
    }

    const headers = {
        ...opcoes.headers
    };

    if (opcoes.body && !(opcoes.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes((opcoes.method || "GET").toUpperCase())) {
        headers["X-XSRF-TOKEN"] = await obterCsrf();
    }
    let resposta;

    try {

        resposta = await fetch(`${API_URL}${endpoint}`, {
            ...opcoes,
            headers,
            credentials: "same-origin"
        });

    } catch (erro) {

        throw new Error(
            "Não foi possível conectar ao servidor."
        );

    }

    if (resposta.status === 204) {
        return null;
    }

    const tipoConteudo = resposta.headers.get("content-type") || "";

    let dados;

    try {

        if (tipoConteudo.includes("application/json")) {
            dados = await resposta.json();
        } else {
            dados = await resposta.text();
        }

    } catch (erro) {

        throw new Error(
            "Não foi possível interpretar a resposta do servidor."
        );

    }

    // Após login/logout a sessão pode mudar: não reutilizar token CSRF antigo.
    if (endpoint === "/auth/login" || endpoint === "/auth/logout") {
        csrfTokenCache = null;
    }

    if (resposta.status === 403 && !opcoes._csrfTentouNovamente &&
        ["POST", "PUT", "PATCH", "DELETE"].includes((opcoes.method || "GET").toUpperCase())) {
        csrfTokenCache = null;
        // Atualiza o token e tenta apenas uma vez; preserva demais erros 403.
        const novoToken = await obterCsrf();
        if (novoToken !== headers["X-XSRF-TOKEN"]) {
            return requisicaoAPI(endpoint, {...opcoes, _csrfTentouNovamente: true});
        }
    }

    if (!resposta.ok) {

        const mensagem =
            typeof dados === "object" && dados !== null
                ? dados.message || dados.mensagem
                : null;

        throw new Error(
            mensagem || `Erro na requisição: ${resposta.status}`
        );

    }

    return dados;
}
