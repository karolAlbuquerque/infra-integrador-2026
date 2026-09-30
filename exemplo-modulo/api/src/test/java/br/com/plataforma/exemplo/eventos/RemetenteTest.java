package br.com.plataforma.exemplo.eventos;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;

/** Contrato §9.7: sem user_id, o pedido à plataforma vai para a .dlq. */
class RemetenteTest {

    @Test
    void todaMensagemSaiComOUsuarioDaConexao() {
        Message mensagem = TopologiaMensageria.comRemetente("mq_exemplo").postProcessMessage(new Message(new byte[0]));

        assertThat(mensagem.getMessageProperties().getUserId()).isEqualTo("mq_exemplo");
    }
}
