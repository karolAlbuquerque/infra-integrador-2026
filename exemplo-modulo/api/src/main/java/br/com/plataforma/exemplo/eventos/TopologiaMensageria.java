package br.com.plataforma.exemplo.eventos;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.amqp.RabbitTemplateCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Exchanges e filas do módulo. Regra das permissões do broker: o módulo declara só o que começa
 * com o próprio código. A exchange de outro módulo é referenciada pelo nome, nunca declarada —
 * declará-la seria recusado pelo RabbitMQ.
 */
@Configuration
public class TopologiaMensageria {

    static final String EXCHANGE_PROPRIA = "exemplo.eventos";
    static final String DLX = "exemplo.dlx";
    static final String FILA_CONTRATO_ASSINADO = "exemplo.contrato-assinado";

    @Bean
    TopicExchange exchangePropria() {
        return new TopicExchange(EXCHANGE_PROPRIA, true, false);
    }

    @Bean
    DirectExchange exchangeDeMensagensComFalha() {
        return new DirectExchange(DLX, true, false);
    }

    @Bean
    Queue filaContratoAssinado() {
        return QueueBuilder.durable(FILA_CONTRATO_ASSINADO)
                .deadLetterExchange(DLX)
                .deadLetterRoutingKey(FILA_CONTRATO_ASSINADO + ".dlq")
                .build();
    }

    @Bean
    Queue dlqContratoAssinado() {
        return QueueBuilder.durable(FILA_CONTRATO_ASSINADO + ".dlq").build();
    }

    @Bean
    Binding ligacaoDaDlq() {
        return BindingBuilder.bind(dlqContratoAssinado()).to(exchangeDeMensagensComFalha())
                .with(FILA_CONTRATO_ASSINADO + ".dlq");
    }

    /** Liga a fila à exchange do módulo Contratos, sem declarar a exchange dele. */
    @Bean
    Binding ligacaoContratoAssinado() {
        return new Binding(FILA_CONTRATO_ASSINADO, Binding.DestinationType.QUEUE,
                "contratos.eventos", "contratos.contrato.assinado", null);
    }

    /**
     * Toda mensagem sai com a propriedade user_id = usuário da conexão, mq_exemplo (Contrato §9.7).
     * O RabbitMQ confere que é mesmo quem está conectado, e o identity recusa, direto para a .dlq,
     * pedido em identity.entrada sem ela ou com moduloOrigem de outro módulo.
     */
    @Bean
    RabbitTemplateCustomizer remetenteEmTodaMensagem(@Value("${spring.rabbitmq.username}") String usuario) {
        return template -> template.addBeforePublishPostProcessors(comRemetente(usuario));
    }

    static MessagePostProcessor comRemetente(String usuario) {
        return mensagem -> {
            mensagem.getMessageProperties().setUserId(usuario);
            return mensagem;
        };
    }

    /** JSON nos dois sentidos. O tipo vem do parâmetro do listener, não de cabeçalho Java de quem publicou. */
    @Bean
    MessageConverter conversorJson(ObjectMapper mapper) {
        Jackson2JsonMessageConverter conversor = new Jackson2JsonMessageConverter(mapper);
        conversor.setAlwaysConvertToInferredType(true);
        return conversor;
    }
}
