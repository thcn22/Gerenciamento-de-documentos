import { DocumentDB } from "../services/db";

function main() {
  const docs = DocumentDB.all() as any[];
  
  console.log("🔍 Listando todos os documentos com caracteres especiais...\n");
  
  for (const doc of docs) {
    const name = doc.originalName;
    if (!name) continue;
    
    // Show any document with special characters or mojibake patterns
    if (name.includes('Ã') || name.includes('Â') || name.includes('®') || 
        name.includes('SENSIBILIZ') || name.includes('IRRITA') || name.includes('DÃRM')) {
      console.log(`ID: ${doc.id}`);
      console.log(`Nome: "${name}"`);
      console.log(`Bytes: [${name.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
      console.log(`---`);
    }
  }
}

main();
