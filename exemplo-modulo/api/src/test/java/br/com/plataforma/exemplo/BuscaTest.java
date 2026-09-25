package br.com.plataforma.exemplo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** A parte do módulo na busca global (Contrato §8.6). */
class BuscaTest extends BaseIntegracao {

    @Test
    void buscaPeloNomeSoNoProprioTenantEComNoMaximoCincoItens() throws Exception {
        UUID empresaA = UUID.randomUUID();
        UUID empresaB = UUID.randomUUID();
        for (int i = 1; i <= 6; i++) {
            criarItem(empresaA, "Servidor " + i);
        }
        criarItem(empresaA, "Impressora");
        criarItem(empresaB, "Servidor da outra empresa");

        mvc.perform(get("/api/exemplo/busca").param("q", "servidor").with(usuario(empresaA, "exemplo.item.ver")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].titulo").value("Servidor 6"))
                .andExpect(jsonPath("$.data[0].rota").value(org.hamcrest.Matchers.startsWith("/?item=")));
        mvc.perform(get("/api/exemplo/busca").param("q", "servidor").with(usuario(empresaB, "exemplo.item.ver")))
                .andExpect(jsonPath("$.data.length()").value(1));
        // % não é curinga
        mvc.perform(get("/api/exemplo/busca").param("q", "%%").with(usuario(empresaA, "exemplo.item.ver")))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void recusaBuscaCurtaEQuemNaoPodeVerItens() throws Exception {
        UUID empresa = UUID.randomUUID();
        mvc.perform(get("/api/exemplo/busca").param("q", "s").with(usuario(empresa, "exemplo.item.ver")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].campo").value("q"));
        mvc.perform(get("/api/exemplo/busca").param("q", "servidor").with(usuario(empresa, "exemplo.acessar")))
                .andExpect(status().isForbidden());
    }

    private void criarItem(UUID tenant, String nome) throws Exception {
        mvc.perform(post("/api/exemplo/itens").with(usuario(tenant, "exemplo.item.criar"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nome\":\"" + nome + "\"}"))
                .andExpect(status().isCreated());
    }
}
