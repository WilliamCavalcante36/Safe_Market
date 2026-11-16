
package br.com.vendas.safe_market.service;

import br.com.vendas.safe_market.model.*;
import br.com.vendas.safe_market.repository.*;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.*;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OperacoesService {

    private final JdbcTemplate db;
    private final UsuarioRepository usuarios;
    private final ProdutoRepository produtos;
    private final ObjectMapper objectMapper;

    public OperacoesService(
            JdbcTemplate db,
            UsuarioRepository usuarios,
            ProdutoRepository produtos,
            ObjectMapper objectMapper) {

        this.db = db;
        this.usuarios = usuarios;
        this.produtos = produtos;
        this.objectMapper = objectMapper;
    }

    // ==========================================
    // IDENTIFICAÇÃO DO USUÁRIO
    // ==========================================

    public Usuario usuario(Principal p) {

        if (p == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Faça login"
            );
        }

        Usuario u = usuarios.findByEmail(p.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED
                        )
                );

        if (u.getStatus() != StatusUsuario.ATIVO) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Conta inativa ou bloqueada"
            );
        }

        return u;
    }

    // ==========================================
    // VERIFICAÇÃO DE ADMINISTRADOR
    // ==========================================

    public Usuario admin(Principal p) {

        Usuario u = usuario(p);

        if (u.getPerfil() != Perfil.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Somente administrador"
            );
        }

        return u;
    }

    // ==========================================
    // AUDITORIA — COMPATIBILIDADE
    // ==========================================

    /**
     * Mantém compatibilidade com os serviços
     * que já utilizam o método log() antigo.
     *
     * Registros sem requisição HTTP ficam
     * com IP de origem nulo.
     */
    public void log(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            String detalhes) {

        registrarLog(
                uid,
                acao,
                entidade,
                eid,
                detalhes,
                null
        );
    }

    // ==========================================
    // AUDITORIA — COM IP DE ORIGEM
    // ==========================================

    /**
     * Permite registrar o IP de origem
     * da requisição HTTP.
     */
    public void log(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            String detalhes,
            HttpServletRequest request) {

        String ip = null;

        if (request != null) {
            ip = request.getRemoteAddr();
        }

        registrarLog(
                uid,
                acao,
                entidade,
                eid,
                detalhes,
                ip
        );
    }

    // ==========================================
    // AUDITORIA — TENTATIVA DE LOGIN FALHA
    // ==========================================

    /**
     * Registra tentativas de autenticação recusadas.
     *
     * Identifica o usuário pelo e-mail informado,
     * quando ele existe no banco de dados.
     *
     * Para e-mails inexistentes, usuario_id
     * e entidade_id permanecem nulos.
     *
     * A senha nunca é armazenada.
     */
    public void registrarFalhaLogin(
            String email,
            HttpServletRequest request) {

        Long usuarioId = null;

        String identificador = email == null
                ? "não informado"
                : email.trim();

        // Identifica o usuário quando o e-mail existe.
        if (!identificador.isBlank()) {

            usuarioId = usuarios.findByEmail(identificador)
                    .map(Usuario::getId)
                    .orElse(null);
        }

        String detalhes =
                "Tentativa de login malsucedida. "
                + "E-mail informado: "
                + identificador;

        // Reutiliza o registro centralizado de auditoria.
        log(
                usuarioId,
                "LOGIN_FALHA",
                "USUARIO",
                usuarioId,
                detalhes,
                request
        );
    }

    // ==========================================
    // REGISTRO CENTRALIZADO DE AUDITORIA
    // ==========================================

    private void registrarLog(
            Long uid,
            String acao,
            String entidade,
            Long eid,
            String detalhes,
            String ip) {

        String json = objectMapper.createObjectNode()
                .put(
                        "mensagem",
                        detalhes == null ? "" : detalhes
                )
                .toString();

        db.update(
                """
                INSERT INTO logs_sistema (
                    usuario_id,
                    acao,
                    entidade,
                    entidade_id,
                    detalhes,
                    ip_origem
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                uid,
                acao,
                entidade,
                eid,
                json,
                ip
        );
    }

    // ==========================================
    // CONSULTAR CARRINHO
    // ==========================================

    public List<Map<String, Object>> carrinho(Principal p) {

        Long id = usuario(p).getId();

        return db.queryForList(
                """
                SELECT
                    c.produto_id AS produtoId,
                    p.nome,
                    p.preco,
                    c.quantidade,
                    (p.preco * c.quantidade) AS subtotal,
                    p.estoque
                FROM carrinho_itens c
                JOIN produtos p
                    ON p.id = c.produto_id
                WHERE c.usuario_id = ?
                ORDER BY c.produto_id
                """,
                id
        );
    }

    // ==========================================
    // ADICIONAR AO CARRINHO
    // ==========================================

    @Transactional
    public List<Map<String, Object>> carrinhoAdicionar(
            Principal p,
            Long produtoId,
            int qtd) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        if (qtd < 1 || qtd > 1000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantidade inválida"
            );
        }

        List<Map<String, Object>> produtosAtuais =
                db.queryForList(
                        """
                        SELECT estoque
                        FROM produtos
                        WHERE id = ?
                        FOR UPDATE
                        """,
                        produtoId
                );

        if (produtosAtuais.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Produto não encontrado"
            );
        }

        int estoque = ((Number)
                produtosAtuais.get(0).get("estoque"))
                .intValue();

        Integer atual = db.queryForObject(
                """
                SELECT COALESCE(SUM(quantidade), 0)
                FROM carrinho_itens
                WHERE usuario_id = ?
                  AND produto_id = ?
                """,
                Integer.class,
                u.getId(),
                produtoId
        );

        int novo = (atual == null ? 0 : atual) + qtd;

        if (novo > 1000 || novo > estoque) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Quantidade solicitada maior que o estoque"
            );
        }

        db.update(
                """
                INSERT INTO carrinho_itens (
                    usuario_id,
                    produto_id,
                    quantidade
                )
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    quantidade = VALUES(quantidade)
                """,
                u.getId(),
                produtoId,
                novo
        );

        return carrinho(p);
    }

    // ==========================================
    // ALTERAR QUANTIDADE DO CARRINHO
    // ==========================================

    @Transactional
    public List<Map<String, Object>> carrinhoQuantidade(
            Principal p,
            Long id,
            int qtd) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        if (qtd < 1 || qtd > 1000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantidade inválida"
            );
        }

        List<Map<String, Object>> rows = db.queryForList(
                """
                SELECT estoque
                FROM produtos
                WHERE id = ?
                FOR UPDATE
                """,
                id
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Produto não encontrado"
            );
        }

        if (qtd > ((Number)
                rows.get(0).get("estoque")).intValue()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Estoque insuficiente"
            );
        }

        int n = db.update(
                """
                UPDATE carrinho_itens
                SET quantidade = ?
                WHERE usuario_id = ?
                  AND produto_id = ?
                """,
                qtd,
                u.getId(),
                id
        );

        if (n == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Item não encontrado"
            );
        }

        return carrinho(p);
    }

    // ==========================================
    // REMOVER ITEM DO CARRINHO
    // ==========================================

    @Transactional
    public void carrinhoRemover(
            Principal p,
            Long id) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        db.update(
                """
                DELETE FROM carrinho_itens
                WHERE usuario_id = ?
                  AND produto_id = ?
                """,
                u.getId(),
                id
        );
    }

    // ==========================================
    // FINALIZAR PEDIDO
    // ==========================================

    @Transactional
    public Map<String, Object> finalizar(Principal p) {

        Usuario u = usuario(p);

        db.queryForMap(
                """
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
                """,
                u.getId()
        );

        List<Map<String, Object>> itens = carrinho(p);

        if (itens.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Carrinho vazio"
            );
        }

        BigDecimal total = BigDecimal.ZERO;

        // Bloqueia os estoques durante a transação.

        for (Map<String, Object> item : itens) {

            Long pid = ((Number)
                    item.get("produtoId")).longValue();

            int quantidade = ((Number)
                    item.get("quantidade")).intValue();

            Map<String, Object> prod = db.queryForMap(
                    """
                    SELECT preco, estoque
                    FROM produtos
                    WHERE id = ?
                    FOR UPDATE
                    """,
                    pid
            );

            if (((Number) prod.get("estoque")).intValue()
                    < quantidade) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Estoque insuficiente para produto " + pid
                );
            }

            total = total.add(
                    ((BigDecimal) prod.get("preco"))
                            .multiply(
                                    BigDecimal.valueOf(quantidade)
                            )
            );
        }

        // Criar pedido.

        db.update(
                """
                INSERT INTO pedidos (
                    usuario_id,
                    total,
                    status
                )
                VALUES (?, ?, 'CONFIRMADO')
                """,
                u.getId(),
                total
        );

        Long pedidoId = db.queryForObject(
                "SELECT LAST_INSERT_ID()",
                Long.class
        );

        // Registrar itens e movimentações de estoque.

        for (Map<String, Object> item : itens) {

            Long pid = ((Number)
                    item.get("produtoId")).longValue();

            int qtd = ((Number)
                    item.get("quantidade")).intValue();

            Map<String, Object> prod = db.queryForMap(
                    """
                    SELECT preco, estoque
                    FROM produtos
                    WHERE id = ?
                    """,
                    pid
            );

            int antes = ((Number)
                    prod.get("estoque")).intValue();

            BigDecimal preco =
                    (BigDecimal) prod.get("preco");

            db.update(
                    """
                    INSERT INTO itens_pedido (
                        pedido_id,
                        produto_id,
                        quantidade,
                        preco_unitario
                    )
                    VALUES (?, ?, ?, ?)
                    """,
                    pedidoId,
                    pid,
                    qtd,
                    preco
            );

            db.update(
                    """
                    UPDATE produtos
                    SET estoque = estoque - ?
                    WHERE id = ?
                    """,
                    qtd,
                    pid
            );

            db.update(
                    """
                    INSERT INTO movimentacoes_estoque (
                        produto_id,
                        usuario_id,
                        tipo,
                        variacao,
                        estoque_anterior,
                        estoque_posterior,
                        motivo
                    )
                    VALUES (?, ?, 'SAIDA', ?, ?, ?, ?)
                    """,
                    pid,
                    u.getId(),
                    -qtd,
                    antes,
                    antes - qtd,
                    "Pedido #" + pedidoId
            );
        }

        // Limpar carrinho.

        db.update(
                """
                DELETE FROM carrinho_itens
                WHERE usuario_id = ?
                """,
                u.getId()
        );

        // Registrar auditoria.

        log(
                u.getId(),
                "CADASTRAR",
                "PEDIDO",
                pedidoId,
                "Pedido confirmado"
        );

        return db.queryForMap(
                """
                SELECT
                    id,
                    usuario_id AS usuarioId,
                    total,
                    status,
                    criado_em AS criadoEm
                FROM pedidos
                WHERE id = ?
                """,
                pedidoId
        );
    }

    // ==========================================
    // LISTAR PEDIDOS
    // ==========================================

    public List<Map<String, Object>> pedidos(Principal p) {

        Usuario u = usuario(p);

        if (u.getPerfil() == Perfil.ADMIN) {

            return db.queryForList(
                    """
                    SELECT
                        id,
                        usuario_id AS usuarioId,
                        total,
                        status,
                        criado_em AS criadoEm
                    FROM pedidos
                    ORDER BY id DESC
                    """
            );
        }

        return db.queryForList(
                """
                SELECT
                    id,
                    usuario_id AS usuarioId,
                    total,
                    status,
                    criado_em AS criadoEm
                FROM pedidos
                WHERE usuario_id = ?
                ORDER BY id DESC
                """,
                u.getId()
        );
    }

    // ==========================================
    // CONSULTAR PEDIDO
    // ==========================================

    public Map<String, Object> pedido(
            Principal p,
            Long id) {

        Usuario u = usuario(p);

        List<Map<String, Object>> rows = db.queryForList(
                """
                SELECT
                    id,
                    usuario_id AS usuarioId,
                    total,
                    status,
                    criado_em AS criadoEm
                FROM pedidos
                WHERE id = ?
                """,
                id
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND
            );
        }

        Map<String, Object> result =
                new LinkedHashMap<>(rows.get(0));

        if (u.getPerfil() != Perfil.ADMIN
                && ((Number) result.get("usuarioId"))
                .longValue() != u.getId()) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN
            );
        }

        result.put(
                "itens",
                db.queryForList(
                        """
                        SELECT
                            produto_id AS produtoId,
                            quantidade,
                            preco_unitario AS precoUnitario
                        FROM itens_pedido
                        WHERE pedido_id = ?
                        """,
                        id
                )
        );

        return result;
    }
}
