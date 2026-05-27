import fs from "fs";

const files = [
  'src/components/IssuesTab.tsx',
  'src/components/DependenciesTab.tsx',
  'src/components/UsersTab.tsx',
  'src/components/DepartmentsTab.tsx',
  'src/components/NotificationsTab.tsx',
  'src/components/ReportTab.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/bg-blue-600([^>]*)text-slate-800/g, 'bg-blue-600$1text-white');
    content = content.replace(/bg-blue-500([^>]*)text-slate-800/g, 'bg-blue-500$1text-white');
    fs.writeFileSync(file, content);
  }
});
