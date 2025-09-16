import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Allow smaller limit for logos but configurable
const logoMaxMb = Number(process.env.UPLOAD_LOGO_MAX_MB || 50);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
    filename: (req, file, cb) => cb(null, 'logo-temp' + path.extname(file.originalname)),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas arquivos de imagem são permitidos'));
  },
  limits: { fileSize: logoMaxMb * 1024 * 1024 },
});

router.post('/logo', authenticateToken, requireAdmin, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo de logo não enviado' });
    const publicDir = path.join(process.cwd(), 'public');
    await fs.ensureDir(publicDir);
    const dest = path.join(publicDir, 'logo.png');
    // Força salvar como logo.png
    await fs.move(req.file.path, dest, { overwrite: true });
    return res.json({ message: 'Logo atualizada com sucesso', path: '/logo.png' });
  } catch (err: any) {
    console.error('Logo upload error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao atualizar logo' });
  }
});

export default router;
