import { Router } from 'express';
import GroupsService from '../services/groups';
import AuthService from '../services/auth';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/groups - list groups (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    // If admin, return all groups. Otherwise return only groups that include the requesting user.
    const all = GroupsService.getAll();
    if (req.user?.isAdmin) {
      return res.json({ success: true, groups: all });
    }
    const uid = req.user?.userId;
    const filtered = all.filter(g => Array.isArray(g.members) && g.members.includes(uid as string));
    return res.json({ success: true, groups: filtered });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erro ao listar grupos' });
  }
});

// POST /api/groups - create group (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    const g = GroupsService.create(name);
    res.status(201).json({ success: true, group: g });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erro ao criar grupo' });
  }
});

// DELETE /api/groups/:id (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    GroupsService.delete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erro ao excluir grupo' });
  }
});

// POST /api/groups/:id/members - add member (admin only)
router.post('/:id/members', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId é obrigatório' });
    GroupsService.addMember(req.params.id, userId);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Erro ao adicionar membro' });
  }
});

// DELETE /api/groups/:id/members/:userId - remove member (admin only)
router.delete('/:id/members/:userId', authenticateToken, requireAdmin, (req, res) => {
  try {
    GroupsService.removeMember(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Erro ao remover membro' });
  }
});

export default router;
