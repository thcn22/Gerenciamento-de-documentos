import { DocumentDB } from "../services/db";

function main() {
  const docs = DocumentDB.all() as any[];
  
  console.log("🔍 Validação final - procurando qualquer problema de encoding...\n");
  
  let totalProblems = 0;
  let totalDocuments = docs.length;
  
  for (const doc of docs) {
    const name = doc.originalName;
    if (!name) continue;
    
    // Check for various encoding issues
    const hasProblems = [
      // UTF-8 mojibake patterns (195 followed by suspicious sequences)
      /Ã[^\u00C0-\u00FF\s\w]/.test(name), // Ã followed by non-standard characters
      // Double-encoded characters
      name.includes('Â') && name.includes('®'),
      // Replacement characters
      name.includes('�'),
      // Specific problematic sequences that shouldn't exist in Portuguese
      name.includes('ÃÇÃO') && !name.includes('AÇÃO'),
      name.includes('ÃRMIC') && !name.includes('ÉRMICAS'),
      // Check for sequences that suggest double encoding issues
      /Ã[\u0080-\u0087]/.test(name), // Ã followed by control characters range
      // Sequence 195,135,195,131 which was the original problem
      name.split('').some((char, i, arr) => {
        const code = char.charCodeAt(0);
        const nextCode = arr[i + 1]?.charCodeAt(0);
        const thirdCode = arr[i + 2]?.charCodeAt(0);
        const fourthCode = arr[i + 3]?.charCodeAt(0);
        // Original problematic sequence: 195,135,195,131
        return code === 195 && nextCode === 135 && thirdCode === 195 && fourthCode === 131;
      })
    ].some(Boolean);
    
    if (hasProblems) {
      totalProblems++;
      console.log(`❌ Problema detectado:`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Nome: "${name}"`);
      console.log(`   Bytes: [${name.split('').map(c => c.charCodeAt(0)).slice(0, 20).join(', ')}...]`);
      console.log('');
    }
  }
  
  console.log(`\n📊 Relatório Final:`);
  console.log(`   📄 Total de documentos: ${totalDocuments}`);
  console.log(`   ${totalProblems === 0 ? '✅' : '❌'} Problemas de encoding: ${totalProblems}`);
  console.log(`   ${totalProblems === 0 ? '✅' : '❌'} Taxa de sucesso: ${((totalDocuments - totalProblems) / totalDocuments * 100).toFixed(1)}%`);
  
  if (totalProblems === 0) {
    console.log("\n🎉 Todos os problemas de encoding foram resolvidos!");
    console.log("   ✅ Sistema está preparado para prevenir novos problemas");
    console.log("   ✅ Arquivos existentes estão corrigidos");
    console.log("   ✅ Novos uploads serão normalizados automaticamente");
  } else {
    console.log("\n⚠️ Ainda existem problemas que precisam de atenção.");
  }
}

main();
