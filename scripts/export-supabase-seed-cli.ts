import {
  exportSupabaseSeedSql,
  parseSeedExportOutFile,
} from "@/scripts/export-supabase-seed";

const result = await exportSupabaseSeedSql({
  outFile: parseSeedExportOutFile(process.argv.slice(2)),
});

process.stdout.write(
  `Supabase seed SQL exported: ${result.filePath} (${result.bytes} bytes)\n`,
);
