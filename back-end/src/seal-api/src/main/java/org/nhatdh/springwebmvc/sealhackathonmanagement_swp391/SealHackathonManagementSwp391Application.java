package org.nhatdh.springwebmvc.sealhackathonmanagement_swp391;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class SealHackathonManagementSwp391Application {

    public static void main(String[] args) {
        SpringApplication.run(SealHackathonManagementSwp391Application.class, args);
    }

    // Bean này sẽ chạy ngay sau khi Spring Boot khởi động hoàn tất
    @Bean
    public CommandLineRunner run() {
        return args -> {
            System.out.println("12345");
        };
    }
}
