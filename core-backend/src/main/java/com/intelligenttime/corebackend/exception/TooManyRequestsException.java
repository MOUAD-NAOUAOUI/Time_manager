package com.intelligenttime.corebackend.exception;

public class TooManyRequestsException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final long retryAfterSeconds;

    public TooManyRequestsException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
