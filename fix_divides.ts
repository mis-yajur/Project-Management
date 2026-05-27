import fs from "fs";

const files = [
  'src/components/IssuesTab.tsx',
  'src/components/DependenciesTab.tsx',
  'src/components/UsersTab.tsx',
  'src/components/DepartmentsTab.tsx',
  'src/components/NotificationsTab.tsx',
  'src/components/TasksTab.tsx',
  'src/components/ReportTab.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/divide-slate-700\/30/g, 'divide-slate-200/60');
    content = content.replace(/divide-slate-750/g, 'divide-slate-200/60');
    fs.writeFileSync(file, content);
  }
});
