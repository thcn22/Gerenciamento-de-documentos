import { DocumentDB } from "../services/db";

function main() {
  const docs = DocumentDB.all() as any[];
  let fixed = 0;
  
  console.log("🔧 Aplicando correção final específica...\n");
  
  for (const doc of docs) {
    const originalName = doc.originalName;
    if (!originalName) continue;
    
    let correctedName = originalName;
    let needsUpdate = false;
    
    // Specific fixes for remaining issues
    if (originalName.includes('SENSIBILIZAÇÃO')) {
      correctedName = correctedName.replace('SENSIBILIZAÇÃO', 'SENSIBILIZAÇÃO');
      needsUpdate = true;
    }
    
    if (originalName.includes('IRRITAÇÃO')) {
      correctedName = correctedName.replace('IRRITAÇÃO', 'IRRITAÇÃO');
      needsUpdate = true;
    }
    
    // Fix ÇÃO pattern (should be ÇÃO)
    if (originalName.includes('ÇÃO')) {
      correctedName = correctedName.replace(/ÇÃO/g, 'ÇÃO');
      needsUpdate = true;
    }
    
    // Manual byte-level correction for these specific problematic sequences
    const bytes = originalName.split('').map(c => c.charCodeAt(0));
    const newBytes: number[] = [];
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      const nextByte = bytes[i + 1];
      
      // Fix sequence 199,195 (ÇÃ) to just 199 (Ç) when followed by 79 (O)
      if (byte === 199 && nextByte === 195 && bytes[i + 2] === 79) {
        newBytes.push(199); // Ç
        newBytes.push(195); // Ã  
        newBytes.push(79);  // O
        i += 2; // Skip the next two bytes as we processed them
        needsUpdate = true;
      }
      // Fix sequence 199,195 in general (ÇÃ should become ÇÃ)
      else if (byte === 199 && nextByte === 195) {
        newBytes.push(199); // Ç
        newBytes.push(195); // Ã
        i++; // Skip next byte
        needsUpdate = true;
      }
      else {
        newBytes.push(byte);
      }
    }
    
    if (needsUpdate) {
      const finalName = String.fromCharCode(...newBytes);
      if (finalName !== originalName) {
        const updated = { ...doc, originalName: finalName };
        DocumentDB.update(updated);
        fixed++;
        console.log(`✅ Correção final: "${originalName}" -> "${finalName}"`);
        console.log(`   Bytes originais: [${bytes.slice(20, 35).join(', ')}]`);
        console.log(`   Bytes corrigidos: [${newBytes.slice(20, 35).join(', ')}]`);
        console.log('');
      }
    }
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros corrigidos: ${fixed}`);
  console.log("\n🎉 Correção final concluída!");
}

main();
