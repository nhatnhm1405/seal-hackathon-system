package com.seal.hackathon.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Enables {@code @Async} so slow side-effects run off the HTTP request thread.
 *
 * The account approve/reject endpoints publish an AFTER_COMMIT event that sends a
 * Gmail SMTP email. That send is blocking (connection + STARTTLS + auth, several
 * seconds — or the full connection timeout when mail is not configured), and the
 * transactional event listener runs synchronously on the request thread, so the
 * whole PUT waited for it. Marking the listener {@code @Async("emailExecutor")}
 * moves the send to this background pool; the request returns as soon as the
 * transaction commits.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("email-");
        executor.initialize();
        return executor;
    }
}
