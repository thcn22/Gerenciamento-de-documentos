import { DocumentDB } from "../services/db";

function main() {
  const docs = DocumentDB.all() as any[];
  let fixed = 0;
  
  console.log("🔧 Aplicando correção direta para os nomes específicos...\n");
  
  // Define exact corrections needed
  const corrections: { [key: string]: string } = {
    'RFEBPL.048-2024.SENSIBILIZAÇÃO.DÉRMICA.pdf': 'RFEBPL.048-2024.SENSIBILIZAÇÃO.DÉRMICA.pdf',
    'RFEBPL.049-2024.IRRITAÇÃO.DÉRMICA.pdf': 'RFEBPL.049-2024.IRRITAÇÃO.DÉRMICA.pdf'
  };
  
  for (const doc of docs) {
    const originalName = doc.originalName;
    if (!originalName) continue;
    
    // Apply direct corrections
    if (corrections[originalName]) {
      const correctedName = corrections[originalName];
      const updated = { ...doc, originalName: correctedName };
      DocumentDB.update(updated);
      fixed++;
      console.log(`✅ Corrigido: "${originalName}" -> "${correctedName}"`);
    }
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros corrigidos: ${fixed}`);
  console.log("\n🎉 Correção direta concluída!");
}

main();
