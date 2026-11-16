
package br.com.vendas.safe_market.controller;

import br.com.vendas.safe_market.dto.*;
import br.com.vendas.safe_market.model.*;
import br.com.vendas.safe_market.repository.*;

import jakarta.validation.Valid;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoRepository produtos;
    private final ProdutoDetalheRepository detalhes;
    private final UsuarioRepository usuarios;
    private final org.springframework.jdbc.core.JdbcTemplate historico;

    public ProdutoController(
            ProdutoRepository produtos,
            ProdutoDetalheRepository detalhes,
            UsuarioRepository usuarios,
            org.springframework.jdbc.core.JdbcTemplate historico) {

        this.produtos = produtos;
        this.detalhes = detalhes;
        this.usuarios = usuarios;
        this.historico = historico;
    }

    // ==========================================
    // RESPOSTA DO PRODUTO
    // ==========================================

    private ProdutoResponse view(Produto p) {

        ProdutoDetalhe d = detalhes.findById(p.id).orElse(null);

        return new ProdutoResponse(
                p.id,
                p.nome,
                p.nome,
                p.descricao,
                p.preco,
                p.estoque,
                d == null ? null : d.categoria,
                d == null ? null : d.localizacao,
                d == null ? null : d.imagemUrl,
                p.criadoEm
        );
    }

    // ==========================================
    // RESPOSTA ADMINISTRATIVA
    // ==========================================

    public record ProdutoAdminResponse(
            ProdutoResponse produto,
            String statusModeracao,
            Long criadoPor,
            String emailPublicador
    ) {}

    // ==========================================
    // USUÁRIO AUTENTICADO
    // ==========================================

    private Usuario current(Principal principal) {

        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Usuário não autenticado"
            );
        }

        Usuario usuario = usuarios.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Usuário não encontrado"
                ));

        if (usuario.getStatus() != StatusUsuario.ATIVO) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Conta inativa"
            );
        }

        return usuario;
    }

    // ==========================================
    // VERIFICAR ADMINISTRADOR
    // ==========================================

    private void verificarAdministrador(Usuario usuario) {

        if (usuario.getPerfil() != Perfil.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acesso permitido somente para administradores"
            );
        }
    }

    // ==========================================
    // VERIFICAR PROPRIETÁRIO
    // ==========================================

    private void verificarPermissao(Produto produto, Usuario usuario) {

        boolean administrador =
                usuario.getPerfil() == Perfil.ADMIN;

        boolean proprietario =
                usuario.getId().equals(produto.criadoPor);

        if (!administrador && !proprietario) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Você não tem permissão para alterar este anúncio"
            );
        }
    }

    // ==========================================
    // LISTAR PRODUTOS DO MARKETPLACE
    // Somente anúncios ativos
    // ==========================================

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar() {

        return produtos
                .findByStatusModeracaoOrderByCriadoEmDesc("ATIVO")
                .stream()
                .map(this::view)
                .toList();
    }

    // ==========================================
    // LISTAR TODOS OS PRODUTOS - ADMIN
    // Inclui anúncios não ativos
    // ==========================================

    @GetMapping("/admin")
    @Transactional(readOnly = true)
    public List<ProdutoAdminResponse> listarTodosAdministracao(
            Principal principal) {

        Usuario usuario = current(principal);

        verificarAdministrador(usuario);

        List<Produto> todos = produtos.findAll(
                Sort.by(Sort.Direction.DESC, "criadoEm")
        );

        Set<Long> idsPublicadores = todos.stream()
                .map(p -> p.criadoPor)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> emailsPublicadores =
                usuarios.findAllById(idsPublicadores)
                        .stream()
                        .collect(Collectors.toMap(
                                Usuario::getId,
                                Usuario::getEmail
                        ));

        return todos.stream()
                .map(p -> new ProdutoAdminResponse(
                        view(p),
                        p.statusModeracao,
                        p.criadoPor,
                        p.criadoPor == null
                                ? null
                                : emailsPublicadores.get(p.criadoPor)
                ))
                .toList();
    }

    // ==========================================
    // CONSULTAR PRODUTO
    // Produtos não ativos: somente dono ou ADMIN
    // ==========================================

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ProdutoResponse consultar(
            @PathVariable Long id,
            Principal principal) {

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        if (!"ATIVO".equals(produto.statusModeracao)) {

            if (principal == null) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                );
            }

            Usuario usuario = current(principal);

            boolean administrador =
                    usuario.getPerfil() == Perfil.ADMIN;

            boolean proprietario =
                    usuario.getId().equals(produto.criadoPor);

            if (!administrador && !proprietario) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                );
            }
        }

        return view(produto);
    }

    // ==========================================
    // CADASTRAR PRODUTO
    // ==========================================

    @PostMapping
    @Transactional
    public ResponseEntity<ProdutoResponse> criar(
            @Valid @RequestBody ProdutoRequest req,
            Principal principal) {

        Usuario usuario = current(principal);

        Produto produto = new Produto();

        produto.nome = req.titulo.trim();
        produto.descricao = req.descricao;
        produto.preco = req.preco;
        produto.estoque = req.estoque == null ? 1 : req.estoque;

        produto.statusModeracao = "ATIVO";

        produto.criadoPor = usuario.getId();
        produto.atualizadoPor = usuario.getId();

        produto = produtos.saveAndFlush(produto);

        ProdutoDetalhe detalhe = new ProdutoDetalhe();

        detalhe.produtoId = produto.id;
        detalhe.categoria = req.categoria;
        detalhe.localizacao = req.localizacao;

        detalhes.save(detalhe);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(view(produto));
    }

    // ==========================================
    // EDITAR PRODUTO
    // ==========================================

    @PutMapping("/{id}")
    @Transactional
    public ProdutoResponse editar(
            @PathVariable Long id,
            @Valid @RequestBody ProdutoRequest req,
            Principal principal) {

        Usuario usuario = current(principal);

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        verificarPermissao(produto, usuario);

        produto.nome = req.titulo.trim();
        produto.descricao = req.descricao;
        produto.preco = req.preco;

        if (req.estoque != null) {
            produto.estoque = req.estoque;
        }

        produto.atualizadoPor = usuario.getId();

        ProdutoDetalhe detalhe = detalhes.findById(id)
                .orElseGet(() -> {
                    ProdutoDetalhe novo = new ProdutoDetalhe();
                    novo.produtoId = id;
                    return novo;
                });

        detalhe.categoria = req.categoria;
        detalhe.localizacao = req.localizacao;

        detalhes.save(detalhe);

        Produto atualizado = produtos.saveAndFlush(produto);

        return view(atualizado);
    }

    // ==========================================
    // EXCLUIR PRODUTO
    // ==========================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> excluir(
            @PathVariable Long id,
            Principal principal) {

        Usuario usuario = current(principal);

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        verificarPermissao(produto, usuario);

        Long quantidade = historico.queryForObject(
                "SELECT " +
                "(SELECT COUNT(*) FROM itens_pedido WHERE produto_id = ?) + " +
                "(SELECT COUNT(*) FROM movimentacoes_estoque WHERE produto_id = ?)",
                Long.class,
                id,
                id
        );

        if (quantidade != null && quantidade > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Produto possui histórico de vendas ou estoque. Exclusão não permitida."
            );
        }

        // Exclui os detalhes somente se existirem.
        if (detalhes.existsById(id)) {
            detalhes.deleteById(id);
        }

        produtos.delete(produto);

        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // IDENTIFICAR FORMATO REAL DA IMAGEM
    // ==========================================

    private String identificarImagem(byte[] bytes) {

        // JPEG
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF) {

            return "jpg";
        }

        // PNG
        if (bytes.length >= 8
                && (bytes[0] & 0xFF) == 0x89
                && (bytes[1] & 0xFF) == 0x50
                && (bytes[2] & 0xFF) == 0x4E
                && (bytes[3] & 0xFF) == 0x47
                && (bytes[4] & 0xFF) == 0x0D
                && (bytes[5] & 0xFF) == 0x0A
                && (bytes[6] & 0xFF) == 0x1A
                && (bytes[7] & 0xFF) == 0x0A) {

            return "png";
        }

        // WEBP
        if (bytes.length >= 12
                && new String(bytes, 0, 4, StandardCharsets.US_ASCII)
                        .equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII)
                        .equals("WEBP")) {

            return "webp";
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato de imagem não suportado. Envie JPG, PNG ou WEBP."
        );
    }

    // ==========================================
    // ENVIAR IMAGEM DO PRODUTO
    // ==========================================

    @PostMapping(
            value = "/{id}/imagem",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Transactional
    public ProdutoResponse imagem(
            @PathVariable Long id,
            @RequestParam("imagem") MultipartFile file,
            Principal principal) throws IOException {

        Usuario usuario = current(principal);

        Produto produto = produtos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produto não encontrado"
                ));

        verificarPermissao(produto, usuario);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecione uma imagem"
            );
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A imagem não pode ultrapassar 5 MB"
            );
        }

        byte[] bytes = file.getBytes();

        String extensao = identificarImagem(bytes);

        Path diretorio = Paths.get("uploads")
                .toAbsolutePath()
                .normalize();

        Files.createDirectories(diretorio);

        String nomeArquivo = UUID.randomUUID() + "." + extensao;

        Path destino = diretorio.resolve(nomeArquivo).normalize();

        if (!destino.startsWith(diretorio)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Caminho de imagem inválido"
            );
        }

        Files.write(
                destino,
                bytes,
                StandardOpenOption.CREATE_NEW,
                StandardOpenOption.WRITE
        );

        ProdutoDetalhe detalhe = detalhes.findById(id)
                .orElseGet(() -> {
                    ProdutoDetalhe novo = new ProdutoDetalhe();
                    novo.produtoId = id;
                    return novo;
                });

        detalhe.imagemUrl = "/uploads/" + nomeArquivo;

        detalhes.save(detalhe);

        return view(produto);
    }
}
