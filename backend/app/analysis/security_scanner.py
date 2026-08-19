import os
import re
import math
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class SecurityVulnerability(BaseModel):
    id: str
    title: str
    category: str  # 'Hardcoded Secret', 'SQL Injection', 'Unsafe Code Execution', 'Insecure CORS', 'Sensitive Logging'
    severity: str  # 'critical', 'high', 'medium', 'low'
    file_path: str
    relative_path: str
    line_number: int
    matched_snippet: str
    remediation: str
    cwe: Optional[str] = None


class SecurityAuditReport(BaseModel):
    security_score: int  # 0 - 100
    grade: str  # 'A', 'B', 'C', 'D', 'F'
    total_issues: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    vulnerabilities: List[SecurityVulnerability] = Field(default_factory=list)


SECRET_PATTERNS = [
    (
        r"AKIA[0-9A-Z]{16}",
        "AWS Access Key ID",
        "critical",
        "Store AWS credentials in environment variables or AWS IAM Roles instead of hardcoded strings.",
        "CWE-798",
    ),
    (
        r"sk_live_[0-9a-zA-Z]{24,}",
        "Stripe Live Secret Key",
        "critical",
        "Revoke this live Stripe API key immediately and configure STRIPE_SECRET_KEY in server environment variables.",
        "CWE-798",
    ),
    (
        r"ghp_[0-9a-zA-Z]{36}",
        "GitHub Personal Access Token",
        "critical",
        "Revoke this GitHub token immediately and use GitHub Actions secrets or environment variables.",
        "CWE-798",
    ),
    (
        r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
        "Unencrypted Private Key Block",
        "critical",
        "Never commit private keys to source control. Use key vaults or KMS.",
        "CWE-312",
    ),
    (
        r"(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:([^@\s]+)@",
        "Database URI with Embedded Password",
        "high",
        "Use parameterized connection variables (DATABASE_URL) loaded at runtime from environment secrets.",
        "CWE-259",
    ),
    (
        r"(?:jwt_secret|jwt_key|secret_key)\s*=\s*['\"][a-zA-Z0-9_\-]{1,24}['\"]",
        "Hardcoded / Weak JWT Secret",
        "high",
        "Use a strong cryptographic key (>= 256 bits) generated via os.urandom(32) and stored in secrets manager.",
        "CWE-321",
    ),
]

SQL_INJECTION_PATTERNS = [
    (
        r"(?:execute|raw|query)\s*\(\s*f['\"][^'\"]*SELECT|INSERT|UPDATE|DELETE",
        "Potential SQL Injection via F-String Interpolation",
        "high",
        "Use parameterized queries or ORM query builders rather than string interpolation.",
        "CWE-89",
    ),
    (
        r"(?:execute|raw|query)\s*\(\s*['\"][^'\"]*(?:%s|\{\})[^'\"]*['\"]\s*%",
        "Potential SQL Injection via % Formatting",
        "high",
        "Pass parameters as a tuple in the secondary execute argument: cursor.execute(sql, (param,))",
        "CWE-89",
    ),
]

UNSAFE_EXEC_PATTERNS = [
    (
        r"\beval\s*\(",
        "Unsafe eval() Execution",
        "high",
        "Avoid dynamic eval() on untrusted inputs. Use structured JSON.parse or ast.literal_eval.",
        "CWE-95",
    ),
    (
        r"\bexec\s*\(",
        "Unsafe exec() Execution",
        "high",
        "Avoid dynamic code execution with exec().",
        "CWE-95",
    ),
    (
        r"vm\.runIn(?:New)?Context\s*\(",
        "Node.js VM Sandbox Escape Risk",
        "medium",
        "Node vm module is not a secure sandbox for untrusted code execution.",
        "CWE-94",
    ),
]

SENSITIVE_LOG_PATTERNS = [
    (
        r"(?:logger|log|console)\.(?:info|debug|warn|error|log)\s*\([^)]*(?:password|token|secret|credit_card|apiKey)[^)]*\)",
        "Sensitive Data Logging",
        "medium",
        "Sanitize and mask passwords, tokens, and authorization headers prior to logging.",
        "CWE-532",
    ),
]


class SecurityScanner:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)

    def audit(self) -> SecurityAuditReport:
        vulnerabilities: List[SecurityVulnerability] = []

        if not os.path.exists(self.root_dir):
            return SecurityAuditReport(
                security_score=100,
                grade="A",
                total_issues=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
            )

        # Walk through source files
        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            # Exclude vendor and build dirs
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "dist", "build", ".venv", "venv")]
            
            for f in filenames:
                file_path = os.path.join(dirpath, f)
                ext = Path(f).suffix.lower()
                if ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".c", ".cpp", ".cs", ".json", ".env", ".yaml", ".yml"):
                    self._scan_file(file_path, vulnerabilities)

        # Calculate severity metrics
        critical_count = sum(1 for v in vulnerabilities if v.severity == "critical")
        high_count = sum(1 for v in vulnerabilities if v.severity == "high")
        medium_count = sum(1 for v in vulnerabilities if v.severity == "medium")
        low_count = sum(1 for v in vulnerabilities if v.severity == "low")
        total_issues = len(vulnerabilities)

        # Calculate 0 - 100 Security Score
        penalty = (critical_count * 25) + (high_count * 15) + (medium_count * 5) + (low_count * 2)
        security_score = max(0, 100 - penalty)

        if security_score >= 90:
            grade = "A"
        elif security_score >= 80:
            grade = "B"
        elif security_score >= 70:
            grade = "C"
        elif security_score >= 60:
            grade = "D"
        else:
            grade = "F"

        return SecurityAuditReport(
            security_score=security_score,
            grade=grade,
            total_issues=total_issues,
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            low_count=low_count,
            vulnerabilities=vulnerabilities,
        )

    def _scan_file(self, file_path: str, vulnerabilities: List[SecurityVulnerability]):
        try:
            rel_path = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            for line_idx, line in enumerate(lines, 1):
                # 1. Check Hardcoded Secrets
                for pattern, title, severity, remediation, cwe in SECRET_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        vulnerabilities.append(
                            SecurityVulnerability(
                                id=f"SEC_{len(vulnerabilities)+1}",
                                title=title,
                                category="Hardcoded Secret",
                                severity=severity,
                                file_path=file_path,
                                relative_path=rel_path,
                                line_number=line_idx,
                                matched_snippet=line.strip()[:140],
                                remediation=remediation,
                                cwe=cwe,
                            )
                        )

                # 2. Check SQL Injection Patterns
                for pattern, title, severity, remediation, cwe in SQL_INJECTION_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        vulnerabilities.append(
                            SecurityVulnerability(
                                id=f"SEC_{len(vulnerabilities)+1}",
                                title=title,
                                category="SQL Injection",
                                severity=severity,
                                file_path=file_path,
                                relative_path=rel_path,
                                line_number=line_idx,
                                matched_snippet=line.strip()[:140],
                                remediation=remediation,
                                cwe=cwe,
                            )
                        )

                # 3. Check Unsafe Dynamic Exec
                for pattern, title, severity, remediation, cwe in UNSAFE_EXEC_PATTERNS:
                    if re.search(pattern, line):
                        vulnerabilities.append(
                            SecurityVulnerability(
                                id=f"SEC_{len(vulnerabilities)+1}",
                                title=title,
                                category="Unsafe Code Execution",
                                severity=severity,
                                file_path=file_path,
                                relative_path=rel_path,
                                line_number=line_idx,
                                matched_snippet=line.strip()[:140],
                                remediation=remediation,
                                cwe=cwe,
                            )
                        )

                # 4. Check Sensitive Logging
                for pattern, title, severity, remediation, cwe in SENSITIVE_LOG_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        vulnerabilities.append(
                            SecurityVulnerability(
                                id=f"SEC_{len(vulnerabilities)+1}",
                                title=title,
                                category="Sensitive Logging",
                                severity=severity,
                                file_path=file_path,
                                relative_path=rel_path,
                                line_number=line_idx,
                                matched_snippet=line.strip()[:140],
                                remediation=remediation,
                                cwe=cwe,
                            )
                        )

        except Exception as e:
            print(f"[SecurityScanner] Error scanning {file_path}: {e}")
