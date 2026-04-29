package com.tasfb2b.shared.handler;

import com.tasfb2b.shared.exception.AeropuertoNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AeropuertoNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleNotFound(AeropuertoNotFoundException ex) {
        return new ApiError(
                404,
                ex.getMessage(),
                LocalDateTime.now()
        );
    }
}