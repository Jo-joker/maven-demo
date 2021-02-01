package com.aliyun.codeupdemo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * @author Codeup
 */
@Controller
public class WelcomeController {

    @RequestMapping("/code")
    public void codeup(HttpServletResponse response) throws IOException {
        response.sendRedirect("https://codeup.aliyun.com/tour");
    }
}
