import { DocumentDB } from "../services/db";

function main() {
  const docs = DocumentDB.all() as any[];
  let fixed = 0;
  
  console.log("🔧 Corrigindo problemas específicos de encoding...\n");
  
  // Map of specific fixes needed
  const specificFixes: { [key: string]: string } = {
    'RFEBPL.048-2024.SENSIBILIZAÃÃO.DÃRMICA.pdf': 'RFEBPL.048-2024.SENSIBILIZAÇÃO.DÉRMICA.pdf',
    'RFEBPL.049-2024.IRRITAÃÃO.DÃRMICA.pdf': 'RFEBPL.049-2024.IRRITAÇÃO.DÉRMICA.pdf',
    'CATÃLOGO VENOSANÂ®-L&R 2025 - IMAGEM.pdf': 'CATÁLOGO VENOSAN®-L&R 2025 - IMAGEM.pdf',
    'CATÃLOGO VENOSANÂ®-L&R 2025 - INTERATIVO.pdf': 'CATÁLOGO VENOSAN®-L&R 2025 - INTERATIVO.pdf'
  };
  
  for (const doc of docs) {
    const originalName = doc.originalName;
    if (!originalName) continue;
    
    // Check if this document needs a specific fix
    if (specificFixes[originalName]) {
      const correctedName = specificFixes[originalName];
      const updated = { ...doc, originalName: correctedName };
      DocumentDB.update(updated);
      fixed++;
      console.log(`✅ Corrigido: ${originalName} -> ${correctedName}`);
    }
    // Also check for general mojibake patterns
    else if (originalName.includes('Ã') || originalName.includes('Â')) {
      let correctedName = originalName
        .replace(/SENSIBILIZAÃÃO/g, 'SENSIBILIZAÇÃO')
        .replace(/IRRITAÃÃO/g, 'IRRITAÇÃO')
        .replace(/DÃRMICA/g, 'DÉRMICA')
        .replace(/ÃÇÃO/g, 'AÇÃO')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã /g, 'à')
        .replace(/Ã£/g, 'ã')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã©/g, 'é')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãµ/g, 'õ')
        .replace(/Ã´/g, 'ô')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã§/g, 'ç')
        .replace(/ÃÃ/g, 'Á')
        .replace(/Ã‰/g, 'É')
        .replace(/Ã‡/g, 'Ç')
        .replace(/Â®/g, '®')
        .replace(/Â©/g, '©');
      
      if (correctedName !== originalName) {
        const updated = { ...doc, originalName: correctedName };
        DocumentDB.update(updated);
        fixed++;
        console.log(`✅ Corrigido: ${originalName} -> ${correctedName}`);
      }
    }
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros corrigidos: ${fixed}`);
  console.log(`   📄 Total processado: ${docs.length}`);
  console.log("\n🎉 Correção concluída!");
}

main();
