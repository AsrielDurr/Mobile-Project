package org.example.mobileproject.util;

import java.util.ArrayList;
import java.util.List;

/**
 * Character-based tokenizer
 * - 每一个字符（包括标点、空格）都是一个 token
 * - 非常适合中文和 NER 场景
 */
public class Tokenizer {

    public static List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return tokens;
        }

        for (int i = 0; i < text.length(); i++) {
            tokens.add(String.valueOf(text.charAt(i)));
        }

        return tokens;
    }
}
