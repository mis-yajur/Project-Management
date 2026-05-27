import fs from 'fs';

const files = [
  'src/components/IssuesTab.tsx',
  'src/components/DependenciesTab.tsx',
  'src/components/UsersTab.tsx',
  'src/components/DepartmentsTab.tsx',
  'src/components/NotificationsTab.tsx',
  'src/components/MaterialPopoverMenu.tsx'
];

const replacements: [RegExp, string][] = [
  // backgrounds
  [/bg-slate-800\/20/g, 'bg-white'],
  [/bg-slate-800\/15/g, 'bg-slate-50/70'],
  [/bg-slate-800\/40/g, 'bg-slate-50 border-b border-slate-200/60'],
  [/bg-slate-800/g, 'bg-white'],
  [/bg-slate-900\/50/g, 'bg-slate-50'],
  [/bg-slate-900\/60/g, 'bg-slate-50'],
  [/bg-slate-900/g, 'bg-white'],
  [/bg-slate-950\/80/g, 'bg-slate-900/40'],
  
  // text colors
  [/text-slate-100/g, 'text-slate-800'],
  [/text-slate-200/g, 'text-slate-700'],
  [/text-slate-300/g, 'text-slate-600'],
  [/text-slate-400/g, 'text-slate-500'],
  
  // borders
  [/border-slate-700\/35/g, 'border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'],
  [/border-slate-700\/40/g, 'border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'],
  [/border-slate-700\/50/g, 'border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'],
  [/border-slate-700\/65/g, 'border-slate-200'],
  [/border-slate-700/g, 'border-slate-200'],
  [/border-slate-600/g, 'border-slate-300'],
  
  // Table headers
  [/hover:bg-slate-800\/15/g, 'hover:bg-slate-50/70'],
  
  // Inputs
  [/placeholder-slate-600/g, 'placeholder-slate-400'],
  
  // Custom tweaks for headers that got too dark
  [/font-medium text-slate-800 tracking-tight/g, 'font-semibold text-slate-800 tracking-tight'],
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(([regex, replacement]) => {
      content = content.replace(regex, replacement);
    });
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
