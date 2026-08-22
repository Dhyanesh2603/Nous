import os
import pytest
from app.parsers.python_parser import PythonASTParser
from app.parsers.ts_parser import TypeScriptASTParser
from app.parsers.factory import ParserFactory
from app.parsers.symbol_types import SymbolKind


def test_python_parser():
    parser = PythonASTParser()
    code = '''
"""Module docstring."""
import os
from auth.jwt_utils import generate_token, decode_token as dec

class AuthService:
    """Core auth service."""
    def __init__(self, key: str):
        self.key = key

    def login(self, username: str) -> str:
        """Login handler."""
        if not username:
            return ""
        return generate_token(username, "user")
'''
    ast = parser.parse_file("/path/to/service.py", "auth/service.py", code)
    
    assert ast.language == "python"
    assert len(ast.imports) >= 2
    assert any(imp.source_module == "auth.jwt_utils" for imp in ast.imports)
    
    # Check symbols
    symbol_names = {s.name for s in ast.symbols}
    assert "AuthService" in symbol_names
    assert "login" in symbol_names
    assert "__init__" in symbol_names
    
    login_sym = next(s for s in ast.symbols if s.name == "login")
    assert login_sym.kind == SymbolKind.METHOD
    assert login_sym.cyclomatic_complexity >= 2  # due to if statement
    assert login_sym.docstring == "Login handler."
    assert "def login(self, username: str) -> str" in login_sym.signature
    
    # Check calls
    call_names = {c.callee_name for c in ast.calls}
    assert "generate_token" in call_names


def test_typescript_parser():
    parser = TypeScriptASTParser("typescript")
    code = '''
import { UserProfile } from '../types/user';
import { add } from './math';

export interface AuthState {
  isAuthenticated: boolean;
  user?: UserProfile;
}

export class SessionManager {
  private active: boolean = false;

  public authenticate(token: string): boolean {
    if (token.length > 10) {
      add(1, 2);
      return true;
    }
    return false;
  }
}

export const helperFunc = (val: number): number => {
  return val * 2;
};
'''
    ast = parser.parse_file("/path/to/session.ts", "session.ts", code)
    
    assert ast.language == "typescript"
    assert len(ast.imports) >= 2
    assert len(ast.exports) >= 3
    
    symbol_names = {s.name for s in ast.symbols}
    assert "AuthState" in symbol_names
    assert "SessionManager" in symbol_names
    assert "authenticate" in symbol_names
    assert "helperFunc" in symbol_names
    
    auth_state = next(s for s in ast.symbols if s.name == "AuthState")
    assert auth_state.kind == SymbolKind.INTERFACE
    
    auth_method = next(s for s in ast.symbols if s.name == "authenticate")
    assert auth_method.kind == SymbolKind.METHOD
    assert auth_method.cyclomatic_complexity >= 2
    
    call_names = {c.callee_name for c in ast.calls}
    assert "add" in call_names


def test_parser_factory():
    factory = ParserFactory()
    assert factory.is_supported_file("main.py")
    assert factory.is_supported_file("App.tsx")
    assert factory.is_supported_file("index.ts")
    assert factory.is_supported_file("bundle.js")
    assert factory.is_supported_file("App.vue")
    assert factory.is_supported_file("Component.svelte")
    assert factory.is_supported_file("style.css")
    assert not factory.is_supported_file("image.png")
    assert not factory.is_supported_file("archive.zip")


def test_multi_language_parser():
    from app.parsers.multi_lang_parser import MultiLanguageASTParser
    parser = MultiLanguageASTParser()

    # 1. Vue SFC test
    vue_code = """<template>
  <div class="user-card">
    <Avatar :src="avatarUrl" />
    <span>{{ username }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Avatar from './Avatar.vue';

const username = ref('Alice');
const avatarUrl = ref('/img/avatar.png');

function updateUser() {
  console.log('updated');
}
</script>
"""
    vue_ast = parser.parse_file("UserCard.vue", "components/UserCard.vue", vue_code)
    assert vue_ast.line_count > 0
    sym_names = [s.name for s in vue_ast.symbols]
    assert "UserCard" in sym_names
    assert "updateUser" in sym_names
    imp_modules = [i.source_module for i in vue_ast.imports]
    assert "vue" in imp_modules
    assert "./Avatar.vue" in imp_modules

    # 2. Java class test
    java_code = """package com.example.service;
import java.util.List;
import com.example.model.User;

public class UserService {
    public User findById(Long id) {
        return null;
    }
}
"""
    java_ast = parser.parse_file("UserService.java", "src/main/java/UserService.java", java_code)
    assert any(s.name == "UserService" for s in java_ast.symbols)
    assert any(s.name == "findById" for s in java_ast.symbols)
