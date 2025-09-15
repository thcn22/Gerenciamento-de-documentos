import { DocumentDB } from '../services/db.js';

async function main() {
  const docs = DocumentDB.all() as any[];
  let fixed = 0;
  
  console.log("🔧 Corrigindo caracteres divergentes específicos...\n");
  
  for (const doc of docs) {
    const originalName = doc.name;
    if (!originalName) continue;
    
    let correctedName = originalName;
    let needsUpdate = false;
    
    // Verificar se tem bytes problemáticos específicos detectados
    const bytes = Buffer.from(originalName, 'utf8');
    let hasProblems = false;
    
    for (let i = 0; i < bytes.length; i++) {
      // Byte 193 = Á mal codificado
      if (bytes[i] === 193) {
        hasProblems = true;
        break;
      }
      // Sequência 194,174 = ® mal codificado
      if (bytes[i] === 194 && i < bytes.length - 1 && bytes[i + 1] === 174) {
        hasProblems = true;
        break;
      }
    }
    
    if (hasProblems) {
      // Corrigir byte a byte os caracteres problemáticos
      let correctedBytes = [];
      
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        const nextByte = i < bytes.length - 1 ? bytes[i + 1] : null;
        
        if (byte === 193) {
          // Substituir byte 193 por Á correto (195, 129)
          correctedBytes.push(195, 129);
          needsUpdate = true;
        } else if (byte === 194 && nextByte === 174) {
          // Substituir sequência 194,174 por ® correto (194, 174 → 194, 174 é correto, mas verificar contexto)
          correctedBytes.push(194, 174);
          i++; // pular próximo byte
        } else {
          correctedBytes.push(byte);
        }
      }
      
      if (needsUpdate) {
        try {
          correctedName = Buffer.from(correctedBytes).toString('utf8');
        } catch (e) {
          console.log(`❌ Erro ao corrigir "${originalName}": ${e}`);
          continue;
        }
      }
    }
    
    // Fix specific mojibake sequences found in the data
    if (originalName.includes('SENSIBILIZAÃÃO')) {
      correctedName = correctedName.replace('SENSIBILIZAÃÃO', 'SENSIBILIZAÇÃO');
      needsUpdate = true;
    }
    
    if (originalName.includes('IRRITAÃÃO')) {
      correctedName = correctedName.replace('IRRITAÃÃO', 'IRRITAÇÃO');
      needsUpdate = true;
    }
    
    if (originalName.includes('DÃRMICA')) {
      correctedName = correctedName.replace('DÃRMICA', 'DÉRMICA');
      needsUpdate = true;
    }
    
    // 193 = Á (catálogo)
    // 174 = ® (registered trademark)
    // These appear to already be correct in the latest data
    
    // Apply generic fixes for any remaining issues
    const genericFixes: [string, string][] = [
      ['Ã¡', 'á'], ['Ã ', 'à'], ['Ã£', 'ã'], ['Ã¢', 'â'],
      ['Ã©', 'é'], ['Ãª', 'ê'], ['Ã­', 'í'], ['Ã³', 'ó'],
      ['Ãµ', 'õ'], ['Ã´', 'ô'], ['Ãº', 'ú'], ['Ã§', 'ç'],
      ['ÃÃ', 'Á'], ['Ã‰', 'É'], ['Ã‡', 'Ç'],
      ['Â®', '®'], ['Â©', '©']
    ];
    
    for (const [mojibake, correct] of genericFixes) {
      if (correctedName.includes(mojibake)) {
        correctedName = correctedName.replace(new RegExp(mojibake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
        needsUpdate = true;
      }
    }
    
    if (needsUpdate && correctedName !== originalName) {
      const updated = { ...doc, originalName: correctedName };
      DocumentDB.update(updated);
      fixed++;
      console.log(`✅ Corrigido: "${originalName}" → "${correctedName}"`);
    } else if (hasProblems && !needsUpdate) {
      console.log(`⚠️ Problema detectado mas não corrigido: "${originalName}"`);
      console.log(`   Bytes: [${Array.from(Buffer.from(originalName, 'utf8')).slice(0, 20).join(', ')}...]`);
    }
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros corrigidos: ${fixed}`);
  console.log(`   📄 Total processado: ${docs.length}`);
  console.log("\n🎉 Correção concluída!");
}

main().catch(console.error);
