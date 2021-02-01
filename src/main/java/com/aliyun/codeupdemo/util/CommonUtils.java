package com.aliyun.codeupdemo.util;

import java.util.Collection;

/**
 * @author Codeup
 */
public class CommonUtils {

    public static String printCollection(Collection<String> collection) {
        StringBuilder sb = new StringBuilder();
        for (String s : collection) {
            sb.append(s);
            sb.append(",");
        }
        sb.deleteCharAt(sb.length() - 1);
        return sb.toString();
    }
}
