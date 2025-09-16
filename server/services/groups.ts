import path from 'path';
import fs from 'fs-extra';

const groupsFile = path.join(process.cwd(), 'data', 'groups.json');
fs.ensureDirSync(path.dirname(groupsFile));

export interface Group {
  id: string;
  name: string;
  members: string[]; // user ids
  createdAt: string;
}

class GroupsService {
  private load(): Group[] {
    try {
      if (fs.existsSync(groupsFile)) {
        return JSON.parse(fs.readFileSync(groupsFile, 'utf8')) as Group[];
      }
      return [];
    } catch (e) {
      console.error('Error loading groups:', e);
      return [];
    }
  }

  private save(groups: Group[]) {
    try {
      fs.writeFileSync(groupsFile, JSON.stringify(groups, null, 2));
    } catch (e) {
      console.error('Error saving groups:', e);
    }
  }

  getAll(): Group[] {
    return this.load();
  }

  create(name: string): Group {
    const groups = this.load();
    const g: Group = { id: 'group-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), name, members: [], createdAt: new Date().toISOString() };
    groups.push(g);
    this.save(groups);
    return g;
  }

  delete(groupId: string) {
    let groups = this.load();
    groups = groups.filter(g => g.id !== groupId);
    this.save(groups);
  }

  addMember(groupId: string, userId: string) {
    const groups = this.load();
    const g = groups.find(x => x.id === groupId);
    if (!g) throw new Error('Group not found');
    if (!g.members.includes(userId)) g.members.push(userId);
    this.save(groups);
  }

  removeMember(groupId: string, userId: string) {
    const groups = this.load();
    const g = groups.find(x => x.id === groupId);
    if (!g) throw new Error('Group not found');
    g.members = g.members.filter(m => m !== userId);
    this.save(groups);
  }
}

export default new GroupsService();
