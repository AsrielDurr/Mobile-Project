package org.example.mobileproject.common;

import lombok.Data;

@Data
public class ApiResponse<T> {
    private int code;       // 状态码，0 成功，非0失败
    private String message; // 描述信息
    private T data;         // 返回数据

    public ApiResponse() {}

    public ApiResponse(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(0, "success", data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(-1, message, null);
    }
}
