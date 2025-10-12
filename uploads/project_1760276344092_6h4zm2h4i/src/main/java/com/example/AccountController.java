package com.example;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    
    @GetMapping
    public List<Account> getAllAccounts() {
        return List.of();
    }
}
