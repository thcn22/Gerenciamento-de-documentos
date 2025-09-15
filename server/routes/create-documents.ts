import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
fs.ensureDirSync(uploadsDir);

/**
 * Create a new Word document
 */
router.post("/word", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name = "Novo Documento.txt", content = "", folderId } = req.body;

    const documentId = uuidv4();
    const fileName = `${documentId}.txt`;
    const filePath = path.join(uploadsDir, fileName);

    const defaultContent =
      content ||
      `Documento de Texto - DocManager

Este é um novo documento criado no DocManager.

Você pode editar este conteúdo e adicionar:
- Texto formatado
- Listas e estruturas
- Informações importantes
- Dados da sua empresa

Para recursos avançados como formatação rica, tabelas e imagens, 
configure o OnlyOffice Document Server.

Data de criação: ${new Date().toLocaleString("pt-BR")}`;

    await fs.writeFile(filePath, defaultContent, "utf8");

    // Create document metadata
    const documentData = {
      id: documentId,
      originalName: name,
      fileName: fileName,
      mimeType: "text/plain",
      size: Buffer.byteLength(defaultContent, "utf8"),
      uploadDate: new Date().toISOString(),
      owner: "Sistema",
      folderId: folderId || "root",
    };

    // Save metadata
    const metadataPath = path.join(uploadsDir, `${documentId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(documentData, null, 2));

    res.json({
      success: true,
      document: documentData,
      message: "Documento Word criado com sucesso",
      editorUrl: `/text-editor/${documentId}`,
    });
  } catch (error) {
    console.error("Error creating Word document:", error);
    res.status(500).json({ error: "Erro ao criar documento Word" });
  }
});

/**
 * Create a new Excel document
 */
router.post(
  "/excel",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { name = "Nova Planilha.csv", folderId } = req.body;

      const documentId = uuidv4();
      const fileName = `${documentId}.csv`;
      const filePath = path.join(uploadsDir, fileName);

      const defaultContent = `Nome,Idade,Cidade,Profissao,Salario
João Silva,25,São Paulo,Desenvolvedor,8000
Maria Santos,30,Rio de Janeiro,Designer,6500
Pedro Costa,35,Belo Horizonte,Gerente,12000
Ana Oliveira,28,Porto Alegre,Analista,5500
Carlos Lima,32,Salvador,Consultor,9000`;

      await fs.writeFile(filePath, defaultContent, "utf8");

      // Create document metadata
      const documentData = {
        id: documentId,
        originalName: name,
        fileName: fileName,
        mimeType: "text/csv",
        size: Buffer.byteLength(defaultContent, "utf8"),
        uploadDate: new Date().toISOString(),
        owner: "Sistema",
        folderId: folderId || "root",
      };

      // Save metadata
      const metadataPath = path.join(uploadsDir, `${documentId}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(documentData, null, 2));

      res.json({
        success: true,
        document: documentData,
        message: "Planilha Excel criada com sucesso",
        editorUrl: `/spreadsheet-editor/${documentId}`,
      });
    } catch (error) {
      console.error("Error creating Excel document:", error);
      res.status(500).json({ error: "Erro ao criar planilha Excel" });
    }
  },
);

/**
 * Create a new PowerPoint document
 */
router.post("/powerpoint", async (req: Request, res: Response) => {
  try {
    const { name = "Nova Apresentação.txt", folderId } = req.body;

    const documentId = uuidv4();
    const fileName = `${documentId}.txt`;
    const filePath = path.join(uploadsDir, fileName);

    const defaultContent = `Apresentação - DocManager

==== Slide 1: Título da Apresentação ====
Título: Sua Apresentação
Subtítulo: Criado no DocManager

Conteúdo:
- Ponto principal 1
- Ponto principal 2
- Ponto principal 3

==== Slide 2: Conteúdo ====
Título: Informações Importantes

Dados:
• Item importante 1
• Item importante 2
• Item importante 3
• Conclusão

==== Slide 3: Conclusão ====
Título: Próximos Passos

Ações:
1. Revisar informações
2. Implementar mudanças
3. Acompanhar resultados

Data: ${new Date().toLocaleDateString("pt-BR")}`;

    await fs.writeFile(filePath, defaultContent, "utf8");

    // Create document metadata
    const documentData = {
      id: documentId,
      originalName: name,
      fileName: fileName,
      mimeType: "text/plain",
      size: Buffer.byteLength(defaultContent, "utf8"),
      uploadDate: new Date().toISOString(),
      owner: "Sistema",
      folderId: folderId || "root",
    };

    // Save metadata
    const metadataPath = path.join(uploadsDir, `${documentId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(documentData, null, 2));

    res.json({
      success: true,
      document: documentData,
      message: "Apresentação PowerPoint criada com sucesso",
      editorUrl: `/presentation-editor/${documentId}`,
    });
  } catch (error) {
    console.error("Error creating PowerPoint document:", error);
    res.status(500).json({ error: "Erro ao criar apresentação PowerPoint" });
  }
});

export default router;
