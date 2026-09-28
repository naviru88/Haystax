package com.haystax.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology for Haystax messaging.
 *
 * Exchange : haystax.messages.exchange  (topic, durable)
 * Queue    : haystax.messages.queue     (durable, not auto-delete)
 * Binding  : routing key = "message.sent"
 *
 * All beans are declared durable so they survive broker restarts.
 */
@Configuration
public class RabbitMQConfig {

    // ── Constants ─────────────────────────────────────────────────────────────
    public static final String EXCHANGE_NAME  = "haystax.messages.exchange";
    public static final String QUEUE_NAME     = "haystax.messages.queue";
    public static final String ROUTING_KEY    = "message.sent";

    // ── Exchange ──────────────────────────────────────────────────────────────
    @Bean
    public TopicExchange messageExchange() {
        return ExchangeBuilder
                .topicExchange(EXCHANGE_NAME)
                .durable(true)
                .build();
    }

    // ── Queue ─────────────────────────────────────────────────────────────────
    @Bean
    public Queue messageQueue() {
        return QueueBuilder
                .durable(QUEUE_NAME)
                .build();
    }

    // ── Binding ───────────────────────────────────────────────────────────────
    @Bean
    public Binding messageBinding(Queue messageQueue, TopicExchange messageExchange) {
        return BindingBuilder
                .bind(messageQueue)
                .to(messageExchange)
                .with(ROUTING_KEY);
    }

    // ── JSON Converter ────────────────────────────────────────────────────────
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // ── RabbitTemplate ────────────────────────────────────────────────────────
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
