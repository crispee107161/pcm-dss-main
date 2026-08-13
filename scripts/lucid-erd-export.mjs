import pg from "pg";
import { writeFileSync } from "fs";

const query = `SELECT 'postgresql' AS dbms,t.table_catalog,t.table_schema,t.table_name,c.column_name,c.ordinal_position,c.data_type,c.character_maximum_length,n.constraint_type,k2.table_schema,k2.table_name,k2.column_name FROM information_schema.tables t NATURAL LEFT JOIN information_schema.columns c LEFT JOIN(information_schema.key_column_usage k NATURAL JOIN information_schema.table_constraints n NATURAL LEFT JOIN information_schema.referential_constraints r)ON c.table_catalog=k.table_catalog AND c.table_schema=k.table_schema AND c.table_name=k.table_name AND c.column_name=k.column_name LEFT JOIN information_schema.key_column_usage k2 ON k.position_in_unique_constraint=k2.ordinal_position AND r.unique_constraint_catalog=k2.constraint_catalog AND r.unique_constraint_schema=k2.constraint_schema AND r.unique_constraint_name=k2.constraint_name WHERE t.TABLE_TYPE='BASE TABLE' AND t.table_schema NOT IN('information_schema','pg_catalog');`;

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("SET enable_nestloop=0;");
  const res = await client.query({ text: query, rowMode: "array" });
  await client.end();

  const columns = res.fields.map((f) => f.name);
  const lines = [columns.join("\t")];
  for (const row of res.rows) {
    lines.push(row.map((val) => (val === null ? "" : String(val))).join("\t"));
  }
  writeFileSync("docs/erd_lucid_import.tsv", lines.join("\n"), "utf8");
  console.log(`Wrote ${res.rows.length} rows to docs/erd_lucid_import.tsv`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
