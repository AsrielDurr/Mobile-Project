package org.example.mobileproject.util;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 使用 LCS (Longest Common Subsequence) 来构建 oldIndex -> newIndex 映射。
 * 规则：
 *  - 对于 old 中出现在 LCS 的 token，我们将其映射到 new 中对应的位置（如果多个匹配，使用第一个未被占用的）
 *  - 对于 old 中没有映射到 new 的 token（被删除），在 map 中不包含或映射为 -1
 *
 *  返回 Map<Integer,Integer> oldIndex->newIndex (若未映射则无映射或值为 -1)
 */
public class TokenDiffUtil {

    public static Map<Integer, Integer> buildOldToNewIndexMap(List<String> oldTokens, List<String> newTokens) {
        // compute LCS DP
        int n = oldTokens.size();
        int m = newTokens.size();
        int[][] dp = new int[n+1][m+1];
        for (int i = n - 1; i >= 0; i--) {
            for (int j = m - 1; j >= 0; j--) {
                if (Objects.equals(oldTokens.get(i), newTokens.get(j))) {
                    dp[i][j] = dp[i+1][j+1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
                }
            }
        }

        // walk to collect pairs: positions in old -> positions in new (LCS)
        Map<Integer, Integer> oldToNew = new HashMap<>();
        int i = 0, j = 0;
        while (i < n && j < m) {
            if (Objects.equals(oldTokens.get(i), newTokens.get(j))) {
                // match
                oldToNew.put(i, j);
                i++; j++;
            } else {
                if (dp[i+1][j] >= dp[i][j+1]) {
                    i++;
                } else {
                    j++;
                }
            }
        }

        // For robustness: sometimes same token appears multiple times; above greedy picks earliest unmatched pair.
        // The mapping now maps old indexes that are part of LCS to corresponding new indexes.

        return oldToNew;
    }

}
