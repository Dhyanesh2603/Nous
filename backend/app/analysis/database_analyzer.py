import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ColumnDefinition(BaseModel):
    name: str
    data_type: str
    is_primary_key: bool = False
    is_foreign_key: bool = False
    is_nullable: bool = True
    references_table: Optional[str] = None
    references_column: Optional[str] = None


class TableRelationship(BaseModel):
    source_table: str
    target_table: str
    relationship_type: str = "1:N"  # '1:1', '1:N', 'N:M'
    foreign_key: Optional[str] = None
    references_key: Optional[str] = None


class TableDefinition(BaseModel):
    name: str
    schema_type: str  # 'sql_ddl', 'prisma', 'drizzle', 'typeorm', 'mongoose'
    file_path: str
    relative_path: str
    line_number: int
    columns: List[ColumnDefinition] = Field(default_factory=list)
    primary_keys: List[str] = Field(default_factory=list)


class DatabaseSchemaReport(BaseModel):
    detected: bool
    schema_type: Optional[str] = None
    tables_count: int = 0
    relationships_count: int = 0
    tables: List[TableDefinition] = Field(default_factory=list)
    relationships: List[TableRelationship] = Field(default_factory=list)
    mermaid_erd: str = ""


class DatabaseAnalyzer:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)

    def analyze(self) -> DatabaseSchemaReport:
        tables: List[TableDefinition] = []
        relationships: List[TableRelationship] = []
        detected_type = None

        if not os.path.exists(self.root_dir):
            return DatabaseSchemaReport(detected=False)

        # 1. Search for Prisma schema (schema.prisma)
        prisma_tables, prisma_rels = self._scan_prisma()
        if prisma_tables:
            tables.extend(prisma_tables)
            relationships.extend(prisma_rels)
            detected_type = "Prisma"

        # 2. Search for SQL DDL files (.sql)
        sql_tables, sql_rels = self._scan_sql_ddl()
        if sql_tables:
            tables.extend(sql_tables)
            relationships.extend(sql_rels)
            detected_type = detected_type or "SQL DDL"

        # 3. Search for Drizzle schemas (.ts/.js)
        drizzle_tables, drizzle_rels = self._scan_drizzle()
        if drizzle_tables:
            tables.extend(drizzle_tables)
            relationships.extend(drizzle_rels)
            detected_type = detected_type or "Drizzle ORM"

        # 4. Search for TypeORM Entities
        typeorm_tables, typeorm_rels = self._scan_typeorm()
        if typeorm_tables:
            tables.extend(typeorm_tables)
            relationships.extend(typeorm_rels)
            detected_type = detected_type or "TypeORM"

        # 5. Search for Mongoose schemas
        mongoose_tables = self._scan_mongoose()
        if mongoose_tables:
            tables.extend(mongoose_tables)
            detected_type = detected_type or "Mongoose"

        # Deduplicate tables by name
        unique_tables_dict = {}
        for t in tables:
            unique_tables_dict[t.name.lower()] = t
        unique_tables = list(unique_tables_dict.values())

        # Generate Mermaid ERD
        mermaid_erd = self._generate_mermaid_erd(unique_tables, relationships)

        return DatabaseSchemaReport(
            detected=len(unique_tables) > 0,
            schema_type=detected_type,
            tables_count=len(unique_tables),
            relationships_count=len(relationships),
            tables=unique_tables,
            relationships=relationships,
            mermaid_erd=mermaid_erd,
        )

    def _scan_prisma(self) -> (List[TableDefinition], List[TableRelationship]):
        tables = []
        relationships = []
        
        for dirpath, _, filenames in os.walk(self.root_dir):
            if "node_modules" in dirpath or ".git" in dirpath:
                continue
            for f in filenames:
                if f.endswith(".prisma"):
                    file_path = os.path.join(dirpath, f)
                    rel_path = os.path.relpath(file_path, self.root_dir)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as pf:
                            content = pf.read()
                        
                        # Match model Block { ... }
                        model_blocks = re.findall(r"model\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}", content)
                        for model_name, body in model_blocks:
                            cols = []
                            pks = []
                            for line in body.splitlines():
                                line_clean = line.strip()
                                if not line_clean or line_clean.startswith("//") or line_clean.startswith("@@"):
                                    continue
                                parts = line_clean.split()
                                if len(parts) >= 2:
                                    col_name = parts[0]
                                    col_type = parts[1]
                                    is_pk = "@id" in line_clean
                                    is_fk = "@relation" in line_clean
                                    if is_pk:
                                        pks.append(col_name)
                                    
                                    # Foreign key relation
                                    if is_fk:
                                        rel_match = re.search(r'@relation\([^)]*references:\s*\[([^\]]+)\]', line_clean)
                                        ref_col = rel_match.group(1).strip() if rel_match else "id"
                                        relationships.append(
                                            TableRelationship(
                                                source_table=model_name,
                                                target_table=col_type.rstrip("?[]"),
                                                relationship_type="1:N" if "[]" in col_type else "1:1",
                                                foreign_key=col_name,
                                                references_key=ref_col,
                                            )
                                        )

                                    cols.append(
                                        ColumnDefinition(
                                            name=col_name,
                                            data_type=col_type,
                                            is_primary_key=is_pk,
                                            is_foreign_key=is_fk,
                                            is_nullable="?" in col_type,
                                        )
                                    )
                            
                            tables.append(
                                TableDefinition(
                                    name=model_name,
                                    schema_type="prisma",
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=1,
                                    columns=cols,
                                    primary_keys=pks,
                                )
                            )
                    except Exception as e:
                        print(f"[DatabaseAnalyzer] Error parsing Prisma schema {file_path}: {e}")

        return tables, relationships

    def _scan_sql_ddl(self) -> (List[TableDefinition], List[TableRelationship]):
        tables = []
        relationships = []

        for dirpath, _, filenames in os.walk(self.root_dir):
            if "node_modules" in dirpath or ".git" in dirpath:
                continue
            for f in filenames:
                if f.endswith(".sql"):
                    file_path = os.path.join(dirpath, f)
                    rel_path = os.path.relpath(file_path, self.root_dir)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as sf:
                            content = sf.read()

                        # Match CREATE TABLE [IF NOT EXISTS] name ( ... )
                        create_tables = re.findall(
                            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`\"'A-Za-z0-9_.]+)\s*\((.*?)\);",
                            content,
                            re.IGNORECASE | re.DOTALL,
                        )

                        for raw_table_name, body in create_tables:
                            table_name = raw_table_name.strip("`\"' ").split(".")[-1]
                            cols = []
                            pks = []

                            for line in body.split(","):
                                line_clean = line.strip()
                                if not line_clean:
                                    continue
                                
                                # Check PRIMARY KEY constraint
                                pk_match = re.search(r"PRIMARY\s+KEY\s*\(([^)]+)\)", line_clean, re.IGNORECASE)
                                if pk_match:
                                    pks.extend([p.strip("`\"' ") for p in pk_match.group(1).split(",")])
                                    continue

                                # Check FOREIGN KEY constraint
                                fk_match = re.search(
                                    r"FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([`\"'A-Za-z0-9_]+)\s*\(([^)]+)\)",
                                    line_clean,
                                    re.IGNORECASE,
                                )
                                if fk_match:
                                    fk_col = fk_match.group(1).strip("`\"' ")
                                    ref_table = fk_match.group(2).strip("`\"' ")
                                    ref_col = fk_match.group(3).strip("`\"' ")
                                    relationships.append(
                                        TableRelationship(
                                            source_table=table_name,
                                            target_table=ref_table,
                                            relationship_type="1:N",
                                            foreign_key=fk_col,
                                            references_key=ref_col,
                                        )
                                    )
                                    continue

                                # Column definition line
                                col_tokens = line_clean.split()
                                if len(col_tokens) >= 2:
                                    col_name = col_tokens[0].strip("`\"' ")
                                    col_type = col_tokens[1].upper()
                                    is_pk = "PRIMARY KEY" in line_clean.upper()
                                    if is_pk:
                                        pks.append(col_name)

                                    cols.append(
                                        ColumnDefinition(
                                            name=col_name,
                                            data_type=col_type,
                                            is_primary_key=is_pk,
                                            is_nullable="NOT NULL" not in line_clean.upper(),
                                        )
                                    )

                            tables.append(
                                TableDefinition(
                                    name=table_name,
                                    schema_type="sql_ddl",
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=1,
                                    columns=cols,
                                    primary_keys=pks,
                                )
                            )
                    except Exception as e:
                        print(f"[DatabaseAnalyzer] Error parsing SQL file {file_path}: {e}")

        return tables, relationships

    def _scan_drizzle(self) -> (List[TableDefinition], List[TableRelationship]):
        tables = []
        relationships = []

        for dirpath, _, filenames in os.walk(self.root_dir):
            if "node_modules" in dirpath or ".git" in dirpath:
                continue
            for f in filenames:
                if f.endswith(".ts") or f.endswith(".js"):
                    file_path = os.path.join(dirpath, f)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as df:
                            content = df.read()

                        if "pgTable" in content or "mysqlTable" in content or "sqliteTable" in content:
                            rel_path = os.path.relpath(file_path, self.root_dir)
                            drizzle_matches = re.findall(
                                r"export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*\{([^}]+)\}",
                                content,
                            )
                            for var_name, tbl_name, body in drizzle_matches:
                                cols = []
                                pks = []
                                for line in body.splitlines():
                                    line_clean = line.strip()
                                    col_m = re.match(r"([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)\s*\(", line_clean)
                                    if col_m:
                                        c_name = col_m.group(1)
                                        c_type = col_m.group(2)
                                        is_pk = "primaryKey" in line_clean
                                        if is_pk:
                                            pks.append(c_name)
                                        cols.append(
                                            ColumnDefinition(
                                                name=c_name,
                                                data_type=c_type,
                                                is_primary_key=is_pk,
                                                is_nullable="notNull" not in line_clean,
                                            )
                                        )
                                tables.append(
                                    TableDefinition(
                                        name=tbl_name,
                                        schema_type="drizzle",
                                        file_path=file_path,
                                        relative_path=rel_path,
                                        line_number=1,
                                        columns=cols,
                                        primary_keys=pks,
                                    )
                                )
                    except Exception:
                        pass

        return tables, relationships

    def _scan_typeorm(self) -> (List[TableDefinition], List[TableRelationship]):
        tables = []
        relationships = []

        for dirpath, _, filenames in os.walk(self.root_dir):
            if "node_modules" in dirpath or ".git" in dirpath:
                continue
            for f in filenames:
                if f.endswith(".ts") or f.endswith(".js"):
                    file_path = os.path.join(dirpath, f)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as tf:
                            content = tf.read()

                        if "@Entity" in content:
                            rel_path = os.path.relpath(file_path, self.root_dir)
                            entity_matches = re.findall(
                                r"@Entity\s*\((?:['\"]([^'\"]+)['\"])?\)\s*export\s+class\s+([A-Za-z0-9_]+)",
                                content,
                            )
                            for entity_tbl, class_name in entity_matches:
                                tbl_name = entity_tbl if entity_tbl else class_name
                                cols = []
                                pks = []
                                col_matches = re.findall(
                                    r"@(?:PrimaryGeneratedColumn|PrimaryColumn|Column)\s*\([^)]*\)\s*([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)",
                                    content,
                                )
                                for c_name, c_type in col_matches:
                                    is_pk = "Primary" in content
                                    if is_pk:
                                        pks.append(c_name)
                                    cols.append(
                                        ColumnDefinition(
                                            name=c_name,
                                            data_type=c_type,
                                            is_primary_key=is_pk,
                                        )
                                    )

                                tables.append(
                                    TableDefinition(
                                        name=tbl_name,
                                        schema_type="typeorm",
                                        file_path=file_path,
                                        relative_path=rel_path,
                                        line_number=1,
                                        columns=cols,
                                        primary_keys=pks,
                                    )
                                )
                    except Exception:
                        pass

        return tables, relationships

    def _scan_mongoose(self) -> List[TableDefinition]:
        tables = []
        for dirpath, _, filenames in os.walk(self.root_dir):
            if "node_modules" in dirpath or ".git" in dirpath:
                continue
            for f in filenames:
                if f.endswith(".ts") or f.endswith(".js"):
                    file_path = os.path.join(dirpath, f)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as mf:
                            content = mf.read()

                        if "new Schema(" in content or "new mongoose.Schema(" in content:
                            rel_path = os.path.relpath(file_path, self.root_dir)
                            model_matches = re.findall(
                                r"mongoose\.model\s*\(\s*['\"]([^'\"]+)['\"]",
                                content,
                            )
                            for m_name in model_matches:
                                tables.append(
                                    TableDefinition(
                                        name=m_name,
                                        schema_type="mongoose",
                                        file_path=file_path,
                                        relative_path=rel_path,
                                        line_number=1,
                                        columns=[
                                            ColumnDefinition(name="_id", data_type="ObjectId", is_primary_key=True),
                                            ColumnDefinition(name="createdAt", data_type="Date"),
                                            ColumnDefinition(name="updatedAt", data_type="Date"),
                                        ],
                                        primary_keys=["_id"],
                                    )
                                )
                    except Exception:
                        pass
        return tables

    def _generate_mermaid_erd(
        self, tables: List[TableDefinition], relationships: List[TableRelationship]
    ) -> str:
        if not tables:
            return ""

        lines = ["erDiagram"]
        
        # Add relationships
        for rel in relationships:
            rel_label = rel.foreign_key if rel.foreign_key else "references"
            lines.append(f'    {rel.source_table} ||--o{{ {rel.target_table} : "{rel_label}"')

        # Add table entities
        for tbl in tables:
            lines.append(f"    {tbl.name} {{")
            for col in tbl.columns[:10]:  # limit 10 cols per table for clarity
                pk_marker = "PK" if col.is_primary_key else ("FK" if col.is_foreign_key else "")
                safe_type = col.data_type.replace(" ", "_").replace("?", "")
                lines.append(f"        {safe_type} {col.name} {pk_marker}")
            lines.append("    }")

        return "\n".join(lines)
