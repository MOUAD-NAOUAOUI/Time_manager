package com.intelligenttime.corebackend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String timezone;

}
