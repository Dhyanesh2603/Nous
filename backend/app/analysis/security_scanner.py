import os
import re
import math
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from pydantic import BaseModel, Field


class SecurityVulnerability(BaseModel):
    id: str
    title: str
    category: str  # 'Hardcoded Secret', 'SQL Injection', 'Command Injection', 'Unsafe Code Execution', 'Unsafe Subprocess', 'Weak JWT', 'Missing Authentication', 'Missing Authorization', 'Insecure Deserialization', 'Path Traversal', 'Dangerous Filesystem Access'
    severity: str  # 'critical', 'high', 'medium', 'low'
    file_path: str
    relative_path: str
    line_number: int
    matched_snippet: str
    remediation: str
    cwe: Optional[str] = None
    owasp_category: Optional[str] = None


class SecurityAuditReport(BaseModel):
    security_score: int  # 0 - 100
    grade: str  # 'A', 'B', 'C', 'D', 'F'
    total_issues: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    categories_breakdown: Dict[str, int] = Field(default_factory=dict)
    vulnerabilities: List[SecurityVulnerability] = Field(default_factory=list)


# 1. HARDCODED SECRETS
SECRET_PATTERNS = [
    (
        r"AKIA[0-9A-Z]{16}",
        "Hardcoded AWS Access Key ID",
        "critical",
        "Store AWS credentials in environment variables (AWS_ACCESS_KEY_ID) or AWS IAM Roles instead of plaintext strings.",
        "CWE-798",
        "A07:2021-Identification and Authentication Failures",
    ),
    (
        r"sk_live_[0-9a-zA-Z]{20,}",
        "Hardcoded Stripe Live Secret Key",
        "critical",
        "Revoke this live API key immediately and inject STRIPE_SECRET_KEY at runtime via environment variables.",
        "CWE-798",
        "A07:2021-Identification and Authentication Failures",
    ),
    (
        r"ghp_[0-9a-zA-Z]{36}",
        "Hardcoded GitHub Personal Access Token",
        "critical",
        "Revoke this GitHub token immediately and use GitHub Actions secrets or secret vaults.",
        "CWE-798",
        "A07:2021-Identification and Authentication Failures",
    ),
    (
        r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
        "Unencrypted Private Key in Source Code",
        "critical",
        "Never commit private keys to version control. Use KMS or HashiCorp Vault.",
        "CWE-312",
        "A02:2021-Cryptographic Failures",
    ),
    (
        r"(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:([^@\s]+)@",
        "Database URI with Embedded Plaintext Password",
        "high",
        "Use parameterized DATABASE_URL loaded at runtime from environment secrets.",
        "CWE-259",
        "A07:2021-Identification and Authentication Failures",
    ),
]

# 2. SQL INJECTION
SQL_INJECTION_PATTERNS = [
    (
        r"(?:(?:execute|raw|query)\s*\(\s*f['\"]|f['\"][^'\"]*(?:SELECT|INSERT|UPDATE|DELETE)|(?:query|sql)\s*=\s*f['\"][^'\"]*\{)",
        "SQL Injection via F-String Interpolation",
        "critical",
        "Use parameterized SQL queries (e.g. cursor.execute(query, (param,))) instead of python f-strings.",
        "CWE-89",
        "A03:2021-Injection",
    ),
    (
        r"(?:execute|raw|query)\s*\(\s*['\"][^'\"]*(?:%s|\{\})[^'\"]*['\"]\s*%",
        "SQL Injection via % String Formatting",
        "critical",
        "Pass arguments as a separate tuple parameter in cursor.execute(sql, (param,)).",
        "CWE-89",
        "A03:2021-Injection",
    ),
    (
        r"(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\+\s*(?:req|request|params|query|input)",
        "SQL Injection via String Concatenation",
        "critical",
        "Do not concatenate user variables directly into SQL queries. Use ORM queries or query bindings.",
        "CWE-89",
        "A03:2021-Injection",
    ),
]

# 3. COMMAND INJECTION & UNSAFE SUBPROCESS
COMMAND_INJECTION_PATTERNS = [
    (
        r"(?:os\.system|os\.popen)\s*\(\s*(?:f['\"]|.*?\+)",
        "Command Injection via os.system() with Dynamic Input",
        "critical",
        "Avoid os.system(). Use subprocess.run() with a list of arguments and shell=False.",
        "CWE-78",
        "A03:2021-Injection",
    ),
    (
        r"subprocess\.(?:Popen|run|call|check_output|check_call)\s*\([^)]*shell\s*=\s*True",
        "Unsafe Subprocess Execution with shell=True",
        "high",
        "Set shell=False and pass command and arguments as a list: subprocess.run(['cmd', arg1, arg2]).",
        "CWE-78",
        "A03:2021-Injection",
    ),
    (
        r"(?:child_process\.exec|execSync)\s*\(\s*`[^`]*\$\{",
        "Node.js Command Injection via child_process.exec Template Literal",
        "critical",
        "Use child_process.execFile() or child_process.spawn() with argument array.",
        "CWE-78",
        "A03:2021-Injection",
    ),
]

# 4. UNSAFE CODE EXECUTION
UNSAFE_EXEC_PATTERNS = [
    (
        r"\beval\s*\(",
        "Unsafe eval() Execution",
        "critical",
        "Dynamic code evaluation allows arbitrary code execution. Use JSON.parse or ast.literal_eval.",
        "CWE-95",
        "A03:2021-Injection",
    ),
    (
        r"\bexec\s*\(",
        "Unsafe Python exec() Execution",
        "critical",
        "Avoid executing dynamic python strings. Use safe dispatch tables or dedicated parsers.",
        "CWE-95",
        "A03:2021-Injection",
    ),
    (
        r"(?:vm\.runInThisContext|vm\.runInNewContext)\s*\(",
        "Node.js Unsafe VM Code Execution Sandbox Escape Risk",
        "high",
        "Node vm module is not a secure sandbox for untrusted code. Use isolated-vm or WebAssembly.",
        "CWE-94",
        "A03:2021-Injection",
    ),
]

# 5. WEAK JWT IMPLEMENTATION
JWT_PATTERNS = [
    (
        r"(?:jwt_secret|jwt_key|secret_key)\s*=\s*['\"][a-zA-Z0-9_\-]{1,16}['\"]",
        "Weak Hardcoded JWT Secret Key (<128 bits)",
        "high",
        "Generate cryptographic JWT signing secret with >= 256 bits of entropy: secrets.token_hex(32).",
        "CWE-321",
        "A02:2021-Cryptographic Failures",
    ),
    (
        r"jwt\.decode\s*\([^)]*algorithms\s*=\s*\[?['\"]none['\"]",
        "Insecure JWT 'none' Algorithm Allowed",
        "critical",
        "Explicitly enforce strong cryptographic algorithms like HS256, RS256, or EdDSA. Never allow 'none'.",
        "CWE-327",
        "A02:2021-Cryptographic Failures",
    ),
    (
        r"jwt\.decode\s*\([^)]*verify\s*=\s*False",
        "JWT Signature Verification Disabled (verify=False)",
        "critical",
        "Enable JWT signature verification (verify=True) to prevent forged tokens.",
        "CWE-347",
        "A07:2021-Identification and Authentication Failures",
    ),
]

# 6. INSECURE DESERIALIZATION
DESERIALIZATION_PATTERNS = [
    (
        r"pickle\.(?:loads|load)\s*\(",
        "Insecure Python Pickle Deserialization (Remote Code Execution)",
        "critical",
        "Never unpickle untrusted data. Use structured formats like JSON, Protobuf, or MsgPack.",
        "CWE-502",
        "A08:2021-Software and Data Integrity Failures",
    ),
    (
        r"yaml\.(?:load|load_all)\s*\([^)]*(?:Loader\s*=\s*(?:yaml\.)?Loader|UnsafeLoader)",
        "Unsafe YAML Deserialization with UnsafeLoader",
        "high",
        "Use yaml.safe_load() or Loader=yaml.SafeLoader to avoid arbitrary object instantiation.",
        "CWE-502",
        "A08:2021-Software and Data Integrity Failures",
    ),
    (
        r"marshal\.(?:loads|load)\s*\(",
        "Insecure marshal Deserialization",
        "high",
        "The marshal module is not secure against erroneous or maliciously constructed data.",
        "CWE-502",
        "A08:2021-Software and Data Integrity Failures",
    ),
]

# 7. PATH TRAVERSAL
PATH_TRAVERSAL_PATTERNS = [
    (
        r"(?:open|send_file|sendFile|createReadStream)\s*\(\s*(?:f['\"].*?\.\.|.*?\+\s*(?:req|request|params|path))",
        "Potential Directory / Path Traversal (../)",
        "high",
        "Validate paths with os.path.realpath() and ensure path.startswith(ALLOWED_BASE_DIR).",
        "CWE-22",
        "A01:2021-Broken Access Control",
    ),
    (
        r"os\.path\.join\s*\([^)]*(?:req\.|request\.|params\.)",
        "Unsanitized Path Concatenation with User Input",
        "medium",
        "Sanitize input using werkzeug.utils.secure_filename() or os.path.basename() before joining.",
        "CWE-22",
        "A01:2021-Broken Access Control",
    ),
]

# 8. DANGEROUS FILESYSTEM ACCESS
DANGEROUS_FS_PATTERNS = [
    (
        r"shutil\.rmtree\s*\(\s*(?:f['\"]|.*?\+\s*(?:req|request|params|input))",
        "Dangerous Recursive Filesystem Deletion from Parameter",
        "high",
        "Restrict directory removal to verified temporary sandbox directories with path allowlisting.",
        "CWE-73",
        "A01:2021-Broken Access Control",
    ),
    (
        r"os\.chmod\s*\([^)]*0o?777",
        "Overly Permissive File Permissions (chmod 777)",
        "medium",
        "Use restrictive file permissions: 0o600 for sensitive files, 0o700 for private directories.",
        "CWE-732",
        "A01:2021-Broken Access Control",
    ),
]

# 9. MISSING AUTHENTICATION / AUTHORIZATION HEURISTICS
SENSITIVE_HANDLER_NAMES = (
    "delete_user", "update_role", "admin", "grant_permission", "reset_password",
    "drop_table", "purge", "export_all", "make_admin"
)


class SecurityScanner:
    """
    Advanced Static Application Security Testing (SAST) Scanner:
    Comprehensive detection of SQLi, Command Injection, Secrets, Unsafe eval,
    Subprocesses, Weak JWT, Missing Auth/Authz, Insecure Deserialization,
    Path Traversal, and Dangerous Filesystem Access.
    """

    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)

    def scan(self) -> SecurityAuditReport:
        vulnerabilities: List[SecurityVulnerability] = []
        vuln_id = 1
        cat_counts: Dict[str, int] = {}

        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            # Exclude ignored directories
            dirnames[:] = [
                d for d in dirnames
                if d not in (".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__", ".pytest_cache")
            ]

            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(file_path, self.root_dir).replace("\\", "/")

                # Exclude test fixtures or docs from triggering false positive criticals
                is_test_file = any(t in rel_path.lower() for t in ("test", "fixture", "mock", "spec"))

                ext = Path(filename).suffix.lower()
                if ext not in (
                    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".json", ".env", ".yaml", ".yml"
                ):
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        lines = f.readlines()
                except Exception:
                    continue

                for line_idx, line in enumerate(lines):
                    line_no = line_idx + 1
                    line_str = line.strip()
                    if not line_str or line_str.startswith("#") or line_str.startswith("//"):
                        continue

                    # 1. Check Hardcoded Secrets
                    for pat, title, sev, rem, cwe, owasp in SECRET_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Hardcoded Secret",
                                    severity="medium" if is_test_file else sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 2. Check SQL Injection
                    for pat, title, sev, rem, cwe, owasp in SQL_INJECTION_PATTERNS:
                        if re.search(pat, line, re.IGNORECASE):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="SQL Injection",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 3. Check Command Injection
                    for pat, title, sev, rem, cwe, owasp in COMMAND_INJECTION_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Command Injection",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 4. Check Unsafe Code Execution
                    for pat, title, sev, rem, cwe, owasp in UNSAFE_EXEC_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Unsafe Code Execution",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 5. Check Weak JWT
                    for pat, title, sev, rem, cwe, owasp in JWT_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Weak JWT",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 6. Check Insecure Deserialization
                    for pat, title, sev, rem, cwe, owasp in DESERIALIZATION_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Insecure Deserialization",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 7. Check Path Traversal
                    for pat, title, sev, rem, cwe, owasp in PATH_TRAVERSAL_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Path Traversal",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 8. Check Dangerous Filesystem Access
                    for pat, title, sev, rem, cwe, owasp in DANGEROUS_FS_PATTERNS:
                        if re.search(pat, line):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=title,
                                    category="Dangerous Filesystem Access",
                                    severity=sev,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation=rem,
                                    cwe=cwe,
                                    owasp_category=owasp,
                                )
                            )
                            vuln_id += 1

                    # 9. Check Missing Authentication on Sensitive Operations
                    if any(term in line.lower() for term in SENSITIVE_HANDLER_NAMES) and ("def " in line or "async def " in line or "function " in line):
                        # Check preceding 3 lines for auth decorator
                        preceding = "".join(lines[max(0, line_idx - 3):line_idx])
                        if not any(d in preceding.lower() for d in ("auth", "guard", "login", "permission", "admin")):
                            vulnerabilities.append(
                                SecurityVulnerability(
                                    id=f"VULN-{vuln_id:04d}",
                                    title=f"Sensitive Operation Missing Authentication Guard",
                                    category="Missing Authentication",
                                    severity="high",
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_no,
                                    matched_snippet=line_str[:120],
                                    remediation="Apply authentication decorator (@require_auth or guard) to protect privileged administrative operations.",
                                    cwe="CWE-306",
                                    owasp_category="A07:2021-Identification and Authentication Failures",
                                )
                            )
                            vuln_id += 1

        # Count categories and severities
        crit_count = sum(1 for v in vulnerabilities if v.severity == "critical")
        high_count = sum(1 for v in vulnerabilities if v.severity == "high")
        med_count = sum(1 for v in vulnerabilities if v.severity == "medium")
        low_count = sum(1 for v in vulnerabilities if v.severity == "low")

        for v in vulnerabilities:
            cat_counts[v.category] = cat_counts.get(v.category, 0) + 1

        # Score calculation
        deductions = crit_count * 25 + high_count * 15 + med_count * 6 + low_count * 2
        score = max(0, 100 - deductions)

        grade = "A"
        if score < 50:
            grade = "F"
        elif score < 65:
            grade = "D"
        elif score < 80:
            grade = "C"
        elif score < 90:
            grade = "B"

        return SecurityAuditReport(
            security_score=score,
            grade=grade,
            total_issues=len(vulnerabilities),
            critical_count=crit_count,
            high_count=high_count,
            medium_count=med_count,
            low_count=low_count,
            categories_breakdown=cat_counts,
            vulnerabilities=vulnerabilities,
        )

    def audit(self) -> SecurityAuditReport:
        """Alias for scan() to maintain backward compatibility."""
        return self.scan()

