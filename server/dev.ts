import "dotenv/config";
import { createServer } from "./index";

const app = createServer();
// Evita dependência de tipos do Node em ambientes sem @types/node instalado
const envPort = Number((globalThis as any)?.process?.env?.PORT);
const port = Number.isFinite(envPort) && envPort > 0 ? envPort : 3001;

app.listen(port, () => {
  console.log(`🚀 Dev API rodando na porta ${port}`);
  console.log(`🔧 Endpoints: http://localhost:${port}/api`);
});
