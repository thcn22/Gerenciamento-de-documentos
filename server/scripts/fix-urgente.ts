import { DocumentDB } from '../services/db.js';

async function fixUrgente() {
  const db = DocumentDB;
  
  console.log('🚨 Correção URGENTE de caracteres divergentes...\n');
  
  // Buscar todos os documentos
  const documents = db.all();
  let corrected = 0;
  
  for (const doc of documents) {
    const document = doc as any;
    let originalName = document.originalName;
    let needsUpdate = false;
    
    // Correções específicas para os caracteres problemáticos encontrados
    const fixes = [
      // Byte 193 (Á incorreto)
      { from: 'Á', to: 'Á' }, // Char code 193 -> 225
      // Byte 194,174 (® incorreto) 
      { from: String.fromCharCode(194, 174), to: '®' },
      // Outros padrões problemáticos
      { from: 'Ã¡', to: 'á' },
      { from: 'Ã©', to: 'é' },
      { from: 'Ã­', to: 'í' },
      { from: 'Ã³', to: 'ó' },
      { from: 'Ãº', to: 'ú' },
      { from: 'Ã¢', to: 'â' },
      { from: 'Ãª', to: 'ê' },
      { from: 'Ã´', to: 'ô' },
      { from: 'Ã§', to: 'ç' },
      { from: 'Ã£', to: 'ã' },
      { from: 'Ãµ', to: 'õ' },
    ];
    
    let correctedName = originalName;
    
    for (const fix of fixes) {
      if (correctedName.includes(fix.from)) {
        correctedName = correctedName.replace(new RegExp(fix.from, 'g'), fix.to);
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log(`📝 ${originalName} → ${correctedName}`);
      db.update({ ...document, originalName: correctedName });
      corrected++;
    }
  }
  
  console.log(`\n✅ Correção urgente concluída! ${corrected} arquivos corrigidos.`);
}

fixUrgente().catch(console.error);
