package org.example.mobileproject;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("org.example.mobileproject.mapper")
public class MobileProjectApplication {

	public static void main(String[] args) {
		SpringApplication.run(MobileProjectApplication.class, args);
	}
}
