import fs from "fs";

const files = [
  'src/App.tsx',
  'src/components/IssuesTab.tsx',
  'src/components/DependenciesTab.tsx',
  'src/components/UsersTab.tsx',
  'src/components/DepartmentsTab.tsx',
  'src/components/NotificationsTab.tsx',
  'src/components/TasksTab.tsx',
  'src/components/DashboardTab.tsx',
  'src/components/ReportTab.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-350/g, '-$1-400');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-450/g, '-$1-500');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-505/g, '-$1-500');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-650/g, '-$1-600');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-750/g, '-$1-700');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-755/g, '-$1-700');
    content = content.replace(/-(red|cyan|rose|amber|blue|slate)-850/g, '-$1-800');
    
    // Also, looking specifically at TasksTab:1549, it has bg-slate-800 still inside the dependency modal!
    if (file.includes('TasksTab.tsx')) {
       content = content.replace(/bg-slate-800/g, 'bg-white');
       content = content.replace(/border-slate-700/g, 'border-slate-200 shadow-xl');
    }
    
    fs.writeFileSync(file, content);
  }
});
