import { DocumentDB } from "../services/db";

function looksMojibake(s: string) {
  // Expanded detection for mojibake patterns
  return /Ã|Â|�|Ã§|Ã£|Ã¡|Ã©|Ãº|Ã³|ÃÃ|Ã‰|Ã |Ãª|Ãí|Ã´|Ãµ|Ã±/.test(s) || 
         /Ã[\u0080-\u00FF]/.test(s);
}

function decodeLatin1ToUtf8(s: string) {
  try {
    const decoded = Buffer.from(s, "latin1").toString("utf8");
    // Only return decoded if it actually improved the string
    if (decoded !== s && !looksMojibake(decoded)) {
      return decoded;
    }
    
    // Try alternative approach for stubborn cases
    let alternative = s;
    
    // Manual replacements for common patterns that don't decode well
    const manualFixes: { [key: string]: string } = {
      'SENSIBILIZAÃÃO': 'SENSIBILIZAÇÃO',
      'IRRITAÃÃO': 'IRRITAÇÃO',
      'DÃRMICA': 'DÉRMICA',
      'ÃÇÃO': 'AÇÃO',
      'Ã¡': 'á', 'Ã ': 'à', 'Ã£': 'ã', 'Ã¢': 'â',
      'Ã©': 'é', 'Ãª': 'ê', 'Ã­': 'í', 'Ã³': 'ó',
      'Ãµ': 'õ', 'Ã´': 'ô', 'Ãº': 'ú', 'Ã§': 'ç',
      'ÃÃ': 'Á', 'Ã‰': 'É', 'Ã‡': 'Ç'
    };
    
    for (const [pattern, replacement] of Object.entries(manualFixes)) {
      alternative = alternative.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }
    
    if (alternative !== s && !looksMojibake(alternative)) {
      return alternative;
    }
    
    return s;
  } catch {
    return s;
  }
}

function main() {
  const docs = DocumentDB.all() as any[];
  let fixed = 0;
  let skipped = 0;
  
  console.log("🔍 Procurando documentos com problemas de encoding...\n");
  
  for (const d of docs) {
    const name: string = d.originalName || "";
    if (!name) continue;
    
    if (!looksMojibake(name)) continue;
    
    const decoded = decodeLatin1ToUtf8(name);
    
    if (decoded === name) {
      skipped++;
      console.log(`⏭️  Ignorado (não melhorou): ${name}`);
      continue;
    }
    
    const updated = { ...d, originalName: decoded };
    DocumentDB.update(updated);
    fixed++;
    console.log(`✅ Corrigido: ${name} -> ${decoded}`);
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros corrigidos: ${fixed}`);
  console.log(`   ⏭️  Registros ignorados: ${skipped}`);
  console.log(`   📄 Total processado: ${docs.length}`);
  console.log("\n🎉 Correção concluída!");
}

main();
