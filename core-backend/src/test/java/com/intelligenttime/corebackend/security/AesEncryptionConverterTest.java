package com.intelligenttime.corebackend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class AesEncryptionConverterTest {

    private AesEncryptionConverter converter;

    @BeforeEach
    void setUp() {
        converter = new AesEncryptionConverter("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");
    }

    @Test
    void convertToDatabaseColumn_And_convertToEntityAttribute_RoundTripSuccess() {
        String originalSecret = "cus_stripe_live_secret_token_123456";

        String encrypted = converter.convertToDatabaseColumn(originalSecret);
        assertNotNull(encrypted);
        assertNotEquals(originalSecret, encrypted);

        String decrypted = converter.convertToEntityAttribute(encrypted);
        assertEquals(originalSecret, decrypted);
    }

    @Test
    void convertToDatabaseColumn_NullAndEmpty_ReturnsSame() {
        assertNull(converter.convertToDatabaseColumn(null));
        assertEquals("", converter.convertToDatabaseColumn(""));
        assertNull(converter.convertToEntityAttribute(null));
        assertEquals("", converter.convertToEntityAttribute(""));
    }

    @Test
    void distinctEncryptions_ProduceUniqueCiphertexts_DueToRandomIV() {
        String secret = "sensitive_oauth_token";

        String ciphertext1 = converter.convertToDatabaseColumn(secret);
        String ciphertext2 = converter.convertToDatabaseColumn(secret);

        assertNotEquals(ciphertext1, ciphertext2, "AES-GCM must use random IVs for distinct ciphertexts");

        assertEquals(secret, converter.convertToEntityAttribute(ciphertext1));
        assertEquals(secret, converter.convertToEntityAttribute(ciphertext2));
    }
}
