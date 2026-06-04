package com.seal.hackathon;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class HackathonApplication {

	public static void main(String[] args) {
		SpringApplication.run(HackathonApplication.class, args);
	}

	@Bean
	public CommandLineRunner testRunner(PasswordEncoder passwordEncoder) {
		return args -> {
			System.out.println("--- CHAY THU NGHIEM BACKEND ---");

			// Thử nghiệm mã hóa mật khẩu
			String rawPassword = "mySecretPassword123";
			String hashedPassword = passwordEncoder.encode(rawPassword);
			System.out.println("Mat khau sau khi hash: " + hashedPassword);

			// Thử nghiệm kiểm tra mật khẩu trùng khớp
			boolean isMatch = passwordEncoder.matches("mySecretPassword123", hashedPassword);
			System.out.println("Mat khau khop khong? " + isMatch);

			System.out.println("--------------------------------");
		};
	}
}
