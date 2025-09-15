import libre from 'libreoffice-convert';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const libreConvert = promisify(libre.convert);

interface DocumentTemplate {
  name: string;
  type: 'writer' | 'calc' | 'impress';
  template: string;
}

class LibreOfficeService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    fs.ensureDirSync(this.uploadsDir);
  }

  /**
   * Create a Writer document (.odt)
   */
  async createWriterDocument(content: string, title: string = 'Novo Documento'): Promise<{
    filename: string;
    filePath: string;
    size: number;
  }> {
    try {
      // Create a simple HTML template that LibreOffice can convert
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 2cm;
              line-height: 1.5;
            }
            h1 { 
              color: #2563eb; 
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .content {
              text-align: justify;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Documento criado em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          
          <div class="content">
            ${content ? content.replace(/\n/g, '<br>') : `
              <p>Este é um novo documento criado com LibreOffice no DocManager.</p>
              
              <h2>Recursos disponíveis:</h2>
              <ul>
                <li>Edição de texto rica</li>
                <li>Formatação avançada</li>
                <li>Inserção de tabelas e imagens</li>
                <li>Exportação em múltiplos formatos</li>
              </ul>
              
              <h2>Como usar:</h2>
              <p>Você pode editar este documento diretamente no sistema ou fazer o download para editar no LibreOffice/Microsoft Office.</p>
            `}
          </div>
          
          <div class="footer">
            <p>Gerado por DocManager - Sistema de Gerenciamento de Documentos</p>
          </div>
        </body>
        </html>
      `;

      const filename = `${uuidv4()}.odt`;
      const filePath = path.join(this.uploadsDir, filename);
      
      // Convert HTML to ODT using LibreOffice
      const pdfBuffer = await libreConvert(Buffer.from(htmlContent), '.odt', undefined);
      
  // fs-extra typings may require ArrayBufferView instead of Node Buffer; wrap as DataView
  fs.writeFileSync(filePath, new DataView(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength));
      const stats = fs.statSync(filePath);

      return {
        filename,
        filePath,
        size: stats.size
      };

    } catch (error) {
      console.error('LibreOffice Writer creation error:', error);
      throw new Error('Erro ao criar documento Writer');
    }
  }

  /**
   * Create a Calc spreadsheet (.ods)
   */
  async createCalcDocument(data?: any, title: string = 'Nova Planilha'): Promise<{
    filename: string;
    filePath: string;
    size: number;
  }> {
    try {
      // Create an HTML table that LibreOffice can convert to ODS
      let tableContent = '';
      
      if (data && data.rows) {
        tableContent = '<table border="1" style="border-collapse: collapse; width: 100%;">';
        data.rows.forEach((row: any, rowIndex: number) => {
          tableContent += '<tr>';
          if (row.cells) {
            row.cells.forEach((cell: any) => {
              const cellContent = cell.content || '';
              const isHeader = rowIndex === 0;
              const tag = isHeader ? 'th' : 'td';
              const style = isHeader ? 'background-color: #f3f4f6; font-weight: bold; padding: 8px;' : 'padding: 8px;';
              tableContent += `<${tag} style="${style}">${cellContent}</${tag}>`;
            });
          }
          tableContent += '</tr>';
        });
        tableContent += '</table>';
      } else {
        // Default template
        tableContent = `
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <tr>
              <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px;">Item</th>
              <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px;">Descrição</th>
              <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px;">Quantidade</th>
              <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px;">Valor Unitário</th>
              <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px;">Total</th>
            </tr>
            <tr>
              <td style="padding: 8px;">1</td>
              <td style="padding: 8px;">Produto Exemplo</td>
              <td style="padding: 8px;">1</td>
              <td style="padding: 8px;">R$ 100,00</td>
              <td style="padding: 8px;">R$ 100,00</td>
            </tr>
            <tr>
              <td style="padding: 8px;">2</td>
              <td style="padding: 8px;">Serviço Exemplo</td>
              <td style="padding: 8px;">2</td>
              <td style="padding: 8px;">R$ 50,00</td>
              <td style="padding: 8px;">R$ 100,00</td>
            </tr>
          </table>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 1cm;
            }
            h1 { 
              color: #2563eb; 
              text-align: center;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Criado em: ${new Date().toLocaleDateString('pt-BR')}</p>
          ${tableContent}
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
            Gerado por DocManager - Sistema de Gerenciamento de Documentos
          </p>
        </body>
        </html>
      `;

      const filename = `${uuidv4()}.ods`;
      const filePath = path.join(this.uploadsDir, filename);
      
      // Convert HTML to ODS using LibreOffice
      const odsBuffer = await libreConvert(Buffer.from(htmlContent), '.ods', undefined);
      
  // Wrap buffer in DataView to satisfy ArrayBufferLike expectations
  fs.writeFileSync(filePath, new DataView(odsBuffer.buffer, odsBuffer.byteOffset, odsBuffer.byteLength));
      const stats = fs.statSync(filePath);

      return {
        filename,
        filePath,
        size: stats.size
      };

    } catch (error) {
      console.error('LibreOffice Calc creation error:', error);
      throw new Error('Erro ao criar planilha Calc');
    }
  }

  /**
   * Create a Impress presentation (.odp)
   */
  async createImpressDocument(title: string = 'Nova Apresentação', slides?: string[]): Promise<{
    filename: string;
    filePath: string;
    size: number;
  }> {
    try {
      let slidesContent = '';
      
      if (slides && slides.length > 0) {
        slides.forEach((slide, index) => {
          slidesContent += `
            <div class="slide" style="page-break-after: always; margin-bottom: 50px;">
              <h2>Slide ${index + 1}</h2>
              <div class="slide-content">${slide.replace(/\n/g, '<br>')}</div>
            </div>
          `;
        });
      } else {
        slidesContent = `
          <div class="slide" style="page-break-after: always; margin-bottom: 50px;">
            <h2>Slide 1 - Título</h2>
            <div class="slide-content">
              <h3>Bem-vindo ao DocManager</h3>
              <p>Sistema completo de gerenciamento de documentos</p>
            </div>
          </div>
          
          <div class="slide" style="page-break-after: always; margin-bottom: 50px;">
            <h2>Slide 2 - Recursos</h2>
            <div class="slide-content">
              <ul>
                <li>Criação de documentos</li>
                <li>Gestão de arquivos</li>
                <li>Compartilhamento seguro</li>
                <li>Controle de acesso</li>
              </ul>
            </div>
          </div>
          
          <div class="slide">
            <h2>Slide 3 - Conclusão</h2>
            <div class="slide-content">
              <p>Obrigado por usar o DocManager!</p>
            </div>
          </div>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 2cm;
            }
            h1 { 
              color: #2563eb; 
              text-align: center;
              margin-bottom: 30px;
              font-size: 28px;
            }
            .slide {
              min-height: 400px;
              padding: 20px;
              border: 1px solid #e5e7eb;
              margin-bottom: 30px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            }
            .slide h2 {
              color: #1e40af;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .slide-content {
              font-size: 16px;
              line-height: 1.6;
            }
            ul {
              font-size: 18px;
            }
            li {
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p style="text-align: center; margin-bottom: 40px;">
            Criado em: ${new Date().toLocaleDateString('pt-BR')}
          </p>
          ${slidesContent}
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
            Gerado por DocManager - Sistema de Gerenciamento de Documentos
          </p>
        </body>
        </html>
      `;

      const filename = `${uuidv4()}.odp`;
      const filePath = path.join(this.uploadsDir, filename);
      
      // Convert HTML to ODP using LibreOffice
      const odpBuffer = await libreConvert(Buffer.from(htmlContent), '.odp', undefined);
      
  // Wrap buffer in DataView to satisfy ArrayBufferLike expectations
  fs.writeFileSync(filePath, new DataView(odpBuffer.buffer, odpBuffer.byteOffset, odpBuffer.byteLength));
      const stats = fs.statSync(filePath);

      return {
        filename,
        filePath,
        size: stats.size
      };

    } catch (error) {
      console.error('LibreOffice Impress creation error:', error);
      throw new Error('Erro ao criar apresentação Impress');
    }
  }

  /**
   * Convert document to different format
   */
  async convertDocument(inputPath: string, outputFormat: string): Promise<Buffer> {
    try {
      const inputBuffer = fs.readFileSync(inputPath);
      const outputBuffer = await libreConvert(inputBuffer, outputFormat, undefined);
      return outputBuffer;
    } catch (error) {
      console.error('Document conversion error:', error);
      throw new Error('Erro ao converter documento');
    }
  }
}

export default new LibreOfficeService();
