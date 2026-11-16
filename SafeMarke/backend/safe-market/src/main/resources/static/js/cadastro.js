
const formulario = document.getElementById("form-cadastro");

const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const campoConfirmacao = document.getElementById("confirmar-senha");
const mensagem = document.getElementById("mensagem-cadastro");

let enviando = false;

// ========================================
// REQUISITOS VISUAIS DA SENHA
// ========================================

const regrasSenha = {
    tamanho: document.getElementById("regra-tamanho"),
    maiuscula: document.getElementById("regra-maiuscula"),
    minuscula: document.getElementById("regra-minuscula"),
    numero: document.getElementById("regra-numero"),
    especial: document.getElementById("regra-especial")
};

// ========================================
// ELEMENTOS DO INDICADOR DE FORÇA
// ========================================

const textoForca = document.getElementById("texto-forca");
const progressoForca = document.getElementById("progresso-forca");

// ========================================
// EXIBIR MENSAGENS
// ========================================

function exibirMensagem(texto, tipo = "erro") {

    mensagem.textContent = texto;

    mensagem.style.color =
        tipo === "erro" ? "#ffb4b4" : "#8ff0c6";
}

// ========================================
// VERIFICAR REQUISITOS DA SENHA
// ========================================

function verificarRequisitosSenha(senha) {

    return {
        tamanho: senha.length >= 12,

        maiuscula: /[A-Z]/.test(senha),

        minuscula: /[a-z]/.test(senha),

        numero: /[0-9]/.test(senha),

        especial: /[^A-Za-z0-9\s]/.test(senha)
    };
}

// ========================================
// BLOQUEIO DE SENHAS COMUNS
// ========================================

const senhasComuns = [
    "senhaforte@123",
    "admin123456!",
    "qwerty@123456",
    "abcd12345678!",
    "123456789012",
    "password123!",
    "brasil123456!"
];

// Verificar se a senha é previsível
function verificarSenhaComum(senha) {

    const senhaNormalizada = senha.toLowerCase();

    return senhasComuns.includes(senhaNormalizada);
}

// ========================================
// INDICADOR DE FORÇA DA SENHA
// ========================================

function atualizarForcaSenha(senha) {

    const requisitos = verificarRequisitosSenha(senha);

    const pontos = Object.values(requisitos)
        .filter(Boolean).length;

    // Senha vazia
    if (!senha) {

        textoForca.textContent = "Não informada";

        progressoForca.style.width = "0%";

        progressoForca.style.backgroundColor = "#999";

        return;
    }

    // Estados de força da senha
    const estados = {

        0: {
            texto: "Fraca",
            cor: "#dc5555",
            largura: "10%"
        },

        1: {
            texto: "Fraca",
            cor: "#dc5555",
            largura: "20%"
        },

        2: {
            texto: "Fraca",
            cor: "#dc5555",
            largura: "40%"
        },

        3: {
            texto: "Média",
            cor: "#e5a52c",
            largura: "60%"
        },

        4: {
            texto: "Forte",
            cor: "#36a96b",
            largura: "80%"
        },

        5: {
            texto: "Forte",
            cor: "#16834c",
            largura: "100%"
        }
    };

    const estado = estados[pontos];

    textoForca.textContent = estado.texto;

    progressoForca.style.width = estado.largura;

    progressoForca.style.backgroundColor = estado.cor;
}

// ========================================
// ATUALIZAR CHECKLIST EM TEMPO REAL
// ========================================

function atualizarRequisitosSenha() {

    const senha = campoSenha.value;

    const verificacoes = verificarRequisitosSenha(senha);

    // Atualizar indicador de força
    atualizarForcaSenha(senha);

    for (const regra in verificacoes) {

        const elemento = regrasSenha[regra];

        if (!elemento) continue;

        const indicador = elemento.querySelector(".indicador");

        if (verificacoes[regra]) {

            elemento.classList.add("validado");

            if (indicador) {
                indicador.textContent = "✓";
            }

        } else {

            elemento.classList.remove("validado");

            if (indicador) {
                indicador.textContent = "○";
            }
        }
    }
}

// ========================================
// OBSERVAR DIGITAÇÃO DA SENHA
// ========================================

campoSenha.addEventListener(
    "input",
    atualizarRequisitosSenha
);

// ========================================
// VALIDAR SENHA
// ========================================

function validarSenha(senha) {

    const requisitos = verificarRequisitosSenha(senha);

    if (!requisitos.tamanho) {
        return "A senha deve ter pelo menos 12 caracteres.";
    }

    if (!requisitos.maiuscula) {
        return "Adicione pelo menos uma letra maiúscula.";
    }

    if (!requisitos.minuscula) {
        return "Adicione pelo menos uma letra minúscula.";
    }

    if (!requisitos.numero) {
        return "Adicione pelo menos um número.";
    }

    if (!requisitos.especial) {
        return "Adicione pelo menos um caractere especial.";
    }

    // Bloquear senhas comuns
    if (verificarSenhaComum(senha)) {
        return "Essa senha é muito comum. Escolha outra mais segura.";
    }

    return null;
}

// ========================================
// PROCESSAR CADASTRO
// ========================================

formulario.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    if (enviando) return;

    mensagem.textContent = "";

    const nome = campoNome.value.trim();

    const email = campoEmail.value.trim();

    const senha = campoSenha.value;

    const confirmacao = campoConfirmacao.value;

    // Validar nome
    if (!nome) {

        exibirMensagem("Informe seu nome completo.");

        campoNome.focus();

        return;
    }

    // Validar e-mail
    if (!email || !campoEmail.checkValidity()) {

        exibirMensagem("Digite um e-mail válido.");

        campoEmail.focus();

        return;
    }

    // Validar requisitos e segurança da senha
    const erroSenha = validarSenha(senha);

    if (erroSenha) {

        exibirMensagem(erroSenha);

        campoSenha.focus();

        return;
    }

    // Validar confirmação
    if (!confirmacao) {

        exibirMensagem("Confirme sua senha.");

        campoConfirmacao.focus();

        return;
    }

    if (senha !== confirmacao) {

        exibirMensagem("As senhas não coincidem.");

        campoConfirmacao.focus();

        return;
    }

    enviando = true;
    try {
        await requisicaoAPI("/auth/cadastro", {method:"POST", body:JSON.stringify({nome,email,senha})});
        exibirMensagem("Cadastro realizado! Você já pode fazer login.", "sucesso");
        formulario.reset();
    } catch (erro) {
        exibirMensagem(erro.message);
    } finally { enviando = false; }

});

// ========================================
// CADASTRO COM GOOGLE
// ========================================

document.getElementById("cadastro-google")
    .addEventListener("click", function () {

        alert(
            "A autenticação com Google ainda não foi implementada."
        );

    });

// ========================================
// CADASTRO COM FACEBOOK
// ========================================

document.getElementById("cadastro-facebook")
    .addEventListener("click", function () {

        alert(
            "A autenticação com Facebook ainda não foi implementada."
        );

    });
