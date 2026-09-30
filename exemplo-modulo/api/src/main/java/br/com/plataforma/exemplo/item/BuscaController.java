package br.com.plataforma.exemplo.item;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.plataforma.exemplo.api.ErroCampo;
import br.com.plataforma.exemplo.api.Resposta;

/**
 * A parte do módulo na busca global da casca (Contrato §8.6). Para a casca chamar esta rota, o
 * registro do módulo em modulos/{codigo}.json precisa de "busca": true.
 *
 * Regras: q com pelo menos 2 caracteres, no máximo 5 itens, sem paginação; a mesma permissão da
 * listagem (sem ela, 403, e a casca omite o módulo); rota relativa ao urlFrontend do módulo.
 */
@RestController
public class BuscaController {

    static final int MAXIMO_DE_ITENS = 5;

    public record ItemDaBusca(UUID id, String titulo, String subtitulo, String rota) {
    }

    private final ItemRepositorio itens;

    public BuscaController(ItemRepositorio itens) {
        this.itens = itens;
    }

    @GetMapping("/api/exemplo/busca")
    @PreAuthorize("hasAuthority('exemplo.item.ver')")
    public ResponseEntity<Resposta<List<ItemDaBusca>>> buscar(@RequestParam(required = false) String q) {
        String termo = q == null ? "" : q.strip();
        if (termo.length() < 2 || termo.length() > 100) {
            return ResponseEntity.badRequest().body(Resposta.falha("A busca precisa ter de 2 a 100 caracteres.",
                    List.of(new ErroCampo("q", "CAMPO_INVALIDO", "A busca precisa ter de 2 a 100 caracteres."))));
        }
        // % e _ digitados valem como texto, não como curinga do LIKE
        String padrao = "%" + termo.toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        // O filtro de tenant do Hibernate vale aqui, como em qualquer consulta
        List<ItemDaBusca> encontrados = itens.buscarPorNome(padrao, PageRequest.of(0, MAXIMO_DE_ITENS)).stream()
                .map(item -> new ItemDaBusca(item.getId(), item.getNome(), item.getDescricao(),
                        // Relativa ao urlFrontend (/modulos/exemplo/): num módulo de verdade, a tela do registro
                        "/?item=" + item.getId()))
                .toList();
        return ResponseEntity.ok(Resposta.ok(encontrados));
    }
}
