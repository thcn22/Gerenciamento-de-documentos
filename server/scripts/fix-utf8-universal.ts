import { DocumentDB } from "../services/db";

function decodeUTF8Bytes(name: string): string {
  try {
    // Convert string to bytes
    const bytes: number[] = [];
    for (let i = 0; i < name.length; i++) {
      bytes.push(name.charCodeAt(i));
    }
    
    // Look for UTF-8 encoded sequences that were interpreted as Latin-1
    const result: number[] = [];
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // Check for UTF-8 sequences that start with 195 (0xC3)
      if (byte === 195 && i + 1 < bytes.length) {
        const nextByte = bytes[i + 1];
        
        // Map common UTF-8 sequences back to correct characters
        const utf8Map: { [key: number]: number } = {
          135: 199,  // Ç (195,135 -> 199)
          131: 195,  // Ã (195,131 -> 195) 
          137: 201,  // É (195,137 -> 201)
          161: 225,  // á (195,161 -> 225)
          160: 224,  // à (195,160 -> 224)
          163: 227,  // ã (195,163 -> 227)
          162: 226,  // â (195,162 -> 226)
          169: 233,  // é (195,169 -> 233)
          170: 234,  // ê (195,170 -> 234)
          173: 237,  // í (195,173 -> 237)
          179: 243,  // ó (195,179 -> 243)
          181: 245,  // õ (195,181 -> 245)
          180: 244,  // ô (195,180 -> 244)
          186: 250,  // ú (195,186 -> 250)
          167: 231,  // ç (195,167 -> 231)
        };
        
        if (utf8Map[nextByte]) {
          result.push(utf8Map[nextByte]);
          i++; // Skip next byte as we processed it
          continue;
        }
      }
      
      // Handle other special cases
      if (byte === 174) {
        result.push(174); // ® symbol - keep as is
      } else if (byte === 193) {
        result.push(193); // Á - keep as is 
      } else {
        result.push(byte);
      }
    }
    
    // Convert back to string
    return String.fromCharCode(...result);
  } catch (e) {
    console.warn('Error decoding UTF-8 bytes for:', name, e);
    return name;
  }
}

function main() {
  const docs = DocumentDB.all() as any[];
  let fixed = 0;
  
  console.log("🔧 Aplicando correção universal de encoding UTF-8...\n");
  
  for (const doc of docs) {
    const originalName = doc.originalName;
    if (!originalName) continue;
    
    // Check if name contains problematic byte sequences
    const hasProblems = originalName.split('').some(char => {
      const code = char.charCodeAt(0);
      return code === 195 || // UTF-8 multibyte start
             (code >= 128 && code <= 191 && originalName.includes(String.fromCharCode(195))); // UTF-8 continuation bytes after 195
    });
    
    if (!hasProblems) continue;
    
    const correctedName = decodeUTF8Bytes(originalName);
    
    if (correctedName !== originalName) {
      const updated = { ...doc, originalName: correctedName };
      DocumentDB.update(updated);
      fixed++;
      console.log(`✅ Corrigido UTF-8: "${originalName}" -> "${correctedName}"`);
      
      // Show byte comparison for debugging
      const originalBytes = originalName.split('').map(c => c.charCodeAt(0));
      const correctedBytes = correctedName.split('').map(c => c.charCodeAt(0));
      console.log(`   Original bytes: [${originalBytes.join(', ')}]`);
      console.log(`   Corrected bytes: [${correctedBytes.join(', ')}]`);
      console.log('');
    }
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros corrigidos: ${fixed}`);
  console.log(`   📄 Total processado: ${docs.length}`);
  console.log("\n🎉 Correção UTF-8 concluída!");
}

main();
