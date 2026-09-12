package com.intelligenttime.corebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class RegisterRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    /**
     * Password policy:
     *  - At least 8 characters
     *  - At least one uppercase letter
     *  - At least one lowercase letter
     *  - At least one digit
     *  - At least one special character (@#$%^&+=!_\-.)
     *  - No whitespace
     */
    @NotBlank(message = "Password is required")
    @Pattern(
        regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!_.\\-])(?=\\S+$).{8,}$",
        message = "Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character (@#$%^&+=!_-.)"
    )
    private String password;

    private String timezone;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
}
